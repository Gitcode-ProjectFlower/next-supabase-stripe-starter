// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://ba3d149a78374e5ca479f970b8936414@o4510464945029120.ingest.de.sentry.io/4510464967901264',

  // Environment detection
  environment: process.env.NODE_ENV || 'development',

  // Release tracking - helps identify which version caused issues
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || '0.1.0',

  // Optimized sampling rates for production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  sendDefaultPii: true,

  // Ignore common errors that aren't actionable
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    // Network errors
    'NetworkError',
    'Network request failed',
  ],

  // Filter out transactions we don't care about
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly needed
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
      return null;
    }
    return event;
  },
});
