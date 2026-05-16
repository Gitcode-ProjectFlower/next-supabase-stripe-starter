import { PropsWithChildren } from 'react';

import { ConditionalFooter } from '@/components/conditional-footer';
import { Header } from '@/components/header';

export default function MainLayout({ children }: PropsWithChildren) {
  return (
    <div className='flex min-h-screen flex-col bg-gray-50'>
      <Header />
      <main className='flex w-full flex-1 flex-col'>{children}</main>
      <ConditionalFooter />
    </div>
  );
}
