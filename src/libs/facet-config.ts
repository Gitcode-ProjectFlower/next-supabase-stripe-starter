import facetConfig from '@/../facet-config.json';

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

export function getTopKLimit(plan: 'small' | 'medium' | 'large'): number {
  return facetConfig.gateway.top_k_limits[plan];
}

export function validateFilterKeys(filters: Record<string, any>): boolean {
  const allowedKeys = getAllowedFilterKeys();
  const filterKeys = Object.keys(filters);
  
  return filterKeys.every(key => allowedKeys.includes(key));
}
