import { Metadata } from 'next';

import { AuthGuard } from '@/components/auth-guard';
import { NO_INDEX_PAGE } from '@/constants/seo.constants';

import { Help } from './Help';

export const metadata: Metadata = {
  title: 'Help',
  description: 'Help',
  ...NO_INDEX_PAGE,
};

export default function HelpPage() {
  return (
    <AuthGuard description='Please sign in to ask for help'>
      <Help />
    </AuthGuard>
  );
}
