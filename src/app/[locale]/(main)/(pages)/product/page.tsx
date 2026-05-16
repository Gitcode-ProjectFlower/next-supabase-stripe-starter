import { Metadata } from 'next';

import { Product } from './Product';

export const metadata: Metadata = {
  title: 'Product | InsideFirms',
  description: 'Ask one commercial question across hundreds of companies — structured answers, scores, and evidence.',
};

export default async function ProductPage({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  return <Product />;
}
