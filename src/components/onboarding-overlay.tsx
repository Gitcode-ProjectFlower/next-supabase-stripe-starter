'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'onboarding_dismissed';

interface OnboardingOverlayProps {
  hasInteracted: boolean;
  children?: React.ReactNode;
}

export function OnboardingOverlay({ hasInteracted, children }: OnboardingOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  useEffect(() => {
    if (hasInteracted && visible) dismiss();
  }, [hasInteracted]);

  const dismiss = () => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, 200);
  };

  const handleStart = () => {
    dismiss();
    setTimeout(() => {
      const sectorContainer = document.querySelector('[data-filter="sector"]');
      if (sectorContainer) {
        sectorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const triggerButton = sectorContainer.querySelector('button') as HTMLElement;
        if (triggerButton) triggerButton.click();
      }
    }, 250);
  };

  if (!visible) return children ? <>{children}</> : null;

  return (
    <div className={`transition-opacity duration-200 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      <div className='mx-auto max-w-md space-y-2'>
        <p className='text-xl font-semibold text-gray-800'>Find companies and get instant insights</p>
        <p className='text-base text-gray-400'>
          Choose a sector or region on the left — or enter a company name.
        </p>
        <button
          onClick={handleStart}
          className='inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800'
        >
          ← Start exploring
        </button>
      </div>
    </div>
  );
}
