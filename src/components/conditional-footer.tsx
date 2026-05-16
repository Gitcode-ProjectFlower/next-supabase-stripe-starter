'use client';

import { usePathname } from 'next/navigation';

import { LargeFooter } from '@/components/large-footer';
import { MinimalFooter } from '@/components/minimal-footer';

const LARGE_FOOTER_SEGMENTS = new Set([
  'product',
  'about',
  'use-cases',
  'pricing',
  'help',
  'privacy',
  'terms',
  'data-security',
]);

export function ConditionalFooter() {
  const pathname = usePathname() || '/';
  // Path is /[locale]/[segment]/...
  const parts = pathname.split('/').filter(Boolean);
  const firstSegment = parts[1] ?? '';

  if (LARGE_FOOTER_SEGMENTS.has(firstSegment)) {
    return <LargeFooter />;
  }
  return <MinimalFooter />;
}
