import { Metadata } from 'next';

import { AuthGuard } from '@/components/auth-guard';
import { NO_INDEX_PAGE } from '@/constants/seo.constants';

import { Activity } from './Activity';

export const metadata: Metadata = {
  title: 'History',
  description: 'View your recent searches, insight runs, and Excel exports',
  ...NO_INDEX_PAGE,
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ActivityPage({ params }: PageProps) {
  await params;
  return (
    <AuthGuard description='Please sign in to view and manage your activity'>
      <Activity />
    </AuthGuard>
  );
}
