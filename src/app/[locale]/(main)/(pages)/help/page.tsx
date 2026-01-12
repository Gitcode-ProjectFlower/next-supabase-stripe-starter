import { Metadata } from 'next';

import { AuthGuard } from '@/components/auth-guard';
import { NO_INDEX_PAGE } from '@/constants/seo.constants';

import { Help } from './Help';

export const metadata: Metadata = {
  title: 'Help',
  description: 'Help',
  ...NO_INDEX_PAGE,
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function HelpPage({ params }: PageProps) {
  await params;
  return (
    <AuthGuard description='Please sign in to ask for help'>
      <Help />
    </AuthGuard>
  );
}
