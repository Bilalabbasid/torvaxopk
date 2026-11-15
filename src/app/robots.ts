import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

const base = siteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/checkout', '/cart', '/order/', '/pay/', '/balance/', '/payment-problem'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
