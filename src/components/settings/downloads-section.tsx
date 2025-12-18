'use client';

import { Button } from '@/components/ui/button';
import { useDownloadsQuery } from '@/libs/queries';

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
  } = useDownloadsQuery({
    retry: 1,
    // Use initial data if provided (from server-side fetch)
    placeholderData: initialDownloads.length > 0 ? { downloads: initialDownloads } : undefined,
  });

  const downloads = downloadsData?.downloads || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleDownload = async (download: Download) => {
    if (download.downloadUrl) {
      // Open signed URL in new tab for download
      window.open(download.downloadUrl, '_blank');
    } else {
      console.error('No download URL available for download:', download.id);
    }
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
      <div className='overflow-auto rounded-xl border border-gray-200'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600'>Type</th>
              <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600'>
                Selection
              </th>
              <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600'>
                Created
              </th>
              <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600'>
                Expires
              </th>
              <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600'>Size</th>
              <th className='px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600'>
                Action
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200 bg-white'>
            {downloads.map((download) => (
              <tr key={download.id} className='hover:bg-gray-50'>
                <td className='whitespace-nowrap px-4 py-3 text-sm text-gray-900'>{download.type}</td>
                <td className='px-4 py-3 text-sm text-gray-900'>{download.selectionName || download.selectionId}</td>
                <td className='whitespace-nowrap px-4 py-3 text-sm text-gray-600'>{formatDate(download.createdAt)}</td>
                <td className='whitespace-nowrap px-4 py-3 text-sm text-gray-600'>{formatDate(download.expiresAt)}</td>
                <td className='px-4 py-3 text-sm text-gray-600'>{download.size}</td>
                <td className='whitespace-nowrap px-4 py-3 text-right text-sm'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleDownload(download)}
                    className='rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50'
                  >
                    Download
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className='mt-2 text-xs text-gray-600'>Files expire after 7 days.</p>
    </>
  );
}
