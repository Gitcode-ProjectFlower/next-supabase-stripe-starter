import { stripeAdmin } from '@/libs/stripe/stripe-admin';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { PLAN_CONFIGS, UserPlan } from './plan-config';

export { PLAN_CONFIGS };
export type { UserPlan };

export async function getUserPlan(userId: string, checkStripeFallback = false): Promise<UserPlan> {
  try {
    const supabase = await createSupabaseServerClient();

    console.log('[getUserPlan] Fetching plan for user:', userId);

    // First, check for active or trialing subscriptions
    // Exclude subscriptions that are scheduled to cancel (cancel_at_period_end = true)
    // These should be treated as canceled even though status is still 'active'
    // We use .or() to include both null and false values (only exclude when explicitly true)
    let { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*, prices(*, products(*))')
      .eq('user_id', userId)
      .in('status', ['trialing', 'active'])
      .or('cancel_at_period_end.is.null,cancel_at_period_end.eq.false') // Exclude subscriptions scheduled to cancel
      .order('created', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[getUserPlan] DB Error fetching subscription:', {
        error: error.message,
        code: error.code,
        details: error.details,
        userId,
      });
      return 'free_tier';
    }

    if (!subscription) {
      // If fallback is enabled, check Stripe directly
      if (checkStripeFallback) {
        try {
          // Get customer ID from mapping table
          const { data: customerData } = await supabaseAdminClient
            .from('customers')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single();

          if (customerData?.stripe_customer_id) {
            // List subscriptions for this customer
            const subscriptions = await stripeAdmin.subscriptions.list({
              customer: customerData.stripe_customer_id,
              status: 'all',
              limit: 10,
            });

            // Find active or trialing subscription that is NOT scheduled to cancel
            const activeSubscription = subscriptions.data.find(
              (sub) => (sub.status === 'active' || sub.status === 'trialing') && !sub.cancel_at_period_end
            );

            if (activeSubscription) {
              const { upsertUserSubscription } = await import(
                '@/features/account/controllers/upsert-user-subscription'
              );
              await upsertUserSubscription({
                subscriptionId: activeSubscription.id,
                customerId: customerData.stripe_customer_id,
                isCreateAction: false,
              });

              // Retry fetching from database after sync
              const { data: retrySubscription } = await supabase
                .from('subscriptions')
                .select('*, prices(*, products(*))')
                .eq('user_id', userId)
                .in('status', ['trialing', 'active'])
                .order('created', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (retrySubscription) {
                subscription = retrySubscription;
              }
            }
          }
        } catch (stripeError) {
          console.error('[getUserPlan] Error checking Stripe fallback:', stripeError);
        }
      }

      // If still no subscription after fallback, check for canceled subscriptions (for logging)
      if (!subscription) {
        const { data: canceledSubs } = await supabase
          .from('subscriptions')
          .select('id, status')
          .eq('user_id', userId)
          .in('status', ['canceled', 'past_due', 'unpaid'])
          .limit(1);
        return 'free_tier';
      }
    }

    const price = subscription.prices;
    // Handle array or object for price
    const priceData = Array.isArray(price) ? price[0] : price;

    if (!priceData) {
      return 'free_tier';
    }

    const product = priceData?.products;
    if (!product) {
      return 'free_tier';
    }

    // Handle array or object for product
    const productData = Array.isArray(product) ? product[0] : product;

    if (!productData) {
      return 'free_tier';
    }

    const metadata = productData?.metadata;
    if (!metadata) {
      return 'free_tier';
    }

    const rawPlanName = metadata.plan_name;
    // Normalize plan name: convert to lowercase and replace spaces/hyphens with underscores
    const planName = rawPlanName
      ? rawPlanName
          .toString()
          .toLowerCase()
          .trim()
          .replace(/[\s-]+/g, '_')
      : null;

    // Validate plan name against known plans
    if (planName && ['free_tier', 'small', 'medium', 'large', 'promo_medium'].includes(planName)) {
      return planName as UserPlan;
    }

    return 'free_tier';
  } catch (error) {
    return 'free_tier';
  }
}

export function getPlanCap(plan: UserPlan): number {
  if (!plan || plan === 'anonymous') return 3;
  if (plan === 'free_tier') return 100;

  const capsByPlan = {
    free_tier: 100,
    small: 300,
    medium: 2000,
    large: 8000,
    promo_medium: 2000,
    anonymous: 3,
  };

  return capsByPlan[plan] || capsByPlan.anonymous;
}

export function getVisibleColumns(plan: UserPlan): string[] {
  const effectivePlan = plan || 'anonymous';
  return Array.from(PLAN_CONFIGS[effectivePlan]?.visibleColumns || PLAN_CONFIGS.anonymous.visibleColumns);
}

export function getAnonymousPlan(): UserPlan {
  return 'anonymous';
}

export function maskFields(items: any[], plan: UserPlan): any[] {
  const effectivePlan = plan || 'anonymous';
  const visibleColumns = getVisibleColumns(effectivePlan);

  return items.map((item) => {
    const masked: any = {};

    visibleColumns.forEach((col) => {
      if (item[col] !== undefined) {
        masked[col] = item[col];
      }
    });

    // Always include doc_id
    if (item.doc_id) {
      masked.doc_id = item.doc_id;
    }

    return masked;
  });
}
