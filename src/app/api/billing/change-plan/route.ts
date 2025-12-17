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

    // Fetch existing active/trialing subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, status, price_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If no active subscription, create checkout session for a new sub
    if (!subscription) {
      if (!user.email) {
        return NextResponse.json({ error: 'Email is required to start checkout' }, { status: 400 });
      }

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
        cancel_url: `${getURL()}/pricing?canceled=true`,
      });

      if (!checkoutSession?.url) {
        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
      }

      return NextResponse.json({ checkoutUrl: checkoutSession.url });
    }

    // If already subscribed, update the subscription to the new price
    const stripeSub = await stripeAdmin.subscriptions.retrieve(subscription.id, {
      expand: ['items.data.price'],
    });

    if (!stripeSub?.items?.data?.length) {
      return NextResponse.json({ error: 'No subscription items found' }, { status: 400 });
    }

    const currentItem = stripeSub.items.data[0];

    if (currentItem.price?.id === priceId) {
      return NextResponse.json({ success: true, message: 'Already on this plan' });
    }

    await stripeAdmin.subscriptions.update(subscription.id, {
      items: [
        {
          id: currentItem.id,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });

    // Optimistically update Supabase subscription price_id (webhooks will keep it in sync)
    await supabase.from('subscriptions').update({ price_id: priceId }).eq('id', subscription.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[change-plan] Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
