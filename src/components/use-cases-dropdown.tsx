'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useLocalePath } from '@/utils/use-locale-path';

const ITEMS = [
  { label: 'Prioritize accounts', anchor: 'prioritize' },
  { label: 'Find best-fit companies', anchor: 'best-fit' },
  { label: 'Segment your market', anchor: 'segmentation' },
  { label: 'Understand accounts', anchor: 'understand' },
  { label: 'Find similar companies', anchor: 'similar' },
];

const CLOSE_DELAY_MS = 120;

export function UseCasesDropdown() {
  const getLocalePath = useLocalePath();
  const pathname = usePathname();
  const useCasesPath = getLocalePath('/use-cases');
  const isActive = pathname === useCasesPath || pathname?.startsWith(useCasesPath + '/');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  const closeNow = () => {
    cancelClose();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNow();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => () => cancelClose(), []);

  return (
    <div
      ref={containerRef}
      className='relative'
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <Link
        href={useCasesPath}
        aria-expanded={open}
        aria-haspopup='menu'
        className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${
          isActive ? 'text-blue-600' : 'text-gray-700 hover:text-gray-900'
        }`}
      >
        Use cases
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Link>

      {open && (
        <div
          role='menu'
          className='absolute left-0 top-full z-50 w-[240px] pt-2'
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className='rounded-lg border border-[#e2e8f0] bg-white py-1.5 shadow-md'>
            {ITEMS.map((item, idx) => (
              <Link
                key={item.anchor}
                href={getLocalePath(`/use-cases#${item.anchor}`)}
                role='menuitem'
                onClick={closeNow}
                className={`block px-4 py-2.5 text-[14px] text-[#0f172a] transition-colors hover:bg-[#f1f5f9] ${
                  idx > 0 ? 'border-t border-[#e2e8f0]' : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className='mt-3 border-t border-[#e2e8f0] pt-1'>
              <Link
                href={useCasesPath}
                role='menuitem'
                onClick={closeNow}
                className='block px-4 py-2 text-[14px] font-medium text-blue-600 transition-colors hover:bg-[#f1f5f9]'
              >
                View all use cases →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
