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

  // 3. Check for existing active subscription
  const supabase = await createSupabaseServerClient();

  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('id, status, price_id, prices(*, products(*))')
    .eq('user_id', session.user.id)
    .in('status', ['active', 'trialing'])
    .order('created', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Fetch price from database to determine type
  const { data: price } = await supabase
    .from('prices')
    .select('*')
    .eq('id', priceId)
    .single();

  if (!price) {
    throw new Error('Price not found');
  }

  // If user has active subscription, check if it's the same plan
  if (existingSubscription) {
    // If trying to subscribe to the same price, redirect to settings
    if (existingSubscription.price_id === priceId) {
      return redirect(`${getURL()}/settings?error=same-plan&tab=plan`);
    }

    // For plan changes (upgrade/downgrade), redirect to Customer Portal
    // User should use Stripe Customer Portal to manage plan changes
    return redirect(`${getURL()}/settings?error=use-portal&tab=plan`);
  }

  // Get product info for tracking
  let product = null;
  if (price.product_id) {
    const { data } = await supabase
      .from('products')
      .select('name')
      .eq('id', price.product_id)
      .single();
    product = data;
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
    subscription_data: price.type === 'recurring' ? {
      metadata: {
        userId: session.user.id,
      },
    } : undefined,
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
