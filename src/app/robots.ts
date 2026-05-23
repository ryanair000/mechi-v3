import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/urls';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/ke',
          '/tz',
          '/ug',
          '/usa',
          '/weekendcup',
          '/weekendcup/register',
          '/weekendcup/t/',
          '/tournaments',
          '/pricing',
          '/how-mechi-works',
          '/support',
          '/playmechi',
          '/playmechi/weka-mawe',
          '/privacy-policy',
          '/terms-of-service',
          '/user-data-deletion',
        ],
        disallow: [
          '/admin',
          '/api',
          '/dashboard',
          '/inbox',
          '/matches',
          '/notifications',
          '/profile',
          '/queue',
          '/reports',
          '/results',
          '/moderators',
          '/manual-tests',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
