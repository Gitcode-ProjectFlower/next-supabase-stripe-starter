import { PropsWithChildren } from 'react';

export default function PagesLayout({ children }: PropsWithChildren) {
  return <div className='mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col p-4 sm:p-6'>{children}</div>;
}
