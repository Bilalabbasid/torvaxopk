import type { MetadataRoute } from 'next';

const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

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
