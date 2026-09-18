import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'insidefirms',
    short_name: 'insidefirms',
    description: 'Find lookalike companies, run analyses, and export insights to Excel.',
    start_url: '/uk',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      { src: '/favicon_180x180.png', sizes: '180x180', type: 'image/png' },
      { src: '/favicon_180x180_dark.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
