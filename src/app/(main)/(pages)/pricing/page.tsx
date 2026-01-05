import { Metadata } from 'next';

import { NO_INDEX_PAGE } from '@/constants/seo.constants';

import { Pricing } from './Pricing';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Find a plan that fits you. Upgrade at any time to enable additional features.',
  ...NO_INDEX_PAGE,
};

export default function PricingPage() {
  return <Pricing />;
}
