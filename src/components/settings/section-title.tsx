import { ReactNode } from 'react';

interface SectionTitleProps {
  children: ReactNode;
}

/**
 * Reusable section title component for settings pages
 */
export function SectionTitle({ children }: SectionTitleProps) {
  return <h2 className='mb-3 text-lg font-semibold text-gray-900'>{children}</h2>;
}
