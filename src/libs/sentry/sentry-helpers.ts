import * as Sentry from '@sentry/nextjs';

/**
 * Set user context in Sentry for better error tracking
 * Call this after user authentication
 */
export function setSentryUser(user: {
    id: string;
    email?: string;
    username?: string;
}) {
    Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
    });
}

/**
 * Clear user context in Sentry
 * Call this on logout
 */
export function clearSentryUser() {
    Sentry.setUser(null);
}

/**
 * Add custom context to Sentry events
 */
export function setSentryContext(key: string, value: Record<string, any>) {
    Sentry.setContext(key, value);
}

/**
 * Add tags to Sentry events for filtering
 */
export function setSentryTag(key: string, value: string) {
    Sentry.setTag(key, value);
}

/**
 * Manually capture an exception
 */
export function captureSentryException(error: Error, context?: Record<string, any>) {
    if (context) {
        Sentry.withScope((scope) => {
            Object.entries(context).forEach(([key, value]) => {
                scope.setContext(key, value);
            });
            Sentry.captureException(error);
        });
    } else {
        Sentry.captureException(error);
    }
}

/**
 * Capture a message (non-error event)
 */
export function captureSentryMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    Sentry.captureMessage(message, level);
}
