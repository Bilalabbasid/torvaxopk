import Link from 'next/link';
import { Badge, Empty, Flash, PageHeader } from '@/components/admin/ui';
import { money } from '@/lib/pricing';
import { db, must } from '@/lib/supabase/admin';
import type { Product } from '@/lib/types';

export const metadata = { title: 'Products' };

export default async function ProductsPage(props: PageProps<'/admin/products'>) {
  const sp = await props.searchParams;
  const products = must(
    await db().from('products').select('*, product_variants(*), product_images(*)').order('sort_order'),
    'Products',
  ) as Product[];

  return (
    <>
      <PageHeader
        title="Products"
        eyebrow={`${products.length} products`}
        actions={
          <Link href="/admin/products/new" className="btn-primary btn-sm">
            Add product
          </Link>
        }
      />
      <Flash msg={sp.msg} error={sp.error} />
      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th />
              <th>Product</th>
              <th>Status</th>
              <th>Variants</th>
              <th className="!text-right">Price</th>
              <th className="!text-right">Preorder</th>
              <th className="!text-right">Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const image = p.product_images.find((i) => i.is_listing) ?? p.product_images[0];
              const prices = p.product_variants.map((v) => v.price);
              const pre = p.product_variants.map((v) => v.preorder_price).filter((x): x is number => x != null);
              const stock = p.product_variants.reduce((s, v) => s + v.stock, 0);
              return (
                <tr key={p.id} className="hover:bg-bone/50">
                  <td className="w-16">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {image ? <img src={image.url} alt="" className="aspect-square w-12 bg-paper object-contain" /> : <div className="size-12 bg-paper" />}
                  </td>
                  <td>
                    <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-ember-600">
                      {p.name}
                    </Link>
                    <p className="text-xs text-ink/50">/{p.slug}</p>
                  </td>
                  <td>
                    <Badge value={p.status} />
                  </td>
                  <td className="text-sm">{p.product_variants.map((v) => v.color_name).join(', ') || '—'}</td>
                  <td className="text-right font-mono tabular-nums">{prices.length ? money(Math.min(...prices)) : '—'}</td>
                  <td className="text-right font-mono tabular-nums text-ember-600">{pre.length ? money(Math.min(...pre)) : '—'}</td>
                  <td className={`text-right font-mono tabular-nums ${stock === 0 ? 'text-bad' : ''}`}>{stock}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!products.length ? <Empty>No products yet.</Empty> : null}
      </div>
    </>
  );
}
