/**
 * Utility function to create locale-aware paths
 * This is a pure function (not a hook) that can be used in event handlers
 * @param locale - Locale code (e.g., 'uk', 'de')
 * @param path - Path without locale (e.g., '/dashboard', '/selections')
 * @returns Path with locale (e.g., '/uk/dashboard', '/de/selections')
 */
export function getLocalePath(locale: string, path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${normalizedPath}`;
}
