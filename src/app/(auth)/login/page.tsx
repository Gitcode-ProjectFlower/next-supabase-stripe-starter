import { redirect } from 'next/navigation';

import { getSession } from '@/features/account/controllers/get-session';

import { AuthUI } from '../auth-ui';

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect('/');
  }

  return <AuthUI mode='login' />;
}
