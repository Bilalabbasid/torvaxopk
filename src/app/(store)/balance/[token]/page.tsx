import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BalancePay } from '@/components/balance-pay';
import { getSettings } from '@/lib/catalog';
import { availableMethods, getOrderByBalanceToken } from '@/lib/orders';
import { money } from '@/lib/pricing';

export const metadata = { title: 'Pay your balance', robots: { index: false } };

export default async function BalancePage(props: PageProps<'/balance/[token]'>) {
  const { token } = await props.params;
  const order = await getOrderByBalanceToken(token);
  if (!order || order.status === 'cancelled') notFound();
  const settings = await getSettings();

  return (
    <section className="container-x max-w-3xl py-14 lg:py-20">
      <p className="label text-steel-600">Preorder {order.number}</p>
      <h1 className="display mt-4 text-5xl sm:text-6xl">{order.balance_due > 0 ? 'Pay your balance.' : 'All paid.'}</h1>
      <dl className="mt-8 space-y-2 text-sm">
        <div className="flex justify-between text-ink/70">
          <dt>Order total</dt>
          <dd className="font-mono">{money(order.total)}</dd>
        </div>
        <div className="flex justify-between text-ink/70">
          <dt>Already paid</dt>
          <dd className="font-mono">{money(order.amount_paid)}</dd>
        </div>
        <div className="hairline flex justify-between border-t pt-3 text-lg font-medium">
          <dt>Balance due</dt>
          <dd className="font-mono">{money(order.balance_due)}</dd>
        </div>
      </dl>
      {order.balance_due > 0 ? (
        order.payment_status === 'unpaid' ? (
          <p className="mt-8 text-warn">The deposit for this order has not been received yet.</p>
        ) : order.balance_method === 'cod' ? (
          <p className="mt-8 text-ink/70">You chose cash on delivery. Please keep {money(order.balance_due)} ready for the courier.</p>
        ) : (
          <BalancePay token={token} methods={availableMethods(settings, 'balance')} amount={order.balance_due} />
        )
      ) : (
        <Link href={`/order/${order.id}`} className="btn-primary mt-8">
          View order
        </Link>
      )}
    </section>
  );
}
