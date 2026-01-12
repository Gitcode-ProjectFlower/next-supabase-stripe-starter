import { Metadata } from 'next';

import { AuthUI } from '../auth-ui';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create a new account',
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function SignupPage({ params }: PageProps) {
  await params; // Ensure params are awaited
  return <AuthUI mode='signup' />;
}
