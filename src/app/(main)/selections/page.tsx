import { Metadata } from 'next';

import { AuthGuard } from '@/components/auth-guard';
import { NO_INDEX_PAGE } from '@/constants/seo.constants';

import { Selections } from './Selections';

export const metadata: Metadata = {
  title: 'Selections',
  description: 'Manage your selections',
  ...NO_INDEX_PAGE,
};

export default function SelectionsPage() {
  return (
    <AuthGuard description='Please sign in to view and manage your selections'>
      <Selections />
    </AuthGuard>
  );
}
