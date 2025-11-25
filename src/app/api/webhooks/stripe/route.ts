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

    console.log(`Subscription deleted for user ${customer.id}`);
}
