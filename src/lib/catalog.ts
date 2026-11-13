import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import { cache } from 'react';
import { db, must } from './supabase/admin';
import type { Product, Settings, Variant } from './types';

const PRODUCT_SELECT = '*, product_variants(*), product_images(*)';

function sortProduct(p: Product): Product {
  p.product_variants.sort((a, b) => a.sort_order - b.sort_order);
  p.product_images.sort((a, b) => a.sort_order - b.sort_order);
  return p;
}

// Storefront reads are cached for up to a minute and dropped immediately whenever the admin changes
// something or an order moves stock. Checkout never trusts this cache: it re-reads live prices and stock.
const CATALOG_TAG = 'catalog';
const TTL = 60;

/** Expire cached catalogue/settings now (admin edits, placed orders). Safe in actions and route handlers. */
export function invalidateCatalog() {
  try {
    revalidateTag(CATALOG_TAG, { expire: 0 });
  } catch {
    // Outside a request (scripts, tests): nothing to invalidate.
  }
}

export const getSettings = cache(
  unstable_cache(
    async (): Promise<Settings> => must(await db().from('settings').select('*').eq('id', 1).single(), 'Load settings') as Settings,
    ['settings'],
    { tags: [CATALOG_TAG], revalidate: TTL },
  ),
);

export const listActiveProducts = cache(
  unstable_cache(
    async (): Promise<Product[]> => {
      const rows = must(
        await db().from('products').select(PRODUCT_SELECT).eq('status', 'active').order('sort_order'),
        'Load products',
      ) as Product[];
      return rows.map(sortProduct);
    },
    ['active-products'],
    { tags: [CATALOG_TAG], revalidate: TTL },
  ),
);

export const getProductBySlug = cache(
  unstable_cache(
    async (slug: string): Promise<Product | null> => {
      const row = must(
        await db().from('products').select(PRODUCT_SELECT).eq('slug', slug).eq('status', 'active').maybeSingle(),
        'Load product',
      ) as Product | null;
      return row ? sortProduct(row) : null;
    },
    ['product-by-slug'],
    { tags: [CATALOG_TAG], revalidate: TTL },
  ),
);

export async function getVariantsWithProducts(ids: string[]) {
  if (!ids.length) return [];
  return must(
    await db()
      .from('product_variants')
      .select('*, products!inner(id, name, slug, status, product_images(url, variant_id, is_listing, sort_order))')
      .in('id', ids),
    'Load variants',
  ) as (Variant & {
    products: {
      id: string;
      name: string;
      slug: string;
      status: string;
      product_images: { url: string; variant_id: string | null; is_listing: boolean; sort_order: number }[];
    };
  })[];
}

/** The best image for a variant: its listing shot, then any of its photos, then the product's first. */
export function imageForVariant(
  images: { url: string; variant_id: string | null; is_listing: boolean; sort_order: number }[],
  variantId: string,
  listing = true,
): string {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  return (
    (listing && sorted.find((i) => i.variant_id === variantId && i.is_listing)?.url) ||
    sorted.find((i) => i.variant_id === variantId)?.url ||
    sorted[0]?.url ||
    ''
  );
}
