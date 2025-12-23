import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { sendSubscriptionConfirmation } from '@/libs/resend/email-helpers';
import { stripeAdmin } from '@/libs/stripe/stripe-admin';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripeAdmin.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }
    console.log('event12234', event);
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

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
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(checkoutSession: Stripe.Checkout.Session) {
  console.log('[Webhook] Processing checkout.session.completed:', checkoutSession.id);

  // Only handle subscription checkouts
  if (checkoutSession.mode !== 'subscription' || !checkoutSession.subscription) {
    console.log('[Webhook] Checkout session is not a subscription, skipping');
    return;
  }

  const subscriptionId =
    typeof checkoutSession.subscription === 'string' ? checkoutSession.subscription : checkoutSession.subscription.id;

  console.log('[Webhook] Retrieving subscription from Stripe:', subscriptionId);

  try {
    // Retrieve the subscription from Stripe with all necessary data
    const subscription = await stripeAdmin.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product', 'customer'],
    });

    console.log('[Webhook] Retrieved subscription:', {
      id: subscription.id,
      status: subscription.status,
      userId: subscription.metadata?.userId,
      customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    });

    // Ensure userId is in metadata (it should be set during checkout, but double-check)
    if (!subscription.metadata?.userId && checkoutSession.metadata?.userId) {
      // If userId is in checkout session metadata but not subscription metadata, update subscription
      await stripeAdmin.subscriptions.update(subscriptionId, {
        metadata: {
          ...subscription.metadata,
          userId: checkoutSession.metadata.userId,
        },
      });
      // Re-retrieve to get updated metadata
      const updatedSubscription = await stripeAdmin.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price.product', 'customer'],
      });
      await handleSubscriptionCreated(updatedSubscription);
    } else {
      // Use the same handler as subscription.created
      await handleSubscriptionCreated(subscription);
    }
  } catch (error) {
    console.error('[Webhook] Error processing checkout session completed:', error);
    throw error; // Re-throw to ensure webhook retries
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('[Webhook] Processing subscription.created:', subscription.id);

  const supabase = supabaseAdminClient;

  // Get userId from subscription metadata (set during checkout)
  let userId = subscription.metadata?.userId;

  // Fallback: If userId is not in metadata, try to get it from customer mapping
  if (!userId) {
    console.log('[Webhook] userId not in subscription metadata, trying to get from customer mapping');
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

    const { data: customerData } = await supabase
      .from('customers')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (customerData?.id) {
      userId = customerData.id;
      console.log('[Webhook] Found userId from customer mapping:', userId);

      // Update subscription metadata with userId for future reference
      try {
        await stripeAdmin.subscriptions.update(subscription.id, {
          metadata: {
            ...subscription.metadata,
            userId,
          },
        });
      } catch (updateError) {
        console.error('[Webhook] Error updating subscription metadata with userId:', updateError);
      }
    }
  }

  if (!userId) {
    console.error('[Webhook] No userId found in subscription metadata or customer mapping:', {
      subscriptionId: subscription.id,
      customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    });
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    console.error('[Webhook] No price found for subscription:', subscription.id);
    return;
  }

  const { data: price } = await supabase.from('prices').select('products(metadata)').eq('id', priceId).single();

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

  // IMPORTANT: Cancel all other active subscriptions for this user
  // This ensures only one active subscription exists at a time
  // Query for existing subscriptions (including ones that might be in the database but not yet canceled)
  const { data: existingSubscriptions, error: queryError } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .or('cancel_at_period_end.is.null,cancel_at_period_end.eq.false') // Exclude already canceled
    .neq('id', subscription.id); // Exclude the new subscription we're about to create

  if (queryError) {
    console.error('[Webhook] Error querying existing subscriptions:', queryError);
    // Continue anyway - we'll still upsert the new subscription
  }

  if (existingSubscriptions && existingSubscriptions.length > 0) {
    console.log(
      `[Webhook] Found ${existingSubscriptions.length} existing active subscription(s) for user ${userId}. Canceling them...`
    );

    for (const oldSub of existingSubscriptions) {
      try {
        // Cancel in Stripe
        await stripeAdmin.subscriptions.cancel(oldSub.id);
        console.log(`[Webhook] Canceled old subscription ${oldSub.id} in Stripe`);

        // Update in database
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
            ended_at: new Date().toISOString(),
          })
          .eq('id', oldSub.id);

        if (updateError) {
          console.error(`[Webhook] Error updating old subscription ${oldSub.id} in database:`, updateError);
        } else {
          console.log(`[Webhook] Updated old subscription ${oldSub.id} status to 'canceled' in database`);
        }
      } catch (cancelError) {
        console.error(`[Webhook] Error canceling old subscription ${oldSub.id}:`, cancelError);
        // Continue - mark as canceled in DB anyway
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
            ended_at: new Date().toISOString(),
          })
          .eq('id', oldSub.id);

        if (updateError) {
          console.error(`[Webhook] Error updating old subscription ${oldSub.id} in database (fallback):`, updateError);
        }
      }
    }
  } else {
    console.log(
      `[Webhook] No existing active subscriptions found for user ${userId}. Proceeding with new subscription.`
    );
  }

  // Upsert the new subscription into database (use upsert to handle cases where subscription might already exist)
  const subscriptionData = {
    id: subscription.id,
    user_id: userId,
    status: subscription.status,
    metadata: subscription.metadata || {},
    price_id: priceId,
    quantity: subscription.items.data[0]?.quantity || 1,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    cancel_at: toISOString(subscription.cancel_at),
    canceled_at: toISOString(subscription.canceled_at),
    current_period_start: toISOString(subscription.current_period_start) || new Date().toISOString(),
    current_period_end: toISOString(subscription.current_period_end) || new Date().toISOString(),
    created: toISOString(subscription.created) || new Date().toISOString(),
    ended_at: toISOString(subscription.ended_at),
    trial_start: toISOString(subscription.trial_start),
    trial_end: toISOString(subscription.trial_end),
  };

  console.log('[Webhook] Attempting to upsert subscription:', {
    subscriptionId: subscription.id,
    userId,
    priceId,
    status: subscription.status,
  });

  const { error: upsertError, data: upsertedData } = await supabase
    .from('subscriptions')
    .upsert([subscriptionData], {
      onConflict: 'id',
    })
    .select();

  if (upsertError) {
    console.error('[Webhook] Error upserting subscription:', {
      error: upsertError.message,
      code: upsertError.code,
      details: upsertError.details,
      hint: upsertError.hint,
      subscriptionId: subscription.id,
      userId,
      subscriptionData,
    });
    // Don't return - try to continue anyway, but log the error
  } else {
    console.log(
      `[Webhook] Subscription upserted successfully for user ${userId}, plan: ${planName}, subscription: ${subscription.id}`,
      {
        upserted: upsertedData?.length || 0,
        subscriptionId: subscription.id,
      }
    );
  }

  // Get user email for sending confirmation
  const { data: user } = await supabase.from('users').select('full_name').eq('id', userId).single();

  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const customer = (await stripeAdmin.customers.retrieve(customerId)) as Stripe.Customer;

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
  console.log('[Webhook] Processing subscription.updated:', {
    subscriptionId: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  const supabase = supabaseAdminClient;

  // Get userId from subscription metadata
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('[Webhook] No userId in subscription metadata:', subscription.id);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    console.error('[Webhook] No price found for subscription:', subscription.id);
    return;
  }

  const { data: price } = await supabase.from('prices').select('products(metadata)').eq('id', priceId).single();

  // Get user details for email
  const { data: user } = await supabase.from('users').select('full_name').eq('id', userId).single();

  const planName = (price as any)?.products?.metadata?.plan_name;

  console.log('[Webhook] Subscription update details:', {
    userId,
    subscriptionId: subscription.id,
    status: subscription.status,
    priceId,
    planName,
  });

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
  // If subscription is canceled, ensure all cancellation fields are set
  const updateData: any = {
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
  };

  // If subscription is canceled, ensure cancel_at_period_end is false and set ended_at
  if (subscription.status === 'canceled') {
    updateData.cancel_at_period_end = false;
    if (!updateData.ended_at) {
      updateData.ended_at = new Date().toISOString();
    }
    if (!updateData.canceled_at) {
      updateData.canceled_at = new Date().toISOString();
    }
  }

  const { error: updateError } = await supabase.from('subscriptions').update(updateData).eq('id', subscription.id);

  if (updateError) {
    console.error('[Webhook] Error updating subscription:', {
      error: updateError.message,
      code: updateError.code,
      subscriptionId: subscription.id,
      userId,
    });
    return;
  }

  console.log('[Webhook] Subscription updated successfully:', {
    userId,
    subscriptionId: subscription.id,
    status: subscription.status,
    planName,
  });

  // Send plan change email if price changed
  const oldPriceId = subscription.items.data[0]?.price.id; // Note: This logic is tricky because we don't have old subscription object here.
  // Better approach: Check if it's a cancellation or just update

  // If subscription is canceled (either immediately or scheduled)
  if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
    if (subscription.status === 'canceled') {
      console.log(
        `[Webhook] Subscription immediately canceled: User ${userId}, subscription ${subscription.id}. User will fall back to free_tier immediately.`
      );
    } else {
      console.log(
        `[Webhook] Subscription canceled (scheduled to end): User ${userId}, subscription ${
          subscription.id
        }, ends at ${toISOString(subscription.current_period_end)}. User will fall back to free_tier immediately.`
      );
    }

    // Fetch customer email
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const customer = (await stripeAdmin.customers.retrieve(customerId)) as Stripe.Customer;

    if (customer.email) {
      const { sendSubscriptionCancellationEmail } = await import('@/libs/resend/email-helpers');
      await sendSubscriptionCancellationEmail({
        userEmail: customer.email,
        userName: user?.full_name || undefined,
        endDate:
          subscription.status === 'canceled'
            ? toISOString(subscription.ended_at) || new Date().toISOString()
            : toISOString(subscription.current_period_end) || new Date().toISOString(),
      });
    }
  } else {
    // Assume it's a plan change or renewal
    // In a real app, we'd compare with previous state or check event.data.previous_attributes
    // For now, let's send plan change email if status is active

    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const customer = (await stripeAdmin.customers.retrieve(customerId)) as Stripe.Customer;

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
  console.log('[Webhook] Processing subscription.deleted:', subscription.id);

  const supabase = supabaseAdminClient;

  // Get userId from subscription metadata
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('[Webhook] No userId in subscription metadata:', subscription.id);
    return;
  }

  console.log('[Webhook] Subscription deleted for user:', userId, 'subscription:', subscription.id);

  // Helper to safely convert Stripe timestamps
  const toISOString = (timestamp: number | null | undefined): string | null => {
    if (!timestamp || timestamp === 0) return null;
    try {
      return new Date(timestamp * 1000).toISOString();
    } catch {
      return null;
    }
  };

  // Get user details for email - fetch this ONCE
  const { data: user } = await supabase.from('users').select('full_name').eq('id', userId).single();

  // Get price_id from subscription before it's deleted (if available)
  const priceId = subscription.items?.data?.[0]?.price?.id || null;

  // Use UPSERT instead of UPDATE in case subscription doesn't exist in DB yet
  // This ensures the subscription is always saved, even if it was never properly synced
  const subscriptionData: any = {
    id: subscription.id,
    user_id: userId,
    status: 'canceled',
    cancel_at_period_end: false, // Ensure it's marked as immediately canceled
    cancel_at: toISOString(subscription.cancel_at),
    canceled_at: toISOString(subscription.canceled_at) || new Date().toISOString(),
    ended_at: toISOString(subscription.ended_at) || new Date().toISOString(),
    metadata: subscription.metadata || {},
  };

  // Only include price_id if we have it
  if (priceId) {
    subscriptionData.price_id = priceId;
  }

  const { error: upsertError } = await supabase.from('subscriptions').upsert([subscriptionData], {
    onConflict: 'id',
  });

  if (upsertError) {
    console.error('[Webhook] Error upserting canceled subscription:', {
      error: upsertError.message,
      code: upsertError.code,
      subscriptionId: subscription.id,
      userId,
    });
    return;
  }

  console.log(
    `[Webhook] Subscription status updated to 'canceled' for user ${userId}. User will now fall back to free_tier plan.`
  );

  // Send cancellation email (immediate cancellation)
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const customer = (await stripeAdmin.customers.retrieve(customerId)) as Stripe.Customer;

  if (customer.email) {
    const { sendSubscriptionCancellationEmail } = await import('@/libs/resend/email-helpers');
    await sendSubscriptionCancellationEmail({
      userEmail: customer.email,
      userName: user?.full_name || undefined,
      endDate: toISOString(subscription.ended_at) || new Date().toISOString(),
    });
  }
}
