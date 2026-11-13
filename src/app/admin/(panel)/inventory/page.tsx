import { Empty, Flash, PageHeader, fmtDate } from '@/components/admin/ui';
import { db, must } from '@/lib/supabase/admin';
import { adjustStock } from '../../actions';

export const metadata = { title: 'Inventory' };

interface Row {
  id: string;
  sku: string;
  color_name: string;
  stock: number;
  low_stock_threshold: number;
  products: { name: string; sort_order: number } | null;
}

interface Movement {
  id: string;
  delta: number;
  reason: string;
  note: string;
  actor: string;
  stock_after: number;
  created_at: string;
  order_id: string | null;
  product_variants: { sku: string; color_name: string; products: { name: string } | null } | null;
}

export default async function InventoryPage(props: PageProps<'/admin/inventory'>) {
  const sp = await props.searchParams;
  const focus = typeof sp.variant === 'string' ? sp.variant : '';
  const variants = ((must(
    await db().from('product_variants').select('id, sku, color_name, stock, low_stock_threshold, products(name, sort_order)'),
    'Variants',
  ) as unknown) as Row[]).sort((a, b) => (a.products?.sort_order ?? 0) - (b.products?.sort_order ?? 0) || a.sku.localeCompare(b.sku));

  let mq = db()
    .from('inventory_movements')
    .select('id, delta, reason, note, actor, stock_after, created_at, order_id, product_variants(sku, color_name, products(name))')
    .order('created_at', { ascending: false })
    .limit(100);
  if (/^[0-9a-f-]{36}$/i.test(focus)) mq = mq.eq('variant_id', focus);
  const movements = must(await mq, 'Movements') as unknown as Movement[];
  const ret = focus ? `/admin/inventory?variant=${focus}` : '/admin/inventory';

  return (
    <>
      <PageHeader title="Inventory" eyebrow={`${variants.reduce((s, v) => s + v.stock, 0)} units in stock`} />
      <Flash msg={sp.msg} error={sp.error} />

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th className="!text-right">In stock</th>
              <th>Adjust (+ add / − remove)</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className={v.id === focus ? 'bg-ember/5' : ''}>
                <td>
                  {v.products?.name} · {v.color_name}
                </td>
                <td className="font-mono text-xs">{v.sku}</td>
                <td className={`text-right font-mono tabular-nums ${v.stock === 0 ? 'text-bad' : v.stock <= v.low_stock_threshold ? 'text-warn' : ''}`}>
                  {v.stock}
                </td>
                <td>
                  <form action={adjustStock} className="flex flex-wrap gap-2">
                    <input type="hidden" name="variant_id" value={v.id} />
                    <input type="hidden" name="return" value={ret} />
                    <input name="delta" inputMode="numeric" placeholder="+10" className="input h-8 w-20 font-mono text-xs" required />
                    <select name="reason" className="input h-8 w-32 text-xs" defaultValue="restock">
                      <option value="restock">Restock</option>
                      <option value="correction">Correction</option>
                      <option value="damaged">Damaged</option>
                      <option value="return">Customer return</option>
                    </select>
                    <input name="note" placeholder="Note" className="input h-8 w-40 text-xs" />
                    <button className="btn-outline btn-sm h-8">Apply</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="admin-card mt-6">
        <h2 className="border-b border-ink/10 px-4 py-3 font-medium">{focus ? 'History for this variant' : 'Recent stock movements'}</h2>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Item</th>
                <th>Reason</th>
                <th className="!text-right">Change</th>
                <th className="!text-right">After</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="text-xs text-ink/50">{fmtDate(m.created_at)}</td>
                  <td>
                    {m.product_variants?.products?.name} · {m.product_variants?.color_name}
                    {m.note ? <span className="block text-xs text-ink/50">{m.note}</span> : null}
                  </td>
                  <td className="text-xs">{m.reason.replace('_', ' ')}</td>
                  <td className={`text-right font-mono ${m.delta > 0 ? 'text-ok' : 'text-bad'}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                  <td className="text-right font-mono">{m.stock_after}</td>
                  <td className="text-xs text-ink/50">{m.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!movements.length ? <Empty>No movements yet.</Empty> : null}
        </div>
      </section>
    </>
  );
}
