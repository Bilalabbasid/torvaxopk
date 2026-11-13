import Link from 'next/link';

export const metadata = { title: 'Payment problem', robots: { index: false } };

export default function PaymentProblemPage() {
  return (
    <section className="container-x max-w-3xl py-20">
      <h1 className="display text-5xl">We could not confirm your payment.</h1>
      <p className="mt-6 text-lg text-ink/70">
        The payment provider&apos;s response could not be verified. If money left your account, do not worry: contact us with
        the time of payment and we will match it to your order.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/cart" className="btn-primary">
          Back to cart
        </Link>
        <Link href="/contact" className="btn-outline">
          Contact us
        </Link>
      </div>
    </section>
  );
}
