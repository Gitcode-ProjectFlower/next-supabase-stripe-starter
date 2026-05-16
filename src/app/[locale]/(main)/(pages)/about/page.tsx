import { Metadata } from 'next';

import { About } from './About';

export const metadata: Metadata = {
  title: 'About | InsideFirms',
  description: 'Why InsideFirms exists — better account decisions start with clearer commercial interpretation.',
};

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  return <About />;
}
