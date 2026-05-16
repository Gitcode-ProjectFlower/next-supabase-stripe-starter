import type { ReactNode } from 'react';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div className='mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8'>
      <h1 className='text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl'>{title}</h1>
      <p className='mt-3 text-sm text-gray-500'>Last updated: {lastUpdated}</p>
      <div className='mt-10 space-y-10 text-[15px] leading-7 text-gray-700'>{children}</div>
    </div>
  );
}

interface LegalSectionProps {
  heading: string;
  children: ReactNode;
}

export function LegalSection({ heading, children }: LegalSectionProps) {
  return (
    <section className='space-y-3'>
      <h2 className='text-xl font-semibold text-gray-900'>{heading}</h2>
      <div className='space-y-3'>{children}</div>
    </section>
  );
}

interface LegalSubheadingProps {
  children: ReactNode;
}

export function LegalSubheading({ children }: LegalSubheadingProps) {
  return <h3 className='text-base font-semibold text-gray-900'>{children}</h3>;
}
