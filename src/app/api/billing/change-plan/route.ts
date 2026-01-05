import { NextRequest, NextResponse } from 'next/server';

import { getOrCreateCustomer } from '@/features/account/controllers/get-or-create-customer';
import { stripeAdmin } from '@/libs/stripe/stripe-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { getURL } from '@/utils/get-url';

export async function POST(request: NextRequest) {
  try {
    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.email) {
      return NextResponse.json({ error: 'Email is required to start checkout' }, { status: 400 });
    }

    // Fetch existing active/trialing subscription (excluding canceled ones)
    const { data: subscriptionData } = await supabase
      .from('subscriptions')
      .select('id, status, price_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .or('cancel_at_period_end.is.null,cancel_at_period_end.eq.false') // Exclude subscriptions scheduled to cancel
      .order('created', { ascending: false })
      .limit(1)
      .maybeSingle();

    const subscription = subscriptionData as { id: string; status: string; price_id: string | null } | null;

    // If user has active subscription and trying to subscribe to the same plan
    if (subscription && subscription.price_id === priceId) {
      return NextResponse.json({ error: 'You are already subscribed to this plan' }, { status: 400 });
    }

    // If user has an existing subscription and selects a different plan,
    // cancel the old subscription immediately before creating new checkout
    if (subscription) {
      try {
        // Cancel the existing subscription immediately (not at period end)
        await stripeAdmin.subscriptions.cancel(subscription.id);
        console.log(`[Change Plan] Canceled existing subscription ${subscription.id} before creating new checkout`);

        // Update database immediately (webhook will also update, but this ensures immediate consistency)
        await supabase
          .from('subscriptions')
          // @ts-expect-error - Supabase browser client has TypeScript inference issue with update queries
          .update({
            status: 'canceled',
            ended_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        console.log(`[Change Plan] Updated subscription ${subscription.id} status to 'canceled' in database`);
      } catch (cancelError) {
        console.error('[Change Plan] Error canceling existing subscription:', cancelError);
        // Continue anyway - the new subscription will be created
      }
    }

    // Always create a checkout session (for both new subscriptions and plan changes)
    const customer = await getOrCreateCustomer({
      userId: user.id,
      email: user.email,
    });

    const checkoutSession = await stripeAdmin.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      customer,
      customer_update: {
        address: 'auto',
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
      success_url: `${getURL()}/settings?success=true&tab=plan`,
      cancel_url: `${getURL()}/settings?canceled=true&tab=plan`,
    });

    if (!checkoutSession?.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (error: any) {
    console.error('[change-plan] Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
