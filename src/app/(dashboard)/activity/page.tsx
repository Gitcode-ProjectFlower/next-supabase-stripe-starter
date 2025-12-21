'use client';

import { RecentActivity } from '@/components/activity/recent-activity';

export default function ActivityPage() {
  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold text-gray-900'>Recent Activity</h1>
        <p className='mt-2 text-sm text-gray-600'>View your recent searches, Q&A runs, and CSV exports</p>
      </div>
      <RecentActivity />
    </div>
  );
}
