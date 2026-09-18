import type { Metadata, Viewport } from 'next';
import { Montserrat, Montserrat_Alternates } from 'next/font/google';
import { PropsWithChildren, Suspense } from 'react';

import { LocaleLang } from '@/components/locale-lang';
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.insidefirms.com'),
  title: {
    default: SEO_PROJECT_NAME,
    template: `%s | ${SEO_PROJECT_NAME}`,
  },
  description: SEO_PROJECT_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SEO_PROJECT_NAME,
    title: SEO_PROJECT_NAME,
    description: SEO_PROJECT_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_PROJECT_NAME,
    description: SEO_PROJECT_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', media: '(prefers-color-scheme: light)' },
      { url: '/favicon_dark.ico', media: '(prefers-color-scheme: dark)' },
    ],
    apple: [{ url: '/favicon_180x180.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang='en'>
      <body className={cn('font-sans antialiased', montserrat.variable, montserratAlternates.variable)}>
        <LocaleLang />
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
