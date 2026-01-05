'use client';

import { Button } from '@/components/ui/button';
import { useDownloadsQuery } from '@/libs/queries';
import { RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface Download {
  id: string;
  type: 'Lookalike CSV' | 'Q&A CSV';
  selectionId: string;
  selectionName?: string;
  createdAt: string;
  expiresAt: string;
  size: string;
  downloadUrl?: string;
}

interface DownloadsSectionProps {
  initialDownloads?: Download[];
}

/**
 * Downloads section displaying available CSV exports ready for download
 * Uses TanStack Query for optimized caching and data management
 */
export function DownloadsSection({ initialDownloads = [] }: DownloadsSectionProps) {
  const {
    data: downloadsData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useDownloadsQuery({
    retry: 1,
    // Use initial data if provided (from server-side fetch)
    placeholderData: initialDownloads.length > 0 ? { downloads: initialDownloads } : undefined,
    // Poll for new downloads every 15 seconds when component is mounted
    refetchInterval: 15000,
    // Also refetch when window regains focus
    refetchOnWindowFocus: true,
  });

  const downloads = downloadsData?.downloads || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleDownload = async (download: Download) => {
    if (!download.downloadUrl) {
      console.error('No download URL available for download:', download.id);
      return;
    }

    try {
      // Call API endpoint to log the download
      const response = await fetch(`/api/downloads/${download.id}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[DownloadsSection] Failed to log download:', {
          status: response.status,
          error: errorData.error || 'Unknown error',
        });
        // Still allow download even if logging fails
      } else {
        const data = await response.json();
        // Use the URL from the API response (or fallback to original)
        const downloadUrl = data.downloadUrl || download.downloadUrl;
        window.open(downloadUrl, '_blank');
        return;
      }
    } catch (error) {
      console.error('[DownloadsSection] Error calling download API:', error);
      // Fallback to direct download if API call fails
    }

    // Fallback: open URL directly if API call failed
    window.open(download.downloadUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className='rounded-xl border border-gray-200 p-6'>
        <div className='text-sm text-gray-600'>Loading downloads...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-xl border border-red-200 bg-red-50 p-6'>
        <div className='text-sm text-red-600'>Failed to load downloads. Please try refreshing the page.</div>
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <>
        <p className='text-sm text-gray-600'>
          Your CSV exports will appear here. Exports are available for 7 days after generation.
        </p>
        <div className='mt-4 text-sm text-gray-500'>
          <p>• Click &quot;Export CSV&quot; on any selection to generate a download</p>
          <p>• You&apos;ll receive an email when your export is ready</p>
          <p>• Downloads expire after 7 days</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className='mb-4 flex items-center justify-between'>
        <h3 className='text-sm font-medium text-gray-900'>Available Downloads</h3>
        <Button
          variant='outline'
          size='sm'
          onClick={() => refetch()}
          disabled={isRefetching}
          className='flex items-center gap-2'
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      <div className='overflow-auto rounded-xl border border-gray-200'>
        <Table className='min-w-full divide-y divide-gray-200'>
          <TableHeader className='bg-gray-50'>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600'>
                Type
              </TableHead>
              <TableHead className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600'>
                Selection
              </TableHead>
              <TableHead className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600'>
                Created
              </TableHead>
              <TableHead className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600'>
                Expires
              </TableHead>
              <TableHead className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600'>
                Size
              </TableHead>
              <TableHead className='px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600'>
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className='divide-y divide-gray-200 bg-white'>
            {downloads.map((download) => (
              <TableRow key={download.id} className='hover:bg-gray-50'>
                <TableCell className='whitespace-nowrap px-4 py-3 text-sm text-gray-900'>{download.type}</TableCell>
                <TableCell className='px-4 py-3 text-sm text-gray-900'>
                  {download.selectionName || download.selectionId}
                </TableCell>
                <TableCell className='whitespace-nowrap px-4 py-3 text-sm text-gray-600'>
                  {formatDate(download.createdAt)}
                </TableCell>
                <TableCell className='whitespace-nowrap px-4 py-3 text-sm text-gray-600'>
                  {formatDate(download.expiresAt)}
                </TableCell>
                <TableCell className='whitespace-nowrap px-4 py-3 text-sm text-gray-600'>{download.size}</TableCell>
                <TableCell className='whitespace-nowrap px-4 py-3 text-right text-sm'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleDownload(download)}
                    className='rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50'
                  >
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className='mt-2 text-xs text-gray-600'>Files expire after 7 days.</p>
    </>
  );
}
