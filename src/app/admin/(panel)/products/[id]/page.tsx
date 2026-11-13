import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/admin/product-form';
import { Flash, PageHeader } from '@/components/admin/ui';
import { db, must } from '@/lib/supabase/admin';
import type { Product, Variant } from '@/lib/types';
import { deleteImage, deleteVariant, saveVariant, updateImage, uploadImage } from '../../../actions';

export const metadata = { title: 'Edit product' };

export default async function EditProductPage(props: PageProps<'/admin/products/[id]'>) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const product = must(
    await db().from('products').select('*, product_variants(*), product_images(*)').eq('id', id).maybeSingle(),
    'Product',
  ) as Product | null;
  if (!product) notFound();
  product.product_variants.sort((a, b) => a.sort_order - b.sort_order);
  product.product_images.sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <PageHeader
        eyebrow="Product"
        title={product.name}
        actions={
          <>
            <Link href={`/products/${product.slug}`} target="_blank" className="btn-outline btn-sm">
              View in store ↗
            </Link>
            <Link href="/admin/products" className="btn-outline btn-sm">
              All products
            </Link>
          </>
        }
      />
      <Flash msg={sp.msg} error={sp.error} />
      <ProductForm product={product} />

      <section className="admin-card mt-6">
        <div className="border-b border-ink/10 px-4 py-3">
          <h2 className="font-medium">Colours, prices & stock</h2>
          <p className="text-xs text-ink/50">
            Prices in whole rupees. “Preorder” is charged while the store is in preorder mode; “Compare at” is shown struck through once
            live. Change stock on the Inventory page so every change is logged.
          </p>
        </div>
        <div className="divide-y divide-ink/5">
          {product.product_variants.map((v) => (
            <VariantRow key={v.id} productId={product.id} variant={v} />
          ))}
          <VariantRow productId={product.id} />
        </div>
      </section>

      <section className="admin-card mt-6">
        <div className="border-b border-ink/10 px-4 py-3">
          <h2 className="font-medium">Photos</h2>
          <p className="text-xs text-ink/50">“Listing” photos show on shop cards. Photos linked to a colour show when that colour is picked.</p>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {product.product_images.map((img) => (
            <div key={img.id} className="border border-ink/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt} className="aspect-[4/3] w-full bg-paper object-contain" />
              <form action={updateImage} className="space-y-2 p-3 text-xs">
                <input type="hidden" name="id" value={img.id} />
                <input type="hidden" name="product_id" value={product.id} />
                <input name="alt" defaultValue={img.alt} placeholder="Alt text" className="input h-8 text-xs" />
                <div className="flex gap-2">
                  <select name="variant_id" defaultValue={img.variant_id ?? ''} className="input h-8 flex-1 text-xs">
                    <option value="">All colours</option>
                    {product.product_variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.color_name}
                      </option>
                    ))}
                  </select>
                  <input name="sort_order" type="number" defaultValue={img.sort_order} className="input h-8 w-16 text-xs" title="Order" />
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="is_listing" defaultChecked={img.is_listing} className="accent-ink" /> Listing photo
                </label>
                <button className="btn-outline btn-sm h-8 w-full">Update</button>
              </form>
              <form action={deleteImage} className="px-3 pb-3">
                <input type="hidden" name="id" value={img.id} />
                <input type="hidden" name="product_id" value={product.id} />
                <button className="text-xs text-bad hover:underline">Delete photo</button>
              </form>
            </div>
          ))}
        </div>
        <form action={uploadImage} className="flex flex-wrap items-end gap-3 border-t border-ink/10 p-4 text-sm">
          <input type="hidden" name="product_id" value={product.id} />
          <label className="block">
            <span className="field-label">Upload photo</span>
            <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif" required className="text-sm" />
          </label>
          <label className="block">
            <span className="field-label">Colour</span>
            <select name="variant_id" className="input h-10 text-sm">
              <option value="">All colours</option>
              {product.product_variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.color_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Alt text</span>
            <input name="alt" className="input h-10 text-sm" />
          </label>
          <label className="flex h-10 items-center gap-2">
            <input type="checkbox" name="is_listing" className="accent-ink" /> Listing
          </label>
          <button className="btn-primary btn-sm h-10">Upload</button>
        </form>
      </section>
    </>
  );
}

function VariantRow({ productId, variant }: { productId: string; variant?: Variant }) {
  return (
    <div className="p-4">
      <form action={saveVariant} className="grid grid-cols-2 items-end gap-2 md:grid-cols-4 xl:grid-cols-[1.4fr_1fr_60px_1fr_1fr_1fr_80px_auto]">
        <input type="hidden" name="product_id" value={productId} />
        {variant ? <input type="hidden" name="id" value={variant.id} /> : null}
        <label className="block">
          <span className="field-label">{variant ? 'SKU' : 'New colour · SKU'}</span>
          <input name="sku" defaultValue={variant?.sku} required className="input h-9 font-mono text-xs" />
        </label>
        <label className="block">
          <span className="field-label">Colour</span>
          <input name="color_name" defaultValue={variant?.color_name} required className="input h-9 text-sm" />
        </label>
        <label className="block">
          <span className="field-label">Swatch</span>
          <input name="color_hex" type="color" defaultValue={variant?.color_hex ?? '#141416'} className="h-9 w-full border border-ink/15" />
        </label>
        <label className="block">
          <span className="field-label">Price (Rs)</span>
          <input name="price" inputMode="numeric" defaultValue={variant?.price} required className="input h-9 font-mono text-sm" />
        </label>
        <label className="block">
          <span className="field-label">Preorder (Rs)</span>
          <input name="preorder_price" inputMode="numeric" defaultValue={variant?.preorder_price ?? ''} className="input h-9 font-mono text-sm" />
        </label>
        <label className="block">
          <span className="field-label">Compare at</span>
          <input name="compare_at" inputMode="numeric" defaultValue={variant?.compare_at ?? ''} className="input h-9 font-mono text-sm" />
        </label>
        {variant ? (
          <div>
            <span className="field-label">Stock</span>
            <Link href={`/admin/inventory?variant=${variant.id}`} className={`block py-2 font-mono text-sm ${variant.stock === 0 ? 'text-bad' : ''}`}>
              {variant.stock} →
            </Link>
          </div>
        ) : (
          <label className="block">
            <span className="field-label">Stock</span>
            <input name="stock" inputMode="numeric" defaultValue={0} className="input h-9 font-mono text-sm" />
          </label>
        )}
        <div className="flex gap-2">
          <input type="hidden" name="sort_order" value={variant?.sort_order ?? 99} />
          <input type="hidden" name="low_stock_threshold" value={variant?.low_stock_threshold ?? 5} />
          <button className={variant ? 'btn-outline btn-sm h-9' : 'btn-primary btn-sm h-9'}>{variant ? 'Save' : 'Add'}</button>
        </div>
      </form>
      {variant ? (
        <form action={deleteVariant} className="mt-1 text-right">
          <input type="hidden" name="id" value={variant.id} />
          <input type="hidden" name="product_id" value={productId} />
          <button className="text-xs text-ink/40 hover:text-bad">Remove colour</button>
        </form>
      ) : null}
    </div>
  );
}
