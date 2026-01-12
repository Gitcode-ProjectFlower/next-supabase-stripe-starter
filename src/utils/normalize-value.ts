/**
 * Normalize value to string, converting null/undefined to empty string
 * This ensures consistent empty string representation throughout the application
 * @param value - Any value that might be null, undefined, or a string
 * @returns Empty string if value is null/undefined, otherwise the value as string
 */
export function normalizeValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * Normalize an object's fields to ensure all required fields are present as strings
 * @param obj - Object to normalize
 * @param requiredFields - Array of required field names
 * @returns Object with all required fields normalized to strings
 */
export function normalizeObjectFields<T extends Record<string, any>>(obj: T, requiredFields: (keyof T)[]): T {
  const normalized = { ...obj };
  for (const field of requiredFields) {
    normalized[field] = normalizeValue(normalized[field]) as T[keyof T];
  }
  return normalized;
}
