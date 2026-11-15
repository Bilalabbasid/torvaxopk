import type { MetadataRoute } from 'next';
import { COLLECTIONS } from '@/content/collections';
import { GUIDES } from '@/content/guides';
import { INFO_PAGES } from '@/content/pages';
import { listActiveProducts } from '@/lib/catalog';
import { siteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

const base = siteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/shop`, changeFrequency: 'daily', priority: 0.9 },
    ...COLLECTIONS.map((c) => ({ url: `${base}/collections/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.9 })),
    ...GUIDES.map((g) => ({ url: `${base}/guides/${g.slug}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...Object.keys(INFO_PAGES).map((slug) => ({ url: `${base}/${slug}`, changeFrequency: 'monthly' as const, priority: 0.4 })),
  ];
  try {
    const products = await listActiveProducts();
    pages.push(
      ...products.map((p) => ({
        url: `${base}/products/${p.slug}`,
        lastModified: p.updated_at,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        images: p.product_images.slice(0, 3).map((i) => (i.url.startsWith('http') ? i.url : `${base}${i.url}`)),
      })),
    );
  } catch (error) {
    console.error('sitemap: products unavailable', error);
  }
  return pages;
}
