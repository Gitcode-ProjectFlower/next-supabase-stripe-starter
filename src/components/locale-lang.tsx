'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function LocaleLang() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.lang = pathname?.startsWith('/de') ? 'de' : 'en';
  }, [pathname]);
  return null;
}
