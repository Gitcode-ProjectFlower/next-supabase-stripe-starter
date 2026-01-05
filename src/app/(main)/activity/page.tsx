import { Metadata } from 'next';

import { AuthGuard } from '@/components/auth-guard';
import { NO_INDEX_PAGE } from '@/constants/seo.constants';

import { Activity } from './Activity';

export const metadata: Metadata = {
  title: 'Activity',
  description: 'View your recent searches, Q&A runs, and CSV exports',
  ...NO_INDEX_PAGE,
};

export default function ActivityPage() {
  return (
    <AuthGuard description='Please sign in to view and manage your activity'>
      <Activity />
    </AuthGuard>
  );
}
