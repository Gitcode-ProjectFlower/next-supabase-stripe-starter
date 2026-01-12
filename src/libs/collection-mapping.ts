import facetConfig from '@/../facet-config.json';

/**
 * Locale-specific configuration from facet-config.json
 */
interface LocaleConfig {
  database_collection: string;
  facets?: {
    [key: string]: any;
  };
}

/**
 * Facet config structure with locale support
 */
interface FacetConfigWithLocales {
  gateway?: {
    allowed_filter_keys?: string[];
    top_k_limits?: {
      small: number;
      medium: number;
      large: number;
    };
  };
  common?: {
    facets?: {
      [key: string]: any;
    };
  };
  [locale: string]: LocaleConfig | any;
}

const config = facetConfig as FacetConfigWithLocales;

/**
 * Get collection name from locale
 * @param locale - Locale code (e.g., 'uk', 'de')
 * @returns Collection name (e.g., 'collection_uk', 'collection_de')
 */
export function getCollectionFromLocale(locale: string): string {
  const localeConfig = config[locale] as LocaleConfig | undefined;

  if (localeConfig?.database_collection) {
    return localeConfig.database_collection;
  }

  // Default to UK collection if locale not found
  const defaultConfig = config['uk'] as LocaleConfig | undefined;
  return defaultConfig?.database_collection || 'collection_uk';
}

/**
 * Get all available locales from config
 * @returns Array of locale codes
 */
export function getAvailableLocales(): string[] {
  return Object.keys(config).filter((key) => key !== 'gateway' && key !== 'common' && key !== '$schema');
}

/**
 * Extract locale from URL path (App Router [locale] route)
 * @param pathname - URL pathname (e.g., '/uk/dashboard' or '/de/selections')
 * @returns Locale code (e.g., 'uk', 'de')
 */
export function getLocaleFromPath(pathname: string): string {
  const pathSegments = pathname.split('/').filter(Boolean);
  const locale = pathSegments[0];

  // Validate locale exists in config
  const availableLocales = getAvailableLocales();
  if (locale && availableLocales.includes(locale)) {
    return locale;
  }

  // Default to UK if no valid locale found
  return 'uk';
}

/**
 * Get default locale
 * @returns Default locale code ('uk')
 */
export function getDefaultLocale(): string {
  return 'uk';
}

/**
 * Get default collection
 * @returns Default collection name ('collection_uk')
 */
export function getDefaultCollection(): string {
  return getCollectionFromLocale(getDefaultLocale());
}
