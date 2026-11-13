import { notFound } from 'next/navigation';
import { Logo } from '@/components/brand';
import { PAYMENT_LABELS } from '@/lib/constants';
import { getPaymentByReference } from '@/lib/orders';
import { paymentsAreMock } from '@/lib/payments';
import { mockSignature } from '@/lib/payments/mock';
import { money } from '@/lib/pricing';

export const metadata = { title: 'Test payment', robots: { index: false } };

/** Stand-in for the real gateway page while PAYMENTS_MODE=mock. */
export default async function MockGatewayPage(props: PageProps<'/pay/mock/[reference]'>) {
  const { reference } = await props.params;
  if (!paymentsAreMock()) notFound();
  const payment = await getPaymentByReference(reference);
  if (!payment) notFound();

  const option = (outcome: 'approve' | 'decline', label: string, cls: string) => (
    <form method="POST" action="/api/payments/mock/return">
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="outcome" value={outcome} />
      <input type="hidden" name="sig" value={mockSignature(reference, outcome)} />
      <button className={`${cls} w-full`} disabled={payment.status !== 'pending'}>
        {label}
      </button>
    </form>
  );

  return (
    <main className="grid min-h-svh place-items-center bg-ink p-6 text-bone">
      <div className="w-full max-w-md border border-bone/15 bg-ink-800 p-8">
        <Logo className="h-4 w-auto text-bone" />
        <p className="label mt-8 text-ember">Test gateway · no real money</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">{PAYMENT_LABELS[payment.provider]?.title ?? payment.provider}</h1>
        <dl className="mt-6 space-y-2 text-sm text-bone/70">
          <div className="flex justify-between">
            <dt>Order</dt>
            <dd className="font-mono">{payment.orders.number}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Purpose</dt>
            <dd className="capitalize">{payment.purpose}</dd>
          </div>
          <div className="flex justify-between text-lg text-bone">
            <dt>Amount</dt>
            <dd className="font-mono">{money(payment.amount)}</dd>
          </div>
        </dl>
        {payment.status !== 'pending' ? <p className="mt-6 text-sm text-warn">This payment is already {payment.status}.</p> : null}
        <div className="mt-8 space-y-3">
          {option('approve', 'Approve payment', 'btn-ember')}
          {option('decline', 'Decline payment', 'btn border border-bone/20 text-bone hover:border-bone')}
        </div>
      </div>
    </main>
  );
}
