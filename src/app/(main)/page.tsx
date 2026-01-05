import { Metadata } from 'next';

import { Dashboard } from './Dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Search for candidates and manage selections',
};

export default function DashboardPage() {
  return <Dashboard />;
}
