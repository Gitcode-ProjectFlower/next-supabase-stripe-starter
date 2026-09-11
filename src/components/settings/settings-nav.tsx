'use client';

import { useCallback, useEffect, useRef } from 'react';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils/cn';

interface SettingsNavProps {
  currentTab?: string;
}

function centerTrigger(list: HTMLElement, trigger: HTMLElement | null, smooth: boolean) {
  if (!trigger || !list.contains(trigger) || list.scrollWidth <= list.clientWidth + 1) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  trigger.scrollIntoView({
    inline: 'center',
    block: 'nearest',
    behavior: smooth && !reduceMotion ? 'smooth' : 'auto',
  });
}

const NAV_ITEMS = [
  { id: 'general', label: 'General' },
  { id: 'language', label: 'Language' },
  { id: 'plan', label: 'Plan' },
  { id: 'limits', label: 'Usage & Limits' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'downloads', label: 'Downloads' },
] as const;

/**
 * Settings navigation sidebar component.
 * On mobile the tabs become a horizontal scroll strip; the active tab is
 * kept centered (on mount instantly, on focus change smoothly).
 */
export function SettingsNav({ currentTab }: SettingsNavProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    centerTrigger(list, list.querySelector<HTMLElement>('[role="tab"][data-state="active"]'), false);
  }, [currentTab]);

  const handleFocus = useCallback((e: React.FocusEvent) => {
    const list = listRef.current;
    const trigger = (e.target as Element | null)?.closest?.('[role="tab"]') as HTMLElement | null;
    if (!list || !trigger || !list.contains(trigger)) return;
    centerTrigger(list, trigger, true);
  }, []);

  return (
    <TabsList
      ref={listRef}
      onFocus={handleFocus}
      className='col-span-12 flex h-fit flex-row justify-start gap-1 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 text-start text-sm shadow-sm [scrollbar-width:none] [-ms-overflow-style:none] sm:p-3 md:col-span-3 md:flex-col [&::-webkit-scrollbar]:hidden'
    >
      {NAV_ITEMS.map((item) => (
        <TabsTrigger
          key={item.id}
          className={cn(
            'block w-auto shrink-0 whitespace-nowrap rounded-lg bg-white px-3 py-2 text-start text-black hover:bg-gray-50 md:w-full',
            currentTab === item.id &&
              'data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:shadow-sm'
          )}
          value={item.id}
        >
          {item.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
