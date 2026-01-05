import { Metadata } from 'next';

import { AuthGuard } from '@/components/auth-guard';
import { NO_INDEX_PAGE } from '@/constants/seo.constants';

import { Selection } from './Selection';

export const metadata: Metadata = {
  title: 'Selection',
  description: 'View and manage your selection',
  ...NO_INDEX_PAGE,
};

export default function SelectionPage() {
  return (
    <AuthGuard description='Please sign in to view and manage your selection'>
      <Selection />
    </AuthGuard>
  );
}
