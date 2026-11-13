import Link from 'next/link';
import { Badge, Empty, PageHeader, Pager, fmtDate, pageRange } from '@/components/admin/ui';
import { PAYMENT_LABELS } from '@/lib/constants';
import { money } from '@/lib/pricing';
import { db, must } from '@/lib/supabase/admin';
import type { Payment } from '@/lib/types';

export const metadata = { title: 'Payments' };

export default async function PaymentsPage(props: PageProps<'/admin/payments'>) {
  const sp = await props.searchParams;
  const status = typeof sp.status === 'string' ? sp.status : '';
  const { page, from, to } = pageRange(sp.page);
  let query = db().from('payments').select('*, orders(number)', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
  if (['pending', 'paid', 'failed', 'cancelled'].includes(status)) query = query.eq('status', status);
  const result = await query;
  const payments = must(result, 'Payments') as (Payment & { orders: { number: string } | null })[];
  const total = result.count ?? payments.length;

  return (
    <>
      <PageHeader title="Payments" eyebrow="Every attempt, with the gateway's raw response" />
      <div className="mb-3 flex gap-1">
        {['', 'paid', 'pending', 'failed', 'cancelled'].map((s) => (
          <Link key={s || 'all'} href={s ? `/admin/payments?status=${s}` : '/admin/payments'} className={`btn-sm btn ${status === s ? 'bg-ink text-bone' : 'border border-ink/15 bg-white'}`}>
            {s || 'All'}
          </Link>
        ))}
      </div>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Order</th>
              <th>Reference</th>
              <th>Method</th>
              <th>Purpose</th>
              <th>Status</th>
              <th className="!text-right">Amount</th>
              <th>Gateway data</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="align-top">
                <td className="text-xs text-ink/50">{fmtDate(p.created_at)}</td>
                <td>
                  <Link href={`/admin/orders/${p.order_id}`} className="font-mono text-xs hover:text-ember-600">
                    {p.orders?.number}
                  </Link>
                </td>
                <td className="font-mono text-xs">{p.reference}</td>
                <td className="text-sm">{PAYMENT_LABELS[p.provider]?.title ?? p.provider}</td>
                <td className="text-sm capitalize">{p.purpose}</td>
                <td>
                  <Badge value={p.status} />
                </td>
                <td className="text-right font-mono tabular-nums">{money(p.amount)}</td>
                <td className="max-w-xs">
                  {p.raw ? (
                    <details>
                      <summary className="text-xs text-ink/50">View</summary>
                      <pre className="mt-2 max-h-60 overflow-auto bg-bone p-2 text-[10px]">{JSON.stringify(p.raw, null, 2)}</pre>
                    </details>
                  ) : (
                    <span className="text-xs text-ink/30">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!payments.length ? <Empty>No payments yet.</Empty> : null}
      </div>
      <Pager path="/admin/payments" params={{ status }} page={page} total={total} />
    </>
  );
}
