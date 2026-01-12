import { Metadata } from 'next';

import { AuthGuard } from '@/components/auth-guard';
import { NO_INDEX_PAGE } from '@/constants/seo.constants';

import { QaResults } from './QaResults';

export const metadata: Metadata = {
  title: 'Qa Results',
  description: 'Qa Results',
  ...NO_INDEX_PAGE,
};

interface PageProps {
  params: Promise<{ locale: string; id: string; qa_id: string }>;
}

export default async function QaResultsPage({ params }: PageProps) {
  await params; // Ensure params are awaited
  return (
    <AuthGuard description='Please sign in to view and manage your qa results'>
      <QaResults />
    </AuthGuard>
  );
}
