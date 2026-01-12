import { Metadata } from 'next';

import { AuthUI } from '../auth-ui';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your account',
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function LoginPage({ params }: PageProps) {
  await params; // Ensure params are awaited
  return <AuthUI mode='login' />;
}
