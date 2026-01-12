import { Metadata } from 'next';

import { Dashboard } from './Dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Search for candidates and manage selections',
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: PageProps) {
  await params; // Ensure params are awaited (required in Next.js 15+)
  return <Dashboard />;
}
