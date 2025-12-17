export type UserPlan = 'free_tier' | 'small' | 'medium' | 'large' | 'promo_medium' | 'anonymous' | null;

// Plan configuration with monthly limits
export const PLAN_CONFIGS = {
  anonymous: {
    maxDownloadsPer30Days: 3, // Anonymous users get 3 results max
    maxAiCallsPer30Days: 0, // No AI calls for anonymous users
    visibleColumns: ['name', 'city', 'sectors', 'experience_years'],
  },
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
} as const;

/**
 * Get Top-K limit for a plan (client-safe version)
 */
export function getTopKLimit(plan: UserPlan): number {
  const effectivePlan = plan || 'anonymous';
  return PLAN_CONFIGS[effectivePlan]?.maxDownloadsPer30Days || 3;
}

/**
 * Get the ordered list of columns that should be visible for the given plan.
 * Falls back to the anonymous plan shape so we never render an empty table.
 */
export function getVisibleColumns(plan: UserPlan): readonly string[] {
  const effectivePlan = plan || 'anonymous';
  return PLAN_CONFIGS[effectivePlan]?.visibleColumns || PLAN_CONFIGS.anonymous.visibleColumns;
}
