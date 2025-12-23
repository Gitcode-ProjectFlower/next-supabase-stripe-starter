import { stripeAdmin } from '@/libs/stripe/stripe-admin';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function getSubscription(checkStripeFallback = false) {
  const supabase = await createSupabaseServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Exclude subscriptions that are scheduled to cancel (cancel_at_period_end = true)
  // These should be treated as canceled even though status is still 'active'
  // We use .or() to include both null and false values (only exclude when explicitly true)
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .eq('user_id', user.id)
    .in('status', ['trialing', 'active'])
    .or('cancel_at_period_end.is.null,cancel_at_period_end.eq.false') // Exclude subscriptions scheduled to cancel
    .order('created', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getSubscription] Error fetching subscription:', {
      error,
      userId: user.id,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }

  // If subscription not found in DB and fallback is enabled, check Stripe directly
  if (!data && checkStripeFallback) {
    console.log('[getSubscription] Subscription not found in DB, checking Stripe directly as fallback');
    try {
      // Get customer ID from mapping table
      const { data: customerData } = await supabaseAdminClient
        .from('customers')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (customerData?.stripe_customer_id) {
        // List subscriptions for this customer
        const subscriptions = await stripeAdmin.subscriptions.list({
          customer: customerData.stripe_customer_id,
          status: 'all',
          limit: 1,
        });

        // Find active or trialing subscription that is NOT scheduled to cancel
        const activeSubscription = subscriptions.data.find(
          (sub) => (sub.status === 'active' || sub.status === 'trialing') && !sub.cancel_at_period_end
        );

        if (activeSubscription) {
          console.log('[getSubscription] Found subscription in Stripe, syncing to database');
          // Use upsertUserSubscription to sync it to the database
          const { upsertUserSubscription } = await import('@/features/account/controllers/upsert-user-subscription');
          await upsertUserSubscription({
            subscriptionId: activeSubscription.id,
            customerId: customerData.stripe_customer_id,
            isCreateAction: false,
          });

          // Fetch again from database
          const { data: syncedData } = await supabase
            .from('subscriptions')
            .select('*, prices(*, products(*))')
            .eq('id', activeSubscription.id)
            .single();

          if (syncedData) {
            console.log('[getSubscription] Successfully synced subscription from Stripe');
            return syncedData;
          }
        }
      }
    } catch (stripeError) {
      console.error('[getSubscription] Error checking Stripe fallback:', stripeError);
    }
  }

  return data;
}
