'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'onboarding_dismissed';

interface OnboardingOverlayProps {
  hasInteracted: boolean;
  children?: React.ReactNode;
}

function openSectorDropdown() {
  const sectorContainer = document.querySelector('[data-filter="sector"]');
  if (!sectorContainer) return;
  sectorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const triggerButton = sectorContainer.querySelector('button') as HTMLElement | null;
  triggerButton?.click();
}

function EmptyStateBlock({ onStart }: { onStart: () => void }) {
  return (
    <div className='mx-auto flex max-w-[640px] flex-col items-center text-center'>
      <h2 className='text-xl font-semibold leading-[1.3] text-[#0f172a]'>
        Ask one question across hundreds of companies
      </h2>
      <p className='mt-2 max-w-[560px] text-sm leading-[1.55] text-[#475569]'>
        Get structured answers for each company — answering your commercial questions.
        <br />
        Without manual research.
      </p>
      <button
        onClick={onStart}
        className='mt-5 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800'
      >
        ← Start exploring
      </button>
    </div>
  );
}

export function OnboardingOverlay({ hasInteracted }: OnboardingOverlayProps) {
  const [overlayDismissed, setOverlayDismissed] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setOverlayDismissed(false);
  }, []);

  useEffect(() => {
    if (hasInteracted && !overlayDismissed) dismissOverlay();
  }, [hasInteracted]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissOverlay = () => {
    setFading(true);
    setTimeout(() => {
      setOverlayDismissed(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, 200);
  };

  const handleStart = () => {
    dismissOverlay();
    setTimeout(openSectorDropdown, 250);
  };

  return (
    <div className={`transition-opacity duration-200 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      <EmptyStateBlock onStart={overlayDismissed ? openSectorDropdown : handleStart} />
    </div>
  );
}
