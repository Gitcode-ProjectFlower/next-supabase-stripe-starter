export type UserPlan = 'free_tier' | 'small' | 'medium' | 'large' | 'promo_medium' | 'anonymous' | null;

// Plan configuration with monthly limits
export const PLAN_CONFIGS = {
  anonymous: {
    maxDownloadsPer30Days: 3, // Anonymous users get 3 results max
    maxAiCallsPer30Days: 0, // No AI calls for anonymous users
    topKLimit: 3,
    visibleColumns: ['name', 'city', 'sectors', 'experience_years'],
  },
  free_tier: {
    maxDownloadsPer30Days: 100,
    maxAiCallsPer30Days: 5,
    topKLimit: 20,
    visibleColumns: ['name', 'city', 'sectors', 'experience_years'],
  },
  small: {
    maxDownloadsPer30Days: 300,
    maxAiCallsPer30Days: 150,
    topKLimit: 100,
    visibleColumns: ['name', 'city', 'street', 'sectors', 'experience_years'],
  },
  medium: {
    maxDownloadsPer30Days: 2000,
    maxAiCallsPer30Days: 1000,
    topKLimit: 500,
    visibleColumns: ['name', 'email', 'phone', 'city', 'street', 'sectors', 'experience_years'],
  },
  large: {
    maxDownloadsPer30Days: 8000,
    maxAiCallsPer30Days: 5000,
    topKLimit: 5000,
    visibleColumns: ['name', 'email', 'phone', 'city', 'street', 'sectors', 'experience_years', 'similarity'],
  },
  promo_medium: {
    maxDownloadsPer30Days: 2000,
    maxAiCallsPer30Days: 1000,
    topKLimit: 500,
    visibleColumns: ['name', 'email', 'phone', 'city', 'street', 'sectors', 'experience_years'],
  },
} as const;

/**
 * Get Top-K limit for a plan (client-safe version)
 */
export function getTopKLimit(plan: UserPlan): number {
  const effectivePlan = plan || 'anonymous';
  return PLAN_CONFIGS[effectivePlan]?.topKLimit || 3;
}

/**
 * Get the ordered list of columns that should be visible for the given plan.
 * All 17 required fields are always displayed (even if empty).
 * Plan-based masking may hide values but not columns.
 */
export function getVisibleColumns(plan: UserPlan): readonly string[] {
  // All 17 required fields (always displayed, in order)
  const requiredColumns = [
    'name',
    'domain',
    'company_size',
    'email',
    'phone',
    'street',
    'city',
    'postal_code',
    'sector_level1',
    'sector_level2',
    'sector_level3',
    'region_level1',
    'region_level2',
    'region_level3',
    'region_level4',
    'linkedin_company_url',
    'legal_form',
    'similarity', // Optional but commonly shown
  ] as const;

  return requiredColumns;
}
