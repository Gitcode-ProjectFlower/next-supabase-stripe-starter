import { Metadata } from 'next';

import { UseCases } from './UseCases';

export const metadata: Metadata = {
  title: 'Use cases',
  description: 'Real scenarios — how teams use InsideFirms to prioritize accounts, segment markets, and prepare outreach.',
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function UseCasesPage({ params }: PageProps) {
  await params;
  return <UseCases />;
}
