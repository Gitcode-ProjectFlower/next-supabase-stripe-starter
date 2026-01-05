'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SectionTitle } from './section-title';

interface NotificationsSectionProps {
  initialEmailNotifications?: boolean;
}

/**
 * Notifications settings section with email toggle
 * Manages email_notifications_enabled field in Supabase users table
 */
export function NotificationsSection({ initialEmailNotifications }: NotificationsSectionProps) {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  // Use ref to track the last saved value
  const lastSavedValue = useRef(initialEmailNotifications ?? false);
  const [emailNotifications, setEmailNotifications] = useState(initialEmailNotifications ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialEmailNotifications);
  const [hasChanges, setHasChanges] = useState(false);

  // Update state when initialEmailNotifications prop changes (e.g., after page refresh)
  useEffect(() => {
    const newValue = initialEmailNotifications ?? false;
    setEmailNotifications(newValue);
    lastSavedValue.current = newValue;
  }, [initialEmailNotifications]);

  // Fetch current preferences on mount if not provided
  useEffect(() => {
    if (initialEmailNotifications === undefined) {
      const fetchPreferences = async () => {
        try {
          // Get current user
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError || !user) {
            toast({
              title: 'Error',
              description: 'Please sign in to view notification preferences',
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }

          // Fetch user preferences from Supabase
          const { data: userData, error } = await supabase
            .from('users')
            .select('email_notifications_enabled')
            .eq('id', user.id)
            .single<{ email_notifications_enabled: boolean }>();

          if (error) {
            console.error('Failed to fetch notification preferences:', error);
            toast({
              title: 'Error',
              description: 'Failed to load notification preferences',
              variant: 'destructive',
            });
            // Default to false if error
            const defaultValue = false;
            setEmailNotifications(defaultValue);
            lastSavedValue.current = defaultValue;
          } else if (userData) {
            const enabled = userData.email_notifications_enabled ?? false;
            setEmailNotifications(enabled);
            lastSavedValue.current = enabled;
          } else {
            // No data returned, default to false
            const defaultValue = false;
            setEmailNotifications(defaultValue);
            lastSavedValue.current = defaultValue;
          }
        } catch (error) {
          console.error('Failed to fetch notification preferences:', error);
          toast({
            title: 'Error',
            description: 'Failed to load notification preferences. Please refresh the page.',
            variant: 'destructive',
          });
          // Default to false on error
          const defaultValue = false;
          setEmailNotifications(defaultValue);
          lastSavedValue.current = defaultValue;
        } finally {
          setIsLoading(false);
        }
      };

      fetchPreferences();
    } else {
      setIsLoading(false);
    }
  }, [initialEmailNotifications, supabase, toast]);

  // Track changes from last saved value
  useEffect(() => {
    setHasChanges(emailNotifications !== lastSavedValue.current);
  }, [emailNotifications]);

  const handleSave = async () => {
    if (!hasChanges) {
      toast({
        title: 'No changes',
        description: 'No changes to save.',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Please sign in to update notification preferences');
      }

      // Update email_notifications_enabled in Supabase users table
      const { error: updateError } = await supabase
        .from('users')
        // @ts-expect-error - Supabase browser client has TypeScript inference issue with update queries
        // The update payload is correctly typed, but TypeScript infers the parameter as 'never'
        // This is a known limitation and the code works correctly at runtime
        .update({ email_notifications_enabled: emailNotifications })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to update notification preferences:', updateError);
        throw new Error(updateError.message || 'Failed to save preferences');
      }

      // Update last saved value to reflect saved state
      lastSavedValue.current = emailNotifications;
      setHasChanges(false);

      toast({
        title: 'Success',
        description: `Email notifications ${emailNotifications ? 'enabled' : 'disabled'} successfully.`,
      });

      // Refresh server components to update General tab
      router.refresh();
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save preferences';

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      // Revert state on error - use last saved value
      setEmailNotifications(lastSavedValue.current);
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
          className={`relative inline-flex h-[25px] w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
            emailNotifications ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`block h-5 w-5 transform rounded-full bg-white transition-transform ${
              emailNotifications ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div className='mt-4 flex items-center gap-2'>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className='rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50'
        >
          {isSaving ? 'Saving...' : 'Save preferences'}
        </Button>
        {hasChanges && <span className='text-xs text-amber-600'>You have unsaved changes</span>}
        {!hasChanges && (
          <span className='text-xs text-gray-600'>
            {emailNotifications ? 'Notifications enabled' : 'Notifications disabled'}
          </span>
        )}
      </div>
    </>
  );
}
