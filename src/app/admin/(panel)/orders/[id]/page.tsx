import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Flash, PageHeader, fmtDate } from '@/components/admin/ui';
import { PAYMENT_LABELS } from '@/lib/constants';
import { rewardForOrder } from '@/lib/coupons';
import { env } from '@/lib/env';
import { money } from '@/lib/pricing';
import { db, must } from '@/lib/supabase/admin';
import type { OrderEvent, OrderWithItems, Payment } from '@/lib/types';
import { cancelOrder, markRefunded, recordCashPayment, requestBalance, saveOrderNote, updateOrderStatus } from '../../../actions';

export const metadata = { title: 'Order' };

export default async function AdminOrderPage(props: PageProps<'/admin/orders/[id]'>) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const order = must(await db().from('orders').select('*, order_items(*)').eq('id', id).maybeSingle(), 'Order') as OrderWithItems | null;
  if (!order) notFound();
  const [payments, events, reward] = await Promise.all([
    must(await db().from('payments').select('*').eq('order_id', id).order('created_at'), 'Payments') as Payment[],
    must(await db().from('order_events').select('*').eq('order_id', id).order('created_at', { ascending: false }), 'Events') as OrderEvent[],
    rewardForOrder(id),
  ]);

  const cancelled = order.status === 'cancelled';
  const preorder = order.kind === 'preorder';

  return (
    <>
      <PageHeader
        eyebrow={`${preorder ? 'Preorder' : 'Order'} · placed ${fmtDate(order.created_at)}`}
        title={order.number}
        actions={
          <>
            <Badge value={order.kind} />
            <Badge value={order.status} />
            <Badge value={order.payment_status} />
          </>
        }
      />
      <Flash msg={sp.msg} error={sp.error} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="admin-card">
            <h2 className="border-b border-ink/10 px-4 py-3 font-medium">Items</h2>
            <table className="admin-table">
              <tbody>
                {order.order_items.map((item) => (
                  <tr key={item.id}>
                    <td className="w-16">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image_url} alt="" className="aspect-[4/5] w-12 bg-paper object-cover" />
                    </td>
                    <td>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="font-mono text-xs text-ink/50">
                        {item.variant_label} · {item.sku}
                      </p>
                    </td>
                    <td className="font-mono text-xs text-ink/60">
                      {money(item.unit_price)} × {item.quantity}
                      {item.regular_price !== item.unit_price ? <span className="block text-steel line-through">{money(item.regular_price)}</span> : null}
                    </td>
                    <td className="text-right font-mono tabular-nums">{money(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="space-y-1.5 px-4 py-4 text-sm">
              <Row label="Subtotal" value={money(order.subtotal)} />
              {order.discount ? <Row label={`Discount (${order.coupon_code})`} value={`−${money(order.discount)}`} /> : null}
              <Row label="Delivery" value={order.shipping ? money(order.shipping) : 'Free'} />
              <Row label="Total" value={money(order.total)} strong />
              {preorder ? <Row label="Deposit charged" value={money(order.deposit_amount)} /> : null}
              <Row label="Paid" value={money(order.amount_paid)} />
              <Row label="Balance due" value={money(order.balance_due)} strong />
            </dl>
          </section>

          <section className="admin-card">
            <h2 className="border-b border-ink/10 px-4 py-3 font-medium">Payments</h2>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Method</th>
                    <th>Purpose</th>
                    <th>Status</th>
                    <th className="!text-right">Amount</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono text-xs">
                        {p.reference}
                        {p.provider_ref ? <span className="block text-ink/40">{p.provider_ref}</span> : null}
                      </td>
                      <td>{PAYMENT_LABELS[p.provider]?.title ?? p.provider}</td>
                      <td className="capitalize">{p.purpose}</td>
                      <td>
                        <Badge value={p.status} />
                      </td>
                      <td className="text-right font-mono tabular-nums">{money(p.amount)}</td>
                      <td className="text-xs text-ink/50">{fmtDate(p.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!payments.length ? <p className="px-4 py-6 text-sm text-ink/50">No online payments (cash on delivery).</p> : null}
            </div>
          </section>

          <section className="admin-card">
            <h2 className="border-b border-ink/10 px-4 py-3 font-medium">Timeline</h2>
            <ol className="divide-y divide-ink/5">
              {events.map((e) => (
                <li key={e.id} className="flex gap-4 px-4 py-3 text-sm">
                  <span className="w-36 shrink-0 text-xs text-ink/50">{fmtDate(e.created_at)}</span>
                  <span className="flex-1">{e.message}</span>
                  <span className="text-xs text-ink/40">{e.actor}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <section className="admin-card p-5 text-sm">
            <h2 className="font-medium">Customer</h2>
            <p className="mt-3">
              {order.name}
              <br />
              <a href={`mailto:${order.email}`} className="hover:text-ember-600">
                {order.email}
              </a>
              <br />
              <a href={`https://wa.me/${order.phone.replace(/^0/, '92').replace(/\D/g, '')}`} className="hover:text-ember-600" target="_blank">
                {order.phone} (WhatsApp)
              </a>
            </p>
            <p className="mt-3 text-ink/70">
              {order.address_line1}
              {order.address_line2 ? <>, {order.address_line2}</> : null}
              <br />
              {order.city}, {order.province} {order.postal_code}
            </p>
            {order.customer_note ? <p className="mt-3 bg-bone p-3 text-ink/80">“{order.customer_note}”</p> : null}
            {order.customer_id ? (
              <Link href={`/admin/customers/${order.customer_id}`} className="label mt-4 inline-block text-steel-600 hover:text-ink">
                Customer history →
              </Link>
            ) : null}
            <p className="mt-4 text-ink/60">
              Paid with {PAYMENT_LABELS[order.payment_method]?.title}
              {order.balance_method ? ` · balance via ${PAYMENT_LABELS[order.balance_method]?.title}` : ''}
            </p>
            {reward ? (
              <p className="mt-3 border border-ember/40 p-3">
                Launch reward issued: <span className="font-mono">{reward.code}</span> ({reward.percent}%, until {fmtDate(reward.expires_at, false)})
              </p>
            ) : null}
          </section>

          {!cancelled ? (
            <section className="admin-card p-5">
              <h2 className="font-medium">Fulfilment</h2>
              <form action={updateOrderStatus} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={order.id} />
                <label className="block">
                  <span className="field-label">Status</span>
                  <select name="status" defaultValue={order.status} className="input h-10 text-sm">
                    {['pending', 'confirmed', 'processing', 'shipped', 'delivered'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="field-label">Courier</span>
                    <input name="carrier" defaultValue={order.carrier} placeholder="TCS, Leopards…" className="input h-10 text-sm" />
                  </label>
                  <label className="block">
                    <span className="field-label">Tracking no.</span>
                    <input name="tracking_number" defaultValue={order.tracking_number} className="input h-10 text-sm" />
                  </label>
                </div>
                <button className="btn-primary btn-sm w-full">Save (emails customer when shipped)</button>
              </form>
            </section>
          ) : null}

          {!cancelled && order.balance_due > 0 ? (
            <section className="admin-card space-y-3 p-5">
              <h2 className="font-medium">Collect {money(order.balance_due)}</h2>
              {preorder && order.payment_status === 'deposit_paid' ? (
                <form action={requestBalance}>
                  <input type="hidden" name="id" value={order.id} />
                  <button className="btn-ember btn-sm w-full">
                    {order.balance_requested_at ? 'Re-send balance link' : 'Email balance payment link'}
                  </button>
                  {order.balance_requested_at ? <p className="mt-1 text-xs text-ink/50">Requested {fmtDate(order.balance_requested_at)}</p> : null}
                  {order.balance_token ? (
                    <p className="mt-2 text-xs break-all text-ink/50">
                      Link: {env.siteUrl}/balance/{order.balance_token}
                    </p>
                  ) : null}
                </form>
              ) : null}
              <form action={recordCashPayment} className="flex gap-2">
                <input type="hidden" name="id" value={order.id} />
                <select name="method" className="input h-9 flex-1 text-sm">
                  <option value="cod">Cash on delivery received</option>
                  <option value="manual">Bank transfer / other</option>
                </select>
                <button className="btn-outline btn-sm">Record</button>
              </form>
            </section>
          ) : null}

          <section className="admin-card p-5">
            <h2 className="font-medium">Internal note</h2>
            <form action={saveOrderNote} className="mt-3">
              <input type="hidden" name="id" value={order.id} />
              <textarea name="internal_note" defaultValue={order.internal_note} rows={3} className="input text-sm" />
              <button className="btn-outline btn-sm mt-2">Save note</button>
            </form>
          </section>

          <section className="admin-card space-y-3 p-5">
            <h2 className="font-medium text-bad">Danger zone</h2>
            {!cancelled ? (
              <form action={cancelOrder} className="space-y-2">
                <input type="hidden" name="id" value={order.id} />
                <input name="reason" placeholder="Reason (shown in timeline)" className="input h-9 text-sm" />
                <button className="btn btn-sm w-full border border-bad/40 text-bad hover:bg-bad hover:text-bone">Cancel order & return stock</button>
              </form>
            ) : null}
            {order.amount_paid > 0 && order.payment_status !== 'refunded' ? (
              <form action={markRefunded} className="space-y-2">
                <input type="hidden" name="id" value={order.id} />
                <input name="note" placeholder="Refund reference" className="input h-9 text-sm" />
                <button className="btn-outline btn-sm w-full">Mark refunded (after refunding with the provider)</button>
              </form>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-medium' : 'text-ink/70'}`}>
      <dt>{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}
