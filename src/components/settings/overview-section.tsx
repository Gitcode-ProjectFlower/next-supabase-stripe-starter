'use client';

import { getTopKLimit, type UserPlan } from '@/libs/plan-config';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';
import { useEffect, useState } from 'react';

interface OverviewSectionProps {
  userPlan: UserPlan;
  downloadsCount?: number;
  emailNotificationsEnabled?: boolean;
}

/**
 * Overview section showing key account information at a glance
 * Fetches email notification status reactively to stay in sync
 */
export function OverviewSection({
  userPlan,
  downloadsCount = 0,
  emailNotificationsEnabled: initialEmailNotificationsEnabled = false,
}: OverviewSectionProps) {
  const supabase = createSupabaseBrowserClient();
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(initialEmailNotificationsEnabled);

  // Fetch current notification status on mount and when prop changes
  useEffect(() => {
    let mounted = true;

    const fetchNotificationStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !mounted) return;

        const { data: userData } = await supabase
          .from('users')
          .select('email_notifications_enabled')
          .eq('id', user.id)
          .single();

        if (userData && mounted) {
          setEmailNotificationsEnabled(userData.email_notifications_enabled ?? false);
        }
      } catch (error) {
        console.error('Failed to fetch notification status:', error);
      }
    };

    // Fetch on mount
    fetchNotificationStatus();

    // Also listen for visibility changes (when user switches tabs back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotificationStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [supabase]);

  // Update when initial prop changes (from router.refresh() or server-side update)
  useEffect(() => {
    setEmailNotificationsEnabled(initialEmailNotificationsEnabled);
  }, [initialEmailNotificationsEnabled]);
  const planDisplayName = userPlan
    ? userPlan === 'free_tier'
      ? 'Free Tier'
      : userPlan === 'promo_medium'
      ? 'Promo Medium'
      : userPlan.charAt(0).toUpperCase() + userPlan.slice(1)
    : 'Anonymous';

  const topKCap = getTopKLimit(userPlan);

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
      {/* Current Plan */}
      <div className='rounded-xl border border-gray-200 p-4'>
        <div className='text-sm text-gray-600'>Current plan</div>
        <div className='mt-1 font-semibold text-gray-900'>{planDisplayName}</div>
        <div className='mt-1 text-xs text-gray-600'>
          Top‑K cap: <span className='font-medium'>{topKCap.toLocaleString()}</span>
        </div>
      </div>

      {/* Downloads Ready */}
      <div className='rounded-xl border border-gray-200 p-4'>
        <div className='text-sm text-gray-600'>Downloads ready</div>
        <div className='mt-1 font-semibold text-gray-900'>{downloadsCount}</div>
        <div className='mt-1 text-xs text-gray-600'>Expire after 7 days</div>
      </div>

      {/* Status */}
      <div className='rounded-xl border border-gray-200 p-4'>
        <div className='text-sm text-gray-600'>Status</div>
        <div className='mt-1 text-xs text-gray-600'>
          Email notifications: <b className='font-semibold'>{emailNotificationsEnabled ? 'On' : 'Off'}</b>
        </div>
        <div className='mt-1 text-xs text-gray-600'>Billing handled in‑app</div>
      </div>
    </div>
  );
}
