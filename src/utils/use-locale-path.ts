'use client';

import { useParams } from 'next/navigation';
import { getLocalePath } from './get-locale-path';

/**
 * Hook that returns a function to create locale-aware paths
 * Use this during render (e.g., in JSX for Link href)
 * For event handlers, use getLocalePath directly with useParams
 * @returns Function that takes a path and returns locale-aware path
 */
export function useLocalePath() {
  const params = useParams();
  const locale = (params?.locale as string) || 'uk';

  return (path: string) => getLocalePath(locale, path);
}
