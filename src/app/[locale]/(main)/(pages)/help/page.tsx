import { Metadata } from 'next';

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
  return <Help />;
}
