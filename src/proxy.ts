import { type NextRequest, NextResponse } from 'next/server';

import { getAvailableLocales, getDefaultLocale } from '@/libs/collection-mapping';
import { updateSession } from '@/libs/supabase/supabase-middleware-client';

/**
 * Check if proxy should skip processing this path for locale redirection
 */
function shouldSkipLocaleRedirect(pathname: string): boolean {
  return (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/monitoring') ||
    pathname.includes('.') // Skip files with extensions (static assets)
  );
}

/**
 * Check if pathname already has a valid locale prefix
 */
function hasValidLocale(pathname: string): boolean {
  const availableLocales = getAvailableLocales();
  return availableLocales.some((locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`);
}

/**
 * Detect locale based on Vercel geolocation
 * Falls back to default locale if geolocation is unavailable
 */
function detectLocaleFromGeolocation(request: NextRequest): string {
  // Get country from Vercel geolocation
  // request.geo is available in Vercel Edge Runtime (but may not be in TypeScript types)
  // Headers are fallback for alternative access
  const geo = (request as any).geo;
  const country = geo?.country || request.headers.get('x-vercel-ip-country');

  // Map country codes to locales
  if (country === 'DE') {
    return 'de';
  } else if (country === 'GB' || country === 'UK') {
    return 'uk';
  }

  // Default fallback (also used when geolocation is unavailable, e.g., local development)
  return getDefaultLocale(); // Returns 'uk'
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if we need to redirect based on geolocation
  if (!shouldSkipLocaleRedirect(pathname) && !hasValidLocale(pathname)) {
    // Detect locale based on geolocation
    const detectedLocale = detectLocaleFromGeolocation(request);

    // Build redirect URL with locale prefix
    const url = request.nextUrl.clone();
    const newPathname = `/${detectedLocale}${pathname === '/' ? '' : pathname}`;
    url.pathname = newPathname;

    // Still call updateSession to maintain Supabase session, but return redirect
    const supabaseResponse = await updateSession(request);

    // Create redirect response while preserving cookies from Supabase session
    // Following the pattern from supabase-middleware-client.ts comments
    const redirectResponse = NextResponse.redirect(url);

    // Copy all cookies from Supabase session to redirect response
    // This ensures the user's session is maintained during the redirect
    const cookies = supabaseResponse.cookies.getAll();
    cookies.forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });

    return redirectResponse;
  }

  // No locale redirect needed, continue with normal session update
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - monitoring (Sentry tunnel)
     * - Files with extensions (.*\\..*)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|monitoring|.*\\..*).*)',
  ],
};
