'use client';

import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { SectionTitle } from './section-title';

interface NotificationsSectionProps {
  initialEmailNotifications?: boolean;
}

/**
 * Notifications settings section with email toggle
 */
export function NotificationsSection({ initialEmailNotifications }: NotificationsSectionProps) {
  const [emailNotifications, setEmailNotifications] = useState(initialEmailNotifications ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialEmailNotifications);

  // Fetch current preferences on mount if not provided
  useEffect(() => {
    if (initialEmailNotifications === undefined) {
      const fetchPreferences = async () => {
        try {
          const response = await fetch('/api/settings/notifications');
          if (response.ok) {
            const data = await response.json();
            setEmailNotifications(data.enabled ?? false);
          }
        } catch (error) {
          console.error('Failed to fetch notification preferences:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchPreferences();
    } else {
      setIsLoading(false);
    }
  }, [initialEmailNotifications]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: emailNotifications }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save preferences');
      }

      // Show success feedback (could use a toast library here)
      console.log('Notification preferences saved successfully');
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      // TODO: Show error toast to user
      // Revert state on error
      setEmailNotifications((prev) => !prev);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = () => {
    setEmailNotifications((prev) => !prev);
  };

  if (isLoading) {
    return <div className='text-sm text-gray-600'>Loading notification preferences...</div>;
  }

  return (
    <>
      <SectionTitle>Notifications</SectionTitle>
      <p className='mb-3 text-sm text-gray-600'>
        Toggle e‑mail notifications for: <span className='italic'>export ready</span> and{' '}
        <span className='italic'>run ready</span>.
      </p>

      <div className='flex items-center justify-between rounded-xl border border-gray-200 p-4'>
        <div>
          <div className='font-medium text-gray-900'>Email notifications</div>
          <div className='text-sm text-gray-600'>
            Receive an email when a CSV export is ready or a Q&A run finishes.
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          type='button'
          role='switch'
          aria-checked={emailNotifications}
          onClick={handleToggle}
          disabled={isSaving}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
            emailNotifications ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              emailNotifications ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div className='mt-4 flex items-center gap-2'>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className='rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black disabled:opacity-50'
        >
          {isSaving ? 'Saving...' : 'Save preferences'}
        </Button>
        <span className='text-xs text-gray-600'>Current: {emailNotifications ? 'On' : 'Off'}</span>
      </div>
    </>
  );
}
