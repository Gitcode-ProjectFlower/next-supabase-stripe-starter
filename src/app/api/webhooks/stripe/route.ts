import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const headersList = await headers();
        const signature = headersList.get('stripe-signature');

        if (!signature) {
            return NextResponse.json(
                { error: 'Missing stripe-signature header' },
                { status: 400 }
            );
        }

        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err) {
            console.error('Webhook signature verification failed:', err);
            return NextResponse.json(
                { error: 'Webhook signature verification failed' },
                { status: 400 }
            );
        }

        switch (event.type) {
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
    console.log('Processing subscription.created:', subscription.id);

    const supabase = await createSupabaseServerClient();

    const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (!customer) {
        console.error('Customer not found for subscription:', subscription.id);
        return;
    }

    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) {
        console.error('No price found for subscription:', subscription.id);
        return;
    }

    const { data: price } = await supabase
        .from('prices')
        .select('products(metadata)')
        .eq('id', priceId)
        .single();

    const planName = (price as any)?.products?.metadata?.plan_name;

    // Insert subscription into database
    const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
            id: subscription.id,
            user_id: customer.id,
            status: subscription.status,
            metadata: subscription.metadata,
            price_id: priceId,
            quantity: subscription.items.data[0]?.quantity || 1,
            cancel_at_period_end: subscription.cancel_at_period_end,
            cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            created: new Date(subscription.created * 1000).toISOString(),
            ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        });

    if (insertError) {
        console.error('Error inserting subscription:', insertError);
        return;
    }

    console.log(`Subscription created for user ${customer.id}, plan: ${planName}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    console.log('Processing subscription.updated:', subscription.id);

    const supabase = await createSupabaseServerClient();

    const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (!customer) {
        console.error('Customer not found for subscription:', subscription.id);
        return;
    }

    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) {
        console.error('No price found for subscription:', subscription.id);
        return;
    }

    const { data: price } = await supabase
        .from('prices')
        .select('products(metadata)')
        .eq('id', priceId)
        .single();

    const planName = (price as any)?.products?.metadata?.plan_name;

    // Update subscription in database
    const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
            status: subscription.status,
            metadata: subscription.metadata,
            price_id: priceId,
            quantity: subscription.items.data[0]?.quantity || 1,
            cancel_at_period_end: subscription.cancel_at_period_end,
            cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        })
        .eq('id', subscription.id);

    if (updateError) {
        console.error('Error updating subscription:', updateError);
        return;
    }

    console.log(`Subscription updated for user ${customer.id}, new plan: ${planName}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    console.log('Processing subscription.deleted:', subscription.id);

    const supabase = await createSupabaseServerClient();

    const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (!customer) {
        console.error('Customer not found for subscription:', subscription.id);
        return;
    }

    // Update subscription status to canceled
    const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
            status: 'canceled',
            ended_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

    if (updateError) {
        console.error('Error updating subscription:', updateError);
        return;
    }

    console.log(`Subscription deleted for user ${customer.id}`);
}
