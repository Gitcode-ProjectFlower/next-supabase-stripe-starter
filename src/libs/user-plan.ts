import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { PLAN_CONFIGS, UserPlan } from './plan-config';

export { PLAN_CONFIGS };
export type { UserPlan };

export async function getUserPlan(userId: string): Promise<UserPlan> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*, prices(*, products(*))')
      .eq('user_id', userId)
      .in('status', ['trialing', 'active'])
      .order('created', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[getUserPlan] DB Error:', error);
      return 'free_tier';
    }

    if (!subscription) {
      console.log('[getUserPlan] No subscription found');
      return 'free_tier';
    }

    // Safe access with logging
    const price = subscription.prices;
    if (!price) {
      console.log('[getUserPlan] No price found in subscription');
      return 'free_tier';
    }

    // Handle array or object for price
    const priceData = Array.isArray(price) ? price[0] : price;

    const product = priceData?.products;
    if (!product) {
      console.log('[getUserPlan] No product found in price');
      return 'free_tier';
    }

    // Handle array or object for product
    const productData = Array.isArray(product) ? product[0] : product;

    const metadata = productData?.metadata;
    if (!metadata) {
      console.log('[getUserPlan] No metadata found in product');
      return 'free_tier';
    }

    const planName = metadata.plan_name;
    console.log('[getUserPlan] Found plan name:', planName);

    // Validate plan name against known plans
    if (planName && ['free_tier', 'small', 'medium', 'large', 'promo_medium'].includes(planName)) {
      return planName as UserPlan;
    }

    console.log('[getUserPlan] Unknown or missing plan name, defaulting to free_tier');
    return 'free_tier';
  } catch (error) {
    console.error('[getUserPlan] CRITICAL ERROR:', error);
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
