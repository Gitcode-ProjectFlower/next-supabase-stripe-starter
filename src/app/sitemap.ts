import type { MetadataRoute } from 'next';

const PUBLIC_PATHS = ['', '/product', '/use-cases', '/about', '/help', '/login', '/signup'];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.insidefirms.com').replace(/\/+$/, '');
  const locales = ['uk', 'de'];
  return locales.flatMap((locale) =>
    PUBLIC_PATHS.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.7,
    }))
  );
}
