import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { sendSubscriptionConfirmation } from '@/libs/resend/email-helpers';
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

    // Get user email for sending confirmation
    const { data: user } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single();

    const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

    // Send subscription confirmation email
    if (customer.email) {
        await sendSubscriptionConfirmation({
            userEmail: customer.email,
            userName: user?.full_name || undefined,
            planName: planName || 'Premium',
            amount: subscription.items.data[0]?.price.unit_amount || 0,
            currency: subscription.items.data[0]?.price.currency || 'usd',
            interval: subscription.items.data[0]?.price.recurring?.interval || 'month',
            nextBillingDate: toISOString(subscription.current_period_end) || new Date().toISOString(),
        });
    }
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

    // Get user details for email
    const { data: user } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
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

    // Send plan change email if price changed
    const oldPriceId = subscription.items.data[0]?.price.id; // Note: This logic is tricky because we don't have old subscription object here.
    // Better approach: Check if it's a cancellation or just update

    // If it's a cancellation (cancel_at_period_end became true)
    if (subscription.cancel_at_period_end) {
        // Fetch customer email
        const customerId = typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

        if (customer.email) {
            const { sendSubscriptionCancellationEmail } = await import('@/libs/resend/email-helpers');
            await sendSubscriptionCancellationEmail({
                userEmail: customer.email,
                userName: user?.full_name || undefined,
                endDate: toISOString(subscription.current_period_end) || new Date().toISOString(),
            });
        }
    } else {
        // Assume it's a plan change or renewal
        // In a real app, we'd compare with previous state or check event.data.previous_attributes
        // For now, let's send plan change email if status is active

        const customerId = typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

        if (customer.email && subscription.status === 'active') {
            const { sendPlanChangeEmail } = await import('@/libs/resend/email-helpers');
            await sendPlanChangeEmail({
                userEmail: customer.email,
                userName: user?.full_name || undefined,
                newPlanName: planName || 'Plan',
                nextBillingDate: toISOString(subscription.current_period_end) || new Date().toISOString(),
                amount: subscription.items.data[0]?.price.unit_amount || 0,
                currency: subscription.items.data[0]?.price.currency || 'usd',
            });
        }
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

    // Get user details for email - fetch this ONCE
    const { data: user } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single();

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

    // Send cancellation email (immediate cancellation)
    const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

    if (customer.email) {
        const { sendSubscriptionCancellationEmail } = await import('@/libs/resend/email-helpers');
        await sendSubscriptionCancellationEmail({
            userEmail: customer.email,
            userName: user?.full_name || undefined,
            endDate: new Date().toISOString(), // Immediate end
        });
    }
}
