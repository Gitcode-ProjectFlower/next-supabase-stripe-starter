import facetConfig from '@/../facet-config.json';
import { PLAN_CONFIGS, UserPlan } from './user-plan';

export interface FacetConfig {
  gateway: {
    allowed_filter_keys: string[];
    top_k_limits: {
      small: number;
      medium: number;
      large: number;
    };
  };
  common: {
    facets: {
      [key: string]: any;
    };
  };
}

export function getFacetConfig(): FacetConfig {
  return facetConfig as FacetConfig;
}

export function getAllowedFilterKeys(): string[] {
  return facetConfig.gateway.allowed_filter_keys;
}

/**
 * Get Top-K limit for a plan
 * Now derived from PLAN_CONFIGS.maxDownloadsPer30Days instead of hardcoded values
 */
export function getTopKLimit(plan: UserPlan): number {
  const effectivePlan = plan || 'free_tier';
  return PLAN_CONFIGS[effectivePlan]?.maxDownloadsPer30Days || 100;
}

export function validateFilterKeys(filters: Record<string, any>): boolean {
  const allowedKeys = getAllowedFilterKeys();
  const filterKeys = Object.keys(filters);

  return filterKeys.every(key => allowedKeys.includes(key));
}
