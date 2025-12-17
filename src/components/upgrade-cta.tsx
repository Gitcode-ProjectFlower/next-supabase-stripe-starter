'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface UpgradeCTAProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  url?: string;
  children?: React.ReactNode;
}

export function UpgradeCTA({
  variant = 'default',
  size = 'default',
  className = '',
  url = '/pricing',
  children,
}: UpgradeCTAProps) {
  return (
    <Link href={url}>
      <Button variant={variant} size={size} className={`bg-blue-600 text-white hover:bg-blue-700 ${className}`}>
        {children || (
          <>
            Upgrade Plan
            <ArrowRight className='ml-2 h-4 w-4' />
          </>
        )}
      </Button>
    </Link>
  );
}
