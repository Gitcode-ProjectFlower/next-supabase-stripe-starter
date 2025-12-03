import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

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

    const supabase = supabaseAdminClient;

    // Get userId from subscription metadata (set during checkout)
    const userId = subscription.metadata?.userId;

    if (!userId) {
        console.error('No userId in subscription metadata:', subscription.id);
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

    // Helper to safely convert Stripe timestamps
    const toISOString = (timestamp: number | null | undefined): string | null => {
        if (!timestamp || timestamp === 0) return null;
        try {
            return new Date(timestamp * 1000).toISOString();
        } catch {
            return null;
        }
    };

    // Insert subscription into database
    const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
            id: subscription.id,
            user_id: userId,
            status: subscription.status,
            metadata: subscription.metadata,
            price_id: priceId,
            quantity: subscription.items.data[0]?.quantity || 1,
            cancel_at_period_end: subscription.cancel_at_period_end,
            cancel_at: toISOString(subscription.cancel_at),
            canceled_at: toISOString(subscription.canceled_at),
            current_period_start: toISOString(subscription.current_period_start) || new Date().toISOString(),
            current_period_end: toISOString(subscription.current_period_end) || new Date().toISOString(),
            created: toISOString(subscription.created) || new Date().toISOString(),
            ended_at: toISOString(subscription.ended_at),
            trial_start: toISOString(subscription.trial_start),
            trial_end: toISOString(subscription.trial_end),
        });

    if (insertError) {
        console.error('Error inserting subscription:', insertError);
        return;
    }

    console.log(`Subscription created for user ${userId}, plan: ${planName}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    console.log('Processing subscription.updated:', subscription.id);

    const supabase = supabaseAdminClient;

    // Get userId from subscription metadata
    const userId = subscription.metadata?.userId;

    if (!userId) {
        console.error('No userId in subscription metadata:', subscription.id);
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

    // Helper to safely convert Stripe timestamps
    const toISOString = (timestamp: number | null | undefined): string | null => {
        if (!timestamp || timestamp === 0) return null;
        try {
            return new Date(timestamp * 1000).toISOString();
        } catch {
            return null;
        }
    };

    // Update subscription in database
    const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
            status: subscription.status,
            metadata: subscription.metadata,
            price_id: priceId,
            quantity: subscription.items.data[0]?.quantity || 1,
            cancel_at_period_end: subscription.cancel_at_period_end,
            cancel_at: toISOString(subscription.cancel_at),
            canceled_at: toISOString(subscription.canceled_at),
            current_period_start: toISOString(subscription.current_period_start) || new Date().toISOString(),
            current_period_end: toISOString(subscription.current_period_end) || new Date().toISOString(),
            ended_at: toISOString(subscription.ended_at),
            trial_start: toISOString(subscription.trial_start),
            trial_end: toISOString(subscription.trial_end),
        })
        .eq('id', subscription.id);

    if (updateError) {
        console.error('Error updating subscription:', updateError);
        return;
    }

    console.log(`Subscription updated for user ${userId}, new plan: ${planName}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    console.log('Processing subscription.deleted:', subscription.id);

    const supabase = supabaseAdminClient;

    // Get userId from subscription metadata
    const userId = subscription.metadata?.userId;

    if (!userId) {
        console.error('No userId in subscription metadata:', subscription.id);
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

    console.log(`Subscription deleted for user ${userId}`);
}
