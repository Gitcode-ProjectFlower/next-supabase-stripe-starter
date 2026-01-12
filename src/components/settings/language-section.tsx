'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { getAvailableLocales, getDefaultLocale } from '@/libs/collection-mapping';

const LOCALE_NAMES: Record<string, string> = {
  uk: 'English (UK)',
  de: 'Deutsch (Germany)',
};

export function LanguageSection() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const currentLocale = (params?.locale as string) || getDefaultLocale();
  const [selectedLocale, setSelectedLocale] = useState(currentLocale);
  const availableLocales = getAvailableLocales();

  const handleLocaleChange = (newLocale: string) => {
    setSelectedLocale(newLocale);

    // Get current pathname without locale
    const pathname = window.location.pathname;
    const pathWithoutLocale = pathname.replace(/^\/[^/]+/, '') || '/';

    // Navigate to new locale with same path
    router.push(`/${newLocale}${pathWithoutLocale}`);

    toast({
      title: 'Language changed',
      description: `Switched to ${LOCALE_NAMES[newLocale] || newLocale}`,
    });
  };

  return (
    <div className='space-y-4'>
      <div>
        <h3 className='text-lg font-semibold'>Language Preference</h3>
        <p className='text-sm text-gray-600'>Choose your preferred language and region.</p>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='locale-select'>Language / Region</Label>
        <Select value={selectedLocale} onValueChange={handleLocaleChange}>
          <SelectTrigger id='locale-select' className='w-full max-w-xs'>
            <SelectValue placeholder='Select language' />
          </SelectTrigger>
          <SelectContent>
            {availableLocales.map((locale) => (
              <SelectItem key={locale} value={locale}>
                {LOCALE_NAMES[locale] || locale.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className='text-xs text-gray-500'>
          Changing language will reload the page with the selected region's data collection.
        </p>
      </div>
    </div>
  );
}
