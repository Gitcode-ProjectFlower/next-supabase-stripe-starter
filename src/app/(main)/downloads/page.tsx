import { Metadata } from 'next';

import { AuthGuard } from '@/components/auth-guard';
import { NO_INDEX_PAGE } from '@/constants/seo.constants';

import { Downloads } from './Downloads';

export const metadata: Metadata = {
  title: 'Downloads',
  description: 'Downloads',
  ...NO_INDEX_PAGE,
};

export default function DownloadsPage() {
  return (
    <AuthGuard description='Please sign in to view and manage your downloads'>
      <Downloads />
    </AuthGuard>
  );
}
