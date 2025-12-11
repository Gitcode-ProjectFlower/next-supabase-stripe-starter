import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export type UserPlan = 'free_tier' | 'small' | 'medium' | 'large' | 'promo_medium' | null;

// Plan configuration with monthly limits
export const PLAN_CONFIGS = {
  free_tier: {
    maxDownloadsPer30Days: 100,
    maxAiCallsPer30Days: 5,
    visibleColumns: ['name', 'city', 'sectors', 'experience_years'],
  },
  small: {
    maxDownloadsPer30Days: 300,
    maxAiCallsPer30Days: 150,
    visibleColumns: ['name', 'city', 'street', 'sectors', 'experience_years'],
  },
  medium: {
    maxDownloadsPer30Days: 2000,
    maxAiCallsPer30Days: 1000,
    visibleColumns: ['name', 'email', 'phone', 'city', 'street', 'sectors', 'experience_years'],
  },
  large: {
    maxDownloadsPer30Days: 8000,
    maxAiCallsPer30Days: 5000,
    visibleColumns: ['name', 'email', 'phone', 'city', 'street', 'sectors', 'experience_years', 'similarity'],
  },
  promo_medium: {
    maxDownloadsPer30Days: 2000,
    maxAiCallsPer30Days: 1000,
    visibleColumns: ['name', 'email', 'phone', 'city', 'street', 'sectors', 'experience_years'],
  },
};

export async function getUserPlan(userId: string): Promise<UserPlan> {
  const supabase = await createSupabaseServerClient();

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('metadata, prices(products(metadata))')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error || !subscription) {
    return 'free_tier'; // Default to free tier instead of null
  }

  const productMetadata = (subscription.prices as any)?.products?.metadata;
  const planName = productMetadata?.plan_name as UserPlan;

  return planName || 'free_tier';
}

// Legacy function - kept for backward compatibility
// Use PLAN_CONFIGS[plan].maxDownloadsPer30Days instead
export function getPlanCap(plan: UserPlan): number {
  if (!plan || plan === 'free_tier') return 100;

  const capsByPlan = {
    free_tier: 100,
    small: 300,
    medium: 2000,
    large: 8000,
    promo_medium: 2000,
  };

  return capsByPlan[plan] || 100;
}

export function getVisibleColumns(plan: UserPlan): string[] {
  const effectivePlan = plan || 'free_tier';
  return PLAN_CONFIGS[effectivePlan]?.visibleColumns || PLAN_CONFIGS.free_tier.visibleColumns;
}

export function maskFields(
  items: any[],
  plan: UserPlan
): any[] {
  const visibleColumns = getVisibleColumns(plan);

  return items.map(item => {
    const masked: any = {};

    visibleColumns.forEach(col => {
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
