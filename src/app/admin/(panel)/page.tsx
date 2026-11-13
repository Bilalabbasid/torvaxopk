import Link from 'next/link';
import { Badge, Empty, Flash, PageHeader, Stat, fmtDate } from '@/components/admin/ui';
import { getSettings } from '@/lib/catalog';
import { env, gatewayConfigured } from '@/lib/env';
import { money } from '@/lib/pricing';
import { db, must } from '@/lib/supabase/admin';
import type { Order } from '@/lib/types';
import { setSaleMode } from '../actions';

export const metadata = { title: 'Dashboard' };

interface Stats {
  collected: number;
  deposits: number;
  preorders: number;
  outstanding: number;
  cod_due: number;
  to_ship: number;
  today_count: number;
  today_value: number;
  rewards: number;
  low_stock: number;
}

export default async function Dashboard(props: PageProps<'/admin'>) {
  const sp = await props.searchParams;
  const settings = await getSettings();
  const [stats, orders, variants] = await Promise.all([
    must(await db().rpc('dashboard_stats'), 'Stats') as Stats,
    must(
      await db()
        .from('orders')
        .select('id, number, name, kind, status, total, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
      'Orders',
    ) as Order[],
    (must(await db().from('product_variants').select('id, sku, color_name, stock, low_stock_threshold, products(name)'), 'Variants') as unknown) as {
      id: string;
      sku: string;
      color_name: string;
      stock: number;
      low_stock_threshold: number;
      products: { name: string } | null;
    }[],
  ]);
  const lowStock = variants.filter((v) => v.stock <= v.low_stock_threshold).sort((a, b) => a.stock - b.stock);

  const checklist = [
    { ok: env.paymentsMode === 'live', label: 'Real payments on (PAYMENTS_MODE=live)' },
    { ok: gatewayConfigured('safepay'), label: 'Safepay keys set' },
    { ok: gatewayConfigured('jazzcash'), label: 'JazzCash merchant credentials set' },
    { ok: gatewayConfigured('easypaisa'), label: 'Easypaisa store credentials set' },
    { ok: Boolean(env.resendApiKey && !env.resendApiKey.startsWith('PLACEHOLDER')), label: 'Order emails configured (Resend)' },
    { ok: !settings.store_address.startsWith('PLACEHOLDER'), label: 'Store address filled in' },
    { ok: false, label: 'Policy pages reviewed (src/content/pages.ts)' },
  ];

  return (
    <>
      <PageHeader
        eyebrow={settings.store_name}
        title="Dashboard"
        actions={
          <form action={setSaleMode}>
            <input type="hidden" name="return" value="/admin" />
            <input type="hidden" name="mode" value={settings.sale_mode === 'live' ? 'preorder' : 'live'} />
            <button className={settings.sale_mode === 'live' ? 'btn-outline btn-sm' : 'btn-ember btn-sm'}>
              {settings.sale_mode === 'live' ? 'Switch back to preorder' : 'Go live: start the sale'}
            </button>
          </form>
        }
      />
      <Flash msg={sp.msg} error={sp.error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Collected" value={money(stats.collected)} hint="All paid payments" href="/admin/payments" />
        <Stat label="Orders today" value={String(stats.today_count)} hint={`${money(stats.today_value)} value`} href="/admin/orders" />
        <Stat label="To ship" value={String(stats.to_ship)} hint="Confirmed or processing" href="/admin/orders?status=confirmed" />
        <Stat label="Launch rewards issued" value={String(stats.rewards)} href="/admin/discounts?source=launch_reward" />
        <Stat label="Preorders" value={String(stats.preorders)} hint={`${money(stats.deposits)} in deposits`} href="/admin/orders?kind=preorder" />
        <Stat label="Preorder balance outstanding" value={money(stats.outstanding)} href="/admin/orders?kind=preorder" />
        <Stat label="Cash on delivery due" value={money(stats.cod_due)} />
        <Stat label="Low stock variants" value={String(stats.low_stock)} href="/admin/inventory" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <section className="admin-card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <h2 className="font-medium">Recent orders</h2>
            <Link href="/admin/orders" className="label text-steel-600 hover:text-ink">
              All orders
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-bone/50">
                    <td>
                      <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs hover:text-ember-600">
                        {o.number}
                      </Link>
                    </td>
                    <td>{o.name}</td>
                    <td>
                      <Badge value={o.kind} />
                    </td>
                    <td>
                      <Badge value={o.status} />
                    </td>
                    <td className="text-right font-mono tabular-nums">{money(o.total)}</td>
                    <td className="text-xs text-ink/50">{fmtDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!orders.length ? <Empty>No orders yet.</Empty> : null}
          </div>
        </section>

        <div className="space-y-6">
          <section className="admin-card p-5">
            <h2 className="font-medium">Launch checklist</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {checklist.map((c) => (
                <li key={c.label} className="flex gap-3">
                  <span className={c.ok ? 'text-ok' : 'text-warn'}>{c.ok ? '✓' : '○'}</span>
                  <span className={c.ok ? 'text-ink/60' : ''}>{c.label}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="admin-card p-5">
            <h2 className="font-medium">Low stock</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {lowStock.slice(0, 8).map((v) => (
                <li key={v.id} className="flex justify-between gap-3">
                  <span>
                    {v.products?.name} · {v.color_name}
                  </span>
                  <span className={`font-mono ${v.stock === 0 ? 'text-bad' : 'text-warn'}`}>{v.stock}</span>
                </li>
              ))}
              {!lowStock.length ? <li className="text-ink/50">All variants are stocked.</li> : null}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
