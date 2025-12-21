'use client';

import { CheckCircle2, Clock, FileDown, MessageSquare, Search, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useRecentActivityQuery } from '@/libs/queries';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';

import { useToast } from '@/components/ui/use-toast';

/**
 * Recent Activity component displaying user's recent actions
 * Shows activities from usage_log with metadata from related tables
 */
export function RecentActivity() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();
  const { data, isLoading, error } = useRecentActivityQuery({ retry: 1 });

  const handleActivityClick = async (activity: { type: string; link?: string; metadata?: any }) => {
    if (!activity.link) {
      toast({
        title: 'No link available',
        description: 'This activity cannot be opened',
        variant: 'destructive',
      });
      return;
    }

    if (activity.type === 'search') {
      // For search, navigate to selection detail page
      router.push(activity.link!);
    } else if (activity.type === 'export') {
      // For exports, we need to get the download URL from the downloads table
      if (activity.metadata?.downloadId) {
        try {
          const { data: download } = await supabase
            .from('downloads')
            .select('url, expires_at')
            .eq('id', activity.metadata.downloadId)
            .single();

          if (download && download.url) {
            const isExpired = download.expires_at ? new Date(download.expires_at) < new Date() : false;
            if (isExpired) {
              toast({
                title: 'Download Expired',
                description: 'This download link has expired',
                variant: 'destructive',
              });
              return;
            }
            window.open(download.url, '_blank');
          } else {
            toast({
              title: 'Download Not Found',
              description: 'The download file is no longer available',
              variant: 'destructive',
            });
          }
        } catch (error) {
          console.error('Failed to fetch download URL:', error);
          toast({
            title: 'Error',
            description: 'Failed to open download',
            variant: 'destructive',
          });
        }
      }
    } else {
      // For search and Q&A, navigate to the page
      router.push(activity.link);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className='h-4 w-4 text-green-600' />;
      case 'running':
        return <Clock className='h-4 w-4 animate-spin text-blue-600' />;
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-600' />;
      default:
        return <Clock className='h-4 w-4 text-gray-400' />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'export':
        return <FileDown className='h-4 w-4 text-gray-600' />;
      case 'qa':
        return <MessageSquare className='h-4 w-4 text-gray-600' />;
      case 'search':
        return <Search className='h-4 w-4 text-gray-600' />;
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  if (isLoading) {
    return (
      <div className='rounded-xl border border-gray-200 p-6'>
        <div className='text-sm text-gray-600'>Loading recent activity...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-xl border border-red-200 bg-red-50 p-6'>
        <div className='text-sm text-red-600'>Failed to load recent activity. Please try refreshing the page.</div>
      </div>
    );
  }

  const activities = data?.activities || [];

  if (activities.length === 0) {
    return (
      <div className='rounded-xl border border-gray-200 p-6'>
        <h3 className='mb-2 text-lg font-semibold text-gray-900'>Recent Activity</h3>
        <p className='text-sm text-gray-600'>No recent activity to display.</p>
        <p className='mt-2 text-xs text-gray-500'>Your recent searches, Q&A runs, and exports will appear here.</p>
      </div>
    );
  }

  return (
    <div className='rounded-xl border border-gray-200 bg-white'>
      <div className='border-b border-gray-200 px-6 py-4'>
        <h3 className='text-lg font-semibold text-gray-900'>Recent Activity</h3>
        <p className='mt-1 text-sm text-gray-600'>Your latest actions and results</p>
      </div>
      <div className='divide-y divide-gray-200'>
        {activities.map((activity) => (
          <button
            key={activity.id}
            onClick={() => handleActivityClick(activity)}
            className='w-full px-6 py-4 text-left transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none'
            disabled={!activity.link}
          >
            <div className='flex items-start gap-4'>
              <div className='mt-0.5 flex-shrink-0'>{getTypeIcon(activity.type)}</div>
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                  {getStatusIcon(activity.status)}
                  <span className='text-sm font-medium text-gray-900'>{activity.label}</span>
                </div>
                <div className='mt-1 flex items-center gap-2 text-xs text-gray-500'>
                  <span className='capitalize'>{activity.type}</span>
                  <span>•</span>
                  <span>{formatTimestamp(activity.timestamp)}</span>
                  {activity.metadata?.count && (
                    <>
                      <span>•</span>
                      <span>
                        {activity.metadata.count} {activity.type === 'qa' ? 'profiles' : 'records'}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {activity.link && (
                <div className='flex-shrink-0'>
                  <span className='text-xs text-blue-600 hover:text-blue-700'>View →</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
