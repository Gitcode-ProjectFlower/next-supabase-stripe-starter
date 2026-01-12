import { PropsWithChildren } from 'react';

export default function PagesLayout({ children }: PropsWithChildren) {
  return <div className='mx-auto flex w-full max-w-7xl flex-1 flex-col p-6'>{children}</div>;
}
