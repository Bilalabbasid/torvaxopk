import { notFound, redirect } from 'next/navigation';
import { AutoSubmit } from '@/components/auto-submit';
import { Logo } from '@/components/brand';
import { getPaymentByReference } from '@/lib/orders';
import { beginPayment } from '@/lib/payments';
import { money } from '@/lib/pricing';

export const metadata = { title: 'Redirecting to payment', robots: { index: false } };

/** Hands the customer to the gateway: a redirect, or an auto-submitting signed form. */
export default async function PayPage(props: PageProps<'/pay/[reference]'>) {
  const { reference } = await props.params;
  const payment = await getPaymentByReference(reference);
  if (!payment) notFound();
  if (payment.status !== 'pending') redirect(`/order/${payment.order_id}`);

  let start;
  let failure: string | null = null;
  try {
    start = await beginPayment(payment, payment.orders);
  } catch (error) {
    console.error('beginPayment', error);
    failure = error instanceof Error ? error.message : 'Payment could not be started.';
  }
  if (start?.kind === 'redirect') redirect(start.url);

  return (
    <main className="grid min-h-svh place-items-center bg-paper p-6">
      <div className="w-full max-w-md text-center">
        <Logo className="mx-auto h-5 w-auto" />
        {failure ? (
          <>
            <p className="mt-10 text-lg font-medium">We could not open the payment page.</p>
            <p className="mt-2 text-sm text-ink/60">{failure}</p>
            <a href={`/order/${payment.order_id}`} className="btn-primary mt-8">
              Back to your order
            </a>
          </>
        ) : (
          <>
            <p className="mt-10 text-lg font-medium">Taking you to secure payment…</p>
            <p className="mt-2 font-mono text-sm text-ink/60">
              {payment.orders.number} · {money(payment.amount)}
            </p>
            {start?.kind === 'form' ? <AutoSubmit action={start.action} fields={start.fields} /> : null}
          </>
        )}
      </div>
    </main>
  );
}
