import { Metadata } from 'next';

import { AuthGuard } from '@/components/auth-guard';
import { NO_INDEX_PAGE } from '@/constants/seo.constants';

import { Settings } from './Settings';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'View your account settings and manage your subscription and usage limits.',
  ...NO_INDEX_PAGE,
};

interface SettingsPageProps {
  searchParams: Promise<{ success?: string; tab?: string; error?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  return (
    <AuthGuard description='Please sign in to view and manage your settings'>
      <Settings searchParams={searchParams} />
    </AuthGuard>
  );
}
