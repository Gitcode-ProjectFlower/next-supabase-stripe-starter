'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { getLocalePath } from '@/utils/get-locale-path';

export function MinimalFooter() {
  const params = useParams();
  const locale = (params?.locale as string) || 'uk';

  return (
    <footer className='mt-10 border-t border-slate-50 bg-white'>
      <div className='mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8'>
        <div className='flex flex-wrap items-center gap-x-4 gap-y-1'>
          <Link href={getLocalePath(locale, '/privacy')} className='transition hover:text-slate-600'>
            Privacy
          </Link>
          <Link href={getLocalePath(locale, '/terms')} className='transition hover:text-slate-600'>
            Terms
          </Link>
          <Link href={getLocalePath(locale, '/data-security')} className='transition hover:text-slate-600'>
            Data &amp; Security
          </Link>
        </div>
        <p>© {new Date().getFullYear()} InsideFirms</p>
      </div>
    </footer>
  );
}
