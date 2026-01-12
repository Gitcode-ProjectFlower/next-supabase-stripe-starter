'use client';

import { useParams } from 'next/navigation';

/**
 * Hook to get locale-aware path
 * @param path - Path without locale (e.g., '/dashboard', '/selections')
 * @returns Path with locale (e.g., '/uk/dashboard', '/de/selections')
 */
export function useLocalePath(path: string): string {
  const params = useParams();
  const locale = (params?.locale as string) || 'uk';
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${normalizedPath}`;
}
