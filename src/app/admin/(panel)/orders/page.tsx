import Link from 'next/link';
import { Badge, Empty, Flash, PageHeader, fmtDate } from '@/components/admin/ui';
import { PAYMENT_LABELS } from '@/lib/constants';
import { money } from '@/lib/pricing';
import { db, must } from '@/lib/supabase/admin';
import type { Order } from '@/lib/types';
import { expireStale, requestAllBalances } from '../../actions';

export const metadata = { title: 'Orders' };

const PAGE = 50;
const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default async function OrdersPage(props: PageProps<'/admin/orders'>) {
  const sp = await props.searchParams;
  const status = typeof sp.status === 'string' ? sp.status : '';
  const kind = typeof sp.kind === 'string' ? sp.kind : '';
  const payment = typeof sp.payment === 'string' ? sp.payment : '';
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const page = Math.max(1, Number(sp.page) || 1);

  let query = db()
    .from('orders')
    .select('id, number, name, email, phone, city, kind, status, payment_status, payment_method, total, balance_due, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (STATUSES.includes(status)) query = query.eq('status', status);
  if (kind === 'preorder' || kind === 'standard') query = query.eq('kind', kind);
  if (payment) query = query.eq('payment_status', payment);
  if (q) {
    const safe = q.replace(/[%,()]/g, '');
    query = query.or(`number.ilike.%${safe}%,email.ilike.%${safe}%,name.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  const result = await query;
  const orders = must(result, 'Orders') as Order[];
  const total = result.count ?? 0;

  const link = (patch: Record<string, string>) => {
    const params = new URLSearchParams({ ...(status && { status }), ...(kind && { kind }), ...(payment && { payment }), ...(q && { q }), ...patch });
    for (const [k, v] of [...params]) if (!v) params.delete(k);
    return `/admin/orders?${params}`;
  };

  return (
    <>
      <PageHeader
        title="Orders"
        eyebrow={`${total} order${total === 1 ? '' : 's'}`}
        actions={
          <>
            <a href="/admin/export/orders.csv" className="btn-outline btn-sm">
              Export CSV
            </a>
            <form action={requestAllBalances}>
              <button className="btn-outline btn-sm" title="Email every paid-deposit preorder its balance link">
                Request all preorder balances
              </button>
            </form>
            <form action={expireStale}>
              <button className="btn-outline btn-sm" title="Cancel online orders unpaid for 2+ hours and release stock">
                Clear abandoned
              </button>
            </form>
          </>
        }
      />
      <Flash msg={sp.msg} error={sp.error} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="flex gap-2" action="/admin/orders">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          {kind ? <input type="hidden" name="kind" value={kind} /> : null}
          <input name="q" defaultValue={q} placeholder="Order no., name, email, phone" className="input h-9 w-72 text-sm" />
          <button className="btn-primary btn-sm">Search</button>
        </form>
        <div className="flex flex-wrap gap-1">
          {['', ...STATUSES].map((s) => (
            <Link key={s || 'all'} href={link({ status: s, page: '' })} className={`btn-sm btn ${status === s ? 'bg-ink text-bone' : 'border border-ink/15 bg-white'}`}>
              {s || 'All'}
            </Link>
          ))}
        </div>
        <div className="flex gap-1">
          {['', 'preorder', 'standard'].map((k) => (
            <Link key={k || 'any'} href={link({ kind: k, page: '' })} className={`btn-sm btn ${kind === k ? 'bg-ember text-ink' : 'border border-ink/15 bg-white'}`}>
              {k || 'Any type'}
            </Link>
          ))}
        </div>
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Status</th>
              <th>Payment</th>
              <th className="!text-right">Total</th>
              <th className="!text-right">Due</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-bone/50">
                <td>
                  <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-medium hover:text-ember-600">
                    {o.number}
                  </Link>
                </td>
                <td className="text-xs whitespace-nowrap text-ink/60">{fmtDate(o.created_at)}</td>
                <td>
                  <p>{o.name}</p>
                  <p className="text-xs text-ink/50">
                    {o.city} · {o.phone}
                  </p>
                </td>
                <td>
                  <Badge value={o.kind} />
                </td>
                <td>
                  <Badge value={o.status} />
                </td>
                <td>
                  <Badge value={o.payment_status} />
                  <p className="mt-1 text-xs text-ink/50">{PAYMENT_LABELS[o.payment_method]?.title}</p>
                </td>
                <td className="text-right font-mono tabular-nums">{money(o.total)}</td>
                <td className={`text-right font-mono tabular-nums ${o.balance_due > 0 && o.status !== 'cancelled' ? 'text-warn' : 'text-ink/40'}`}>
                  {o.status === 'cancelled' ? '—' : money(o.balance_due)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length ? <Empty>No orders match.</Empty> : null}
      </div>

      {total > PAGE ? (
        <div className="mt-4 flex justify-between text-sm">
          {page > 1 ? <Link href={link({ page: String(page - 1) })}>← Newer</Link> : <span />}
          <span className="text-ink/50">
            Page {page} of {Math.ceil(total / PAGE)}
          </span>
          {page * PAGE < total ? <Link href={link({ page: String(page + 1) })}>Older →</Link> : <span />}
        </div>
      ) : null}
    </>
  );
}
