import { DownloadsSection } from '@/components/settings/downloads-section';

export function Downloads() {
  return (
    <>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold text-gray-900'>Downloads</h1>
        <p className='mt-2 text-sm text-gray-600'>View and download your exported CSV files</p>
      </div>
      <div className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'>
        <DownloadsSection />
      </div>
    </>
  );
}
