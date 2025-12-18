'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

import { useUsageStatsQuery } from '@/libs/queries';

export function UsageMeter() {
  const {
    data: stats,
    isLoading,
    error,
  } = useUsageStatsQuery({
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className='animate-pulse space-y-4 rounded-lg border p-4'>
        <div className='h-4 w-1/2 rounded bg-gray-200'></div>
        <div className='h-2 rounded bg-gray-200'></div>
        <div className='h-2 rounded bg-gray-200'></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className='space-y-4 rounded-lg border bg-white p-4 dark:bg-gray-800'>
        <div className='text-sm text-red-600 dark:text-red-400'>
          Failed to load usage statistics. Please try refreshing the page.
        </div>
      </div>
    );
  }

  const downloadsPercent = (stats.downloads / stats.downloadsLimit) * 100;
  const aiCallsPercent = (stats.ai_calls / stats.aiCallsLimit) * 100;

  const showWarning = downloadsPercent > 80 || aiCallsPercent > 80;

  return (
    <div className='space-y-4 rounded-lg border bg-white p-4 dark:bg-gray-800'>
      <h3 className='text-lg font-semibold'>Usage (Last 30 Days)</h3>

      {/* Downloads */}
      <div>
        <div className='mb-2 flex justify-between text-sm'>
          <span className='text-gray-600 dark:text-gray-400'>Records Downloaded</span>
          <span className='font-medium'>
            {stats.downloads.toLocaleString()} / {stats.downloadsLimit.toLocaleString()}
          </span>
        </div>
        <div className='h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700'>
          <div
            className={`h-2 rounded-full transition-all ${downloadsPercent > 80 ? 'bg-yellow-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(downloadsPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* AI Calls */}
      <div>
        <div className='mb-2 flex justify-between text-sm'>
          <span className='text-gray-600 dark:text-gray-400'>AI Questions Asked</span>
          <span className='font-medium'>
            {stats.ai_calls.toLocaleString()} / {stats.aiCallsLimit.toLocaleString()}
          </span>
        </div>
        <div className='h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700'>
          <div
            className={`h-2 rounded-full transition-all ${aiCallsPercent > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(aiCallsPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Warning */}
      {showWarning && (
        <div className='flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20'>
          <AlertCircle className='mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-500' />
          <div className='flex-1'>
            <p className='text-sm font-medium text-yellow-800 dark:text-yellow-200'>Approaching your limit</p>
            <p className='mt-1 text-xs text-yellow-700 dark:text-yellow-300'>
              Upgrade your plan to continue using the service without interruption.
            </p>
            <Link
              href='/pricing'
              className='mt-2 inline-block text-xs font-medium text-yellow-800 hover:underline dark:text-yellow-200'
            >
              View Plans →
            </Link>
          </div>
        </div>
      )}

      {/* Plan Info */}
      <div className='border-t pt-2 text-xs text-gray-500 dark:text-gray-400'>
        Current plan: <span className='font-medium capitalize'>{stats.plan?.replace('_', ' ') || 'Unknown'}</span>
      </div>
    </div>
  );
}
