import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClearCart } from '@/components/clear-cart';
import { getSettings } from '@/lib/catalog';
import { PAYMENT_LABELS } from '@/lib/constants';
import { rewardForOrder } from '@/lib/coupons';
import { money } from '@/lib/pricing';
import { db, must } from '@/lib/supabase/admin';
import type { OrderWithItems } from '@/lib/types';

export const metadata = { title: 'Your order', robots: { index: false } };

const STATUS_COPY: Record<string, string> = {
  pending: 'Awaiting payment',
  confirmed: 'Confirmed',
  processing: 'Being prepared',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default async function OrderPage(props: PageProps<'/order/[id]'>) {
  const { id } = await props.params;
  const query = await props.searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const order = must(
    await db().from('orders').select('*, order_items(*)').eq('id', id).maybeSingle(),
    'Load order',
  ) as OrderWithItems | null;
  if (!order) notFound();
  const [reward, settings] = await Promise.all([rewardForOrder(order.id), getSettings()]);

  const failed = query.payment === 'failed' && order.status === 'cancelled';
  const pendingPayment = query.payment === 'pending' || (order.status === 'pending' && !failed);
  const confirmed = order.status !== 'pending' && order.status !== 'cancelled';
  const preorder = order.kind === 'preorder';

  let headline = 'Thank you.';
  let sub = `${preorder ? 'Preorder' : 'Order'} ${order.number}`;
  if (failed) {
    headline = 'Payment not completed.';
    sub = 'Nothing was charged. Your cart is still saved, so you can try again with another method.';
  } else if (pendingPayment) {
    headline = 'Waiting for payment.';
    sub = 'We have not received confirmation from the payment provider yet. This page updates when it arrives.';
  } else if (order.status === 'cancelled') {
    headline = 'Order cancelled.';
  }

  return (
    <section className="container-x max-w-5xl py-14 lg:py-20">
      {confirmed ? <ClearCart /> : null}
      <p className="label text-steel-600">
        {order.number} · {STATUS_COPY[order.status]}
      </p>
      <h1 className="display mt-4 text-5xl sm:text-7xl">{headline}</h1>
      <p className="mt-5 max-w-2xl text-lg text-ink/70">{sub}</p>

      {failed ? (
        <Link href="/checkout" className="btn-primary mt-8">
          Try again
        </Link>
      ) : null}

      {confirmed && preorder ? (
        <div className="mt-10 bg-ink p-6 text-bone sm:p-8">
          <p className="label text-ember">Preorder confirmed</p>
          <p className="mt-3 text-xl">
            Deposit received: {money(order.amount_paid)}. {order.balance_due > 0 ? `Balance of ${money(order.balance_due)} due when it ships.` : 'Paid in full.'}
          </p>
          {order.balance_due > 0 && order.balance_requested_at && order.balance_token ? (
            <Link href={`/balance/${order.balance_token}`} className="btn-ember mt-6">
              Pay the balance now
            </Link>
          ) : order.balance_due > 0 ? (
            <p className="mt-3 text-sm text-bone/65">We will email {order.email} a secure link to pay the balance before dispatch.</p>
          ) : null}
          {query.balance === 'cod' ? <p className="mt-3 text-sm text-bone/80">Cash on delivery selected for the balance.</p> : null}
        </div>
      ) : null}

      {reward ? (
        <div className="mt-10 border border-ember p-6 sm:p-8">
          <p className="label text-ember-600">Your launch-buyer reward</p>
          <p className="mt-3 text-xl">
            {reward.percent}% off everything on torvaxo.pk until{' '}
            {reward.expires_at ? new Date(reward.expires_at).toLocaleDateString('en-GB', { dateStyle: 'long' }) : 'further notice'}.
          </p>
          <p className="mt-5 inline-block bg-ink px-5 py-3 font-mono text-2xl tracking-[0.08em] text-bone">{reward.code}</p>
          <p className="mt-3 text-sm text-ink/60">Tied to {order.email}. We have emailed it to you too.</p>
        </div>
      ) : null}

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        <div>
          <p className="label mb-4 text-steel-600">Items</p>
          <ul className="space-y-4">
            {order.order_items.map((item) => (
              <li key={item.id} className="flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_url} alt="" className="aspect-[4/5] w-16 bg-paper object-cover" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-ink/60">
                    {item.variant_label} × {item.quantity}
                  </p>
                </div>
                <span className="font-mono text-sm tabular-nums">{money(item.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="hairline mt-6 space-y-2 border-t pt-4 text-sm">
            <Row label="Subtotal" value={money(order.subtotal)} />
            {order.discount ? <Row label={`Code ${order.coupon_code}`} value={`−${money(order.discount)}`} /> : null}
            <Row label="Delivery" value={order.shipping ? money(order.shipping) : 'Free'} />
            <Row label="Total" value={money(order.total)} strong />
            <Row label="Paid" value={money(order.amount_paid)} />
            {order.balance_due > 0 && order.status !== 'cancelled' ? (
              <Row label={order.payment_method === 'cod' || order.balance_method === 'cod' ? 'Due on delivery' : 'Balance due'} value={money(order.balance_due)} strong />
            ) : null}
          </dl>
        </div>
        <div className="space-y-8 text-sm">
          <div>
            <p className="label mb-3 text-steel-600">Delivery to</p>
            <p>
              {order.name}
              <br />
              {order.address_line1}
              {order.address_line2 ? (
                <>
                  <br />
                  {order.address_line2}
                </>
              ) : null}
              <br />
              {order.city}, {order.province} {order.postal_code}
              <br />
              {order.phone}
            </p>
          </div>
          <div>
            <p className="label mb-3 text-steel-600">Payment</p>
            <p>{PAYMENT_LABELS[order.payment_method]?.title}</p>
          </div>
          {order.tracking_number ? (
            <div>
              <p className="label mb-3 text-steel-600">Tracking</p>
              <p>
                {order.carrier} {order.tracking_number}
              </p>
            </div>
          ) : null}
          <p className="text-ink/60">
            Questions? Email {settings.store_email} or WhatsApp {settings.store_whatsapp} with your order number.
          </p>
        </div>
      </div>
    </section>
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
