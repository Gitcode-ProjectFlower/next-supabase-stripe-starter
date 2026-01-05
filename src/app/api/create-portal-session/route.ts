import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Stripe customer ID from subscription
    const { data: subscriptionData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created', { ascending: false })
      .limit(1)
      .maybeSingle();

    const subscription = subscriptionData as { id: string } | null;

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Get customer ID from Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.id);
    const customerId =
      typeof stripeSubscription.customer === 'string' ? stripeSubscription.customer : stripeSubscription.customer.id;

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings?tab=plan`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[create-portal-session] Error:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
