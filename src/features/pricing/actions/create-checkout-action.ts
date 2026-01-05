'use server';

import { redirect } from 'next/navigation';

import { getOrCreateCustomer } from '@/features/account/controllers/get-or-create-customer';
import { getSession } from '@/features/account/controllers/get-session';
import { trackServerEvent } from '@/libs/analytics/posthog-server';
import { stripeAdmin } from '@/libs/stripe/stripe-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { getURL } from '@/utils/get-url';

export async function createCheckoutAction(formData: FormData) {
  const priceId = formData.get('priceId') as string;

  if (!priceId) {
    throw new Error('Price ID is required');
  }

  // 1. Get the user from session
  const session = await getSession();

  if (!session?.user) {
    return redirect(`${getURL()}/signup`);
  }

  if (!session.user.email) {
    throw Error('Could not get email');
  }

  // 2. Retrieve or create the customer in Stripe
  const customer = await getOrCreateCustomer({
    userId: session.user.id,
    email: session.user.email,
  });

  // 3. Fetch price from database to determine type
  const supabase = await createSupabaseServerClient();
  const { data: priceData } = await supabase.from('prices').select('*').eq('id', priceId).single();

  const price = priceData as {
    id: string;
    product_id: string | null;
    type: string;
    unit_amount: number | null;
    interval: string | null;
  } | null;

  if (!price) {
    throw new Error('Price not found');
  }

  // 4. Check for existing active subscription (excluding canceled ones)
  const { data: existingSubscriptionData } = await supabase
    .from('subscriptions')
    .select('id, status, price_id, prices(*, products(*))')
    .eq('user_id', session.user.id)
    .in('status', ['active', 'trialing'])
    .or('cancel_at_period_end.is.null,cancel_at_period_end.eq.false') // Exclude subscriptions scheduled to cancel
    .order('created', { ascending: false })
    .limit(1)
    .maybeSingle();

  const existingSubscription = existingSubscriptionData as {
    id: string;
    status: string;
    price_id: string | null;
  } | null;

  // If user has active subscription and trying to subscribe to the same plan
  if (existingSubscription && existingSubscription.price_id === priceId) {
    return redirect(`${getURL()}/settings?error=same-plan&tab=plan`);
  }

  // If user has an existing subscription and selects a different plan,
  // cancel the old subscription immediately before creating new checkout
  if (existingSubscription) {
    try {
      // Cancel the existing subscription immediately (not at period end)
      await stripeAdmin.subscriptions.cancel(existingSubscription.id);
      console.log(`[Checkout] Canceled existing subscription ${existingSubscription.id} before creating new checkout`);

      // Update database immediately (webhook will also update, but this ensures immediate consistency)
      await supabase
        .from('subscriptions')
        // @ts-expect-error - Supabase browser client has TypeScript inference issue with update queries
        .update({
          status: 'canceled',
          ended_at: new Date().toISOString(),
        })
        .eq('id', existingSubscription.id);

      console.log(`[Checkout] Updated subscription ${existingSubscription.id} status to 'canceled' in database`);
    } catch (cancelError) {
      console.error('[Checkout] Error canceling existing subscription:', cancelError);
      // Continue anyway - the new subscription will be created
    }
  }

  // Get product info for tracking
  let product: { name: string } | null = null;
  if (price.product_id) {
    const { data: productData } = await supabase.from('products').select('name').eq('id', price.product_id).single();
    product = productData as { name: string } | null;
  }

  // 5. Create a checkout session in Stripe
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
    mode: price.type === 'recurring' ? 'subscription' : 'payment',
    allow_promotion_codes: true,
    subscription_data:
      price.type === 'recurring'
        ? {
            metadata: {
              userId: session.user.id,
            },
          }
        : undefined,
    success_url: `${getURL()}/settings?success=true&tab=plan`,
    cancel_url: `${getURL()}/pricing?canceled=true`,
  });

  if (!checkoutSession || !checkoutSession.url) {
    throw Error('checkoutSession is not defined');
  }

  // Track checkout started event
  trackServerEvent.checkoutStarted({
    userId: session.user.id,
    planName: product?.name || 'Unknown',
    price: price.unit_amount ? price.unit_amount / 100 : 0,
    interval: price.interval || 'month',
  });

  // 6. Redirect to checkout url
  redirect(checkoutSession.url);
}
