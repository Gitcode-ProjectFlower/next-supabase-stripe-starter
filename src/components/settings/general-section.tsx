'use client';

import type { UserPlan } from '@/libs/plan-config';
import { OverviewSection } from './overview-section';
import { SectionTitle } from './section-title';

interface GeneralSectionProps {
  userEmail: string;
  userId: string;
  userPlan: UserPlan;
  downloadsCount?: number;
  emailNotificationsEnabled?: boolean;
}

/**
 * General settings section with account information and overview
 */
export function GeneralSection({
  userEmail,
  userId,
  userPlan,
  downloadsCount = 0,
  emailNotificationsEnabled = false,
}: GeneralSectionProps) {
  return (
    <div className='space-y-6'>
      <div>
        <SectionTitle>Account Information</SectionTitle>
        <div className='space-y-4'>
          <div>
            <label className='text-sm font-medium text-gray-700'>Email</label>
            <p className='mt-1 text-gray-900'>{userEmail}</p>
          </div>
          <div>
            <label className='text-sm font-medium text-gray-700'>User ID</label>
            <p className='mt-1 font-mono text-sm text-gray-500'>{userId}</p>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>Overview</SectionTitle>
        <OverviewSection
          userPlan={userPlan}
          downloadsCount={downloadsCount}
          emailNotificationsEnabled={emailNotificationsEnabled}
        />
      </div>
    </div>
  );
}
