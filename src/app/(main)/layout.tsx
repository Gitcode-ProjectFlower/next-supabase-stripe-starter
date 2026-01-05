import { PropsWithChildren } from 'react';

import { Header } from '@/components/header';

export default function MainLayout({ children }: PropsWithChildren) {
  return (
    <div className='flex min-h-screen flex-col bg-gray-50'>
      <Header />
      <main className='mx-auto flex w-full max-w-7xl flex-1 flex-col p-6'>{children}</main>
    </div>
  );
}
