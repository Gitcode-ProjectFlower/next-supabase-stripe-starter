// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://ba3d149a78374e5ca479f970b8936414@o4510464945029120.ingest.de.sentry.io/4510464967901264',

  // Environment detection
  environment: process.env.NODE_ENV || 'development',

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || '0.1.0',

  // Optimized sampling rates for production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII
  sendDefaultPii: true,

  // Ignore common errors
  ignoreErrors: [
    'top.GLOBALS',
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'NetworkError',
    'Network request failed',
  ],

  // Filter events
  beforeSend(event, hint) {
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
      return null;
    }
    return event;
  },
});
