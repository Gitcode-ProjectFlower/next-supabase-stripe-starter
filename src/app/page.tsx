import { getDefaultLocale } from '@/libs/collection-mapping';
import { redirect } from 'next/navigation';

// Root page redirects to default locale
export default function RootPage() {
  const defaultLocale = getDefaultLocale();
  redirect(`/${defaultLocale}`);
}
