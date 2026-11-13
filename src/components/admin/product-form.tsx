import type { Product } from '@/lib/types';
import { saveProduct } from '@/app/admin/actions';

export function ProductForm({ product }: { product?: Product }) {
  return (
    <form action={saveProduct} className="admin-card space-y-4 p-5">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="field-label">Name</span>
          <input name="name" defaultValue={product?.name} required className="input h-10 text-sm" />
        </label>
        <label className="block">
          <span className="field-label">URL slug (blank = from name)</span>
          <input name="slug" defaultValue={product?.slug} className="input h-10 font-mono text-sm" />
        </label>
        <label className="block">
          <span className="field-label">Size label</span>
          <input name="size_label" defaultValue={product?.size_label} placeholder="Cabin, Medium, Set of 3…" className="input h-10 text-sm" />
        </label>
        <label className="block">
          <span className="field-label">Tagline</span>
          <input name="tagline" defaultValue={product?.tagline} className="input h-10 text-sm" />
        </label>
      </div>
      <label className="block">
        <span className="field-label">Description</span>
        <textarea name="description" defaultValue={product?.description} rows={4} className="input text-sm" />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="field-label">Specifications (one per line, “Label: value”)</span>
          <textarea
            name="specs"
            rows={7}
            className="input font-mono text-xs"
            defaultValue={product?.specs.map((s) => `${s.label}: ${s.value}`).join('\n')}
          />
        </label>
        <label className="block">
          <span className="field-label">Features (one per line)</span>
          <textarea name="features" rows={7} className="input text-sm" defaultValue={product?.features.join('\n')} />
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="field-label">Status</span>
          <select name="status" defaultValue={product?.status ?? 'draft'} className="input h-10 w-40 text-sm">
            <option value="active">Active (visible)</option>
            <option value="draft">Draft (hidden)</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="block">
          <span className="field-label">Sort order</span>
          <input name="sort_order" type="number" defaultValue={product?.sort_order ?? 0} className="input h-10 w-24 text-sm" />
        </label>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" name="is_set" defaultChecked={product?.is_set} className="accent-ink" /> This is a bundle / set
        </label>
        <button className="btn-primary btn-sm ml-auto">{product ? 'Save product' : 'Create product'}</button>
      </div>
    </form>
  );
}
