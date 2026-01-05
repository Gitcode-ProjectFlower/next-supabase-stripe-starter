import { NextRequest, NextResponse } from 'next/server';

import { stripeAdmin } from '@/libs/stripe/stripe-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's active subscription
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

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Cancel the subscription immediately in Stripe
    try {
      const canceledSubscription = await stripeAdmin.subscriptions.cancel(subscription.id);
      console.log(`[Cancel Subscription] Canceled subscription ${subscription.id} for user ${user.id}`);

      // Helper to safely convert Stripe timestamps
      const toISOString = (timestamp: number | null | undefined): string | null => {
        if (!timestamp || timestamp === 0) return null;
        try {
          return new Date(timestamp * 1000).toISOString();
        } catch {
          return null;
        }
      };

      // Use UPSERT instead of UPDATE to ensure subscription is saved even if it doesn't exist
      // This handles edge cases where subscription might not be in DB yet
      const subscriptionData: any = {
        id: subscription.id,
        user_id: user.id,
        status: 'canceled',
        cancel_at_period_end: false, // Ensure it's marked as immediately canceled
        cancel_at: toISOString(canceledSubscription.cancel_at),
        canceled_at: toISOString(canceledSubscription.canceled_at) || new Date().toISOString(),
        ended_at: toISOString(canceledSubscription.ended_at) || new Date().toISOString(),
        metadata: canceledSubscription.metadata || {},
        price_id: canceledSubscription.items?.data?.[0]?.price?.id || subscription.price_id || null,
        quantity: canceledSubscription.items?.data?.[0]?.quantity || 1,
        current_period_start: toISOString(canceledSubscription.current_period_start) || new Date().toISOString(),
        current_period_end: toISOString(canceledSubscription.current_period_end) || new Date().toISOString(),
        created: toISOString(canceledSubscription.created) || new Date().toISOString(),
      };

      const { error: upsertError, data: upsertedData } = await supabase
        .from('subscriptions')
        // @ts-expect-error - Supabase browser client has TypeScript inference issue with upsert queries
        .upsert([subscriptionData], {
          onConflict: 'id',
        })
        .select();

      if (upsertError) {
        console.error('[Cancel Subscription] Error upserting subscription in database:', {
          error: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          subscriptionId: subscription.id,
        });
        // Still return success since Stripe cancellation succeeded
        // Webhook will eventually sync the database
      } else {
        console.log(`[Cancel Subscription] Upserted subscription ${subscription.id} status to 'canceled' in database`);

        // Verify the update was successful by checking the returned data
        if (upsertedData && upsertedData.length > 0) {
          console.log(`[Cancel Subscription] Verified subscription ${subscription.id} is now canceled in database`);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription canceled successfully',
        subscriptionId: subscription.id,
      });
    } catch (cancelError: any) {
      console.error('[Cancel Subscription] Error canceling subscription:', cancelError);
      return NextResponse.json({ error: cancelError?.message || 'Failed to cancel subscription' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Cancel Subscription] Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
