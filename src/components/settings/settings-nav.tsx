'use client';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils/cn';

interface SettingsNavProps {
  currentTab?: string;
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
 * Settings navigation sidebar component
 */
export function SettingsNav({ currentTab }: SettingsNavProps) {
  return (
    <TabsList className='col-span-12 flex h-fit flex-col rounded-2xl border border-gray-200 bg-white p-3 text-start text-sm shadow-sm md:col-span-3'>
      {NAV_ITEMS.map((item) => (
        <TabsTrigger
          key={item.id}
          className={cn(
            'data-[state=] block w-full rounded-lg bg-white px-3 py-2 text-start text-black hover:bg-gray-50',
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
