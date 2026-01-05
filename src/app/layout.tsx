import type { Metadata } from 'next';
import { Montserrat, Montserrat_Alternates } from 'next/font/google';
import { PropsWithChildren, Suspense } from 'react';

import { Toaster } from '@/components/ui/toaster';
import { PostHogPageView, PostHogProvider } from '@/providers/posthog-provider';
import { ReactQueryProvider } from '@/providers/react-query-provider';
import { cn } from '@/utils/cn';
import { Analytics } from '@vercel/analytics/react';

import { SEO_PROJECT_DESCRIPTION, SEO_PROJECT_NAME } from '@/constants/seo.constants';
import '@/styles/globals.css';

export const dynamic = 'force-dynamic';

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
});

const montserratAlternates = Montserrat_Alternates({
  variable: '--font-montserrat-alternates',
  weight: ['500', '600', '700'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: SEO_PROJECT_NAME,
    template: `%s | ${SEO_PROJECT_NAME}`,
  },
  description: SEO_PROJECT_DESCRIPTION,
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang='en'>
      <body className={cn('font-sans antialiased', montserrat.variable, montserratAlternates.variable)}>
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <ReactQueryProvider>{children}</ReactQueryProvider>
          <Toaster />
          <Analytics />
        </PostHogProvider>
      </body>
    </html>
  );
}
