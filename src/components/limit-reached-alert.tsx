'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

import { ToastAction } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { getLocalePath } from '@/utils/get-locale-path';

export const LIMIT_REACHED_TEXT = 'Limit reached — upgrade to run this analysis';

interface LimitReachedAlertProps {
  locale: string;
  className?: string;
}

export function LimitReachedAlert({ locale, className = '' }: LimitReachedAlertProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-gray-800 ${className}`}
    >
      <div className='flex items-center gap-2'>
        <AlertCircle className='h-4 w-4 shrink-0 text-amber-600' />
        <span>{LIMIT_REACHED_TEXT}</span>
      </div>
      <Link href={getLocalePath(locale, '/pricing')}>
        <Button variant='outline' size='sm' className='h-7 shrink-0 border-amber-300 bg-white px-3 text-xs'>
          Upgrade
        </Button>
      </Link>
    </div>
  );
}

export function LimitReachedToastContent() {
  return (
    <div className='flex items-center gap-2'>
      <AlertCircle className='h-4 w-4 shrink-0 text-amber-600' />
      <span className='text-sm text-gray-800'>{LIMIT_REACHED_TEXT}</span>
    </div>
  );
}

export function limitReachedToast(router: { push: (href: string) => void }, locale: string) {
  return {
    variant: 'limit' as const,
    description: <LimitReachedToastContent />,
    action: (
      <ToastAction
        altText='Upgrade'
        className='h-7 border-amber-300 bg-white px-3 text-xs'
        onClick={() => router.push(getLocalePath(locale, '/pricing'))}
      >
        Upgrade
      </ToastAction>
    ),
  };
}
