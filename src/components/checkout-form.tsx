'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { placeOrderAction } from '@/app/actions';
import { useCart } from '@/lib/cart-store';
import { PAYMENT_LABELS, PROVINCES } from '@/lib/constants';
import { money } from '@/lib/pricing';
import type { PaymentMethod } from '@/lib/types';
import { Chevrons } from './brand';
import { TotalsTable } from './order-summary';
import { useQuote } from './use-quote';

const FIELDS = ['email', 'name', 'phone', 'address_line1', 'address_line2', 'city', 'province', 'postal_code', 'customer_note'] as const;
type Field = (typeof FIELDS)[number];

export function CheckoutForm({ testMode }: { testMode: boolean }) {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const [form, setForm] = useState<Record<Field, string>>(() => Object.fromEntries(FIELDS.map((f) => [f, ''])) as Record<Field, string>);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { quote, loading, empty } = useQuote(coupon, coupon ? form.email : '');

  const methods = quote?.paymentMethods ?? [];
  const chosen = method && methods.includes(method) ? method : null;
  const preorder = quote?.saleMode === 'preorder' && (quote?.totals.dueLater ?? 0) > 0;

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: '' }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!chosen) {
      setFormError('Choose how you want to pay.');
      return;
    }
    startTransition(async () => {
      const result = await placeOrderAction({ ...form, payment_method: chosen, coupon, cart: lines });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (result.next.startsWith('/pay/')) {
        // Full navigation: the next page posts to the gateway. The cart is kept until payment succeeds,
        // so a declined payment can be retried; the order page clears it once the order is confirmed.
        window.location.assign(result.next);
      } else {
        clear();
        router.push(result.next);
      }
    });
  }

  // Progress at a glance: a step lights up once its required fields are filled.
  const filled = (...fields: Field[]) => fields.every((f) => form[f].trim().length > 1);
  const steps = [
    { label: 'Contact', done: /.+@.+\..+/.test(form.email) && form.phone.replace(/\D/g, '').length >= 10 },
    { label: 'Delivery', done: filled('name', 'address_line1', 'city') && Boolean(form.province) },
    { label: 'Payment', done: Boolean(chosen) },
  ];
  const afterDiscount = quote ? quote.totals.subtotal - quote.totals.discount : 0;
  const toFreeDelivery = quote && quote.freeShippingFrom > 0 ? quote.freeShippingFrom - afterDiscount : 0;

  const summary = quote ? (
    <>
      <ul className="mb-6 space-y-4">
        {quote.lines.map((l) => (
          <li key={l.key} className="flex gap-4 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.image} alt="" className="aspect-[4/5] w-14 bg-paper object-contain" />
            <div className="flex-1">
              <p className="font-medium">{l.productName}</p>
              <p className="text-ink/60">
                {l.variantLabel} × {l.quantity}
              </p>
            </div>
            <span className="font-mono tabular-nums">{money(l.lineTotal)}</span>
          </li>
        ))}
      </ul>
      {quote.problems.map((p) => (
        <p key={p} className="mb-3 text-sm text-warn">
          {p}
        </p>
      ))}

      <div className="hairline mb-5 border-t pt-5">
        <span className="field-label">Discount code</span>
        <div className="flex gap-2">
          <input
            className="input h-10 uppercase"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            placeholder="TORVAXO-XXXXXX"
            aria-invalid={coupon && quote.couponError ? true : undefined}
          />
          {coupon ? (
            <button
              type="button"
              className="btn-outline btn-sm h-10"
              onClick={() => {
                setCoupon('');
                setCouponInput('');
              }}
            >
              Remove
            </button>
          ) : (
            <button type="button" className="btn-outline btn-sm h-10" onClick={() => setCoupon(couponInput.trim())} disabled={!couponInput.trim()}>
              Apply
            </button>
          )}
        </div>
        {coupon && quote.couponError ? <p className="mt-1 text-xs text-bad">{quote.couponError}</p> : null}
        {coupon && quote.coupon ? <p className="mt-1 text-xs text-ok">{quote.coupon.percent}% off applied.</p> : null}
      </div>

      <TotalsTable quote={quote} />

      {toFreeDelivery > 0 ? (
        <p className="hairline mt-5 border-t pt-4 text-[13px] text-ink/70">
          Add {money(toFreeDelivery)} more and delivery is free.{' '}
          <Link href="/shop" className="underline underline-offset-4 hover:text-ember-600">
            Keep shopping
          </Link>
        </p>
      ) : null}
      <ul className="hairline mt-5 space-y-2 border-t pt-4 text-[13px] text-ink/70">
        {['German quality, built to EU standards', '7 days to return it', '2-year warranty, wheels you replace yourself'].map((line) => (
          <li key={line} className="flex items-center gap-2.5">
            <svg viewBox="0 0 44.88 100" className="h-2.5 w-auto shrink-0 text-ember" fill="currentColor" aria-hidden="true">
              <polygon points="0,0 14,0 44.88,50 14,100 0,100 30.88,50" />
            </svg>
            {line}
          </li>
        ))}
      </ul>
    </>
  ) : null;

  if (empty) {
    return (
      <section className="container-x py-20">
        <h1 className="display text-5xl">Checkout</h1>
        <p className="mt-6 text-ink/70">Your cart is empty.</p>
        <Link href="/shop" className="btn-primary mt-6">
          Shop the series
        </Link>
      </section>
    );
  }

  const input = (field: Field, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        className="input"
        name={field}
        value={form[field]}
        onChange={set(field)}
        aria-invalid={errors[field] ? true : undefined}
        {...props}
      />
      {errors[field] ? <span className="mt-1 block text-xs text-bad">{errors[field]}</span> : null}
    </label>
  );

  return (
    <form onSubmit={submit} className="container-x grid gap-12 py-12 lg:grid-cols-12 lg:py-16" noValidate>
      <div className="lg:col-span-7">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <h1 className="display text-5xl sm:text-6xl">{preorder ? 'Preorder checkout' : 'Checkout'}</h1>
          <ol className="flex items-center gap-3" aria-label="Checkout progress">
            {steps.map((step, i) => (
              <li key={step.label} className="flex items-center gap-3">
                {i ? (
                  <svg
                    viewBox="0 0 44.88 100"
                    className={`h-3 w-auto transition-colors duration-300 ${steps[i - 1].done ? 'text-ember' : 'text-ink/15'}`}
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <polygon points="0,0 14,0 44.88,50 14,100 0,100 30.88,50" />
                  </svg>
                ) : null}
                <span className={`label flex items-center gap-2 text-[10px] transition-colors duration-300 ${step.done ? 'text-ink' : 'text-steel'}`}>
                  <span
                    className={`grid size-4 place-items-center rounded-full text-[9px] transition-colors duration-300 ${
                      step.done ? 'bg-ink text-bone' : 'bg-ink/10 text-ink/40'
                    }`}
                  >
                    {step.done ? '✓' : i + 1}
                  </span>
                  {step.label}
                  <span className="sr-only">{step.done ? ' (complete)' : ''}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Small screens: the summary is folded away at the top instead of hidden below the form. */}
        {quote ? (
          <details className="hairline group mt-8 border-y lg:hidden">
            <summary className="flex list-none items-center justify-between py-4 text-sm [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <span className="transition-transform duration-300 group-open:rotate-45">+</span>
                <span className="group-open:hidden">Show order summary</span>
                <span className="hidden group-open:inline">Hide order summary</span>
              </span>
              <span className="font-mono text-base tabular-nums">{money(quote.totals.total)}</span>
            </summary>
            <div className={`pb-6 ${loading ? 'opacity-60' : ''}`}>{summary}</div>
          </details>
        ) : null}
        {testMode ? (
          <p className="mt-6 border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn">
            Test mode: payments go to a built-in test screen. No money is taken. Set PAYMENTS_MODE=live with real gateway keys to
            go live.
          </p>
        ) : null}
        {formError ? <p className="mt-6 border border-bad/30 bg-bad/5 px-4 py-3 text-sm text-bad" role="alert">{formError}</p> : null}

        <fieldset className="mt-10 space-y-4">
          <legend className="label mb-4 text-steel-600">01 — Contact</legend>
          {input('email', 'Email', { type: 'email', autoComplete: 'email', required: true })}
          {input('phone', 'Mobile number', { type: 'tel', autoComplete: 'tel', placeholder: '0300 1234567', required: true })}
        </fieldset>

        <fieldset className="mt-10 space-y-4">
          <legend className="label mb-4 text-steel-600">02 — Delivery address</legend>
          {input('name', 'Full name', { autoComplete: 'name', required: true })}
          {input('address_line1', 'Address', { autoComplete: 'address-line1', placeholder: 'House / street / block', required: true })}
          {input('address_line2', 'Area, landmark (optional)', { autoComplete: 'address-line2' })}
          <div className="grid gap-4 sm:grid-cols-3">
            {input('city', 'City', { autoComplete: 'address-level2', required: true })}
            <label className="block">
              <span className="field-label">Province</span>
              <select className="input" value={form.province} onChange={set('province')} aria-invalid={errors.province ? true : undefined}>
                <option value="">Choose…</option>
                {PROVINCES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              {errors.province ? <span className="mt-1 block text-xs text-bad">{errors.province}</span> : null}
            </label>
            {input('postal_code', 'Postal code (optional)', { autoComplete: 'postal-code', inputMode: 'numeric' })}
          </div>
          <label className="block">
            <span className="field-label">Note for the courier (optional)</span>
            <textarea className="input" rows={2} value={form.customer_note} onChange={set('customer_note')} />
          </label>
        </fieldset>

        <fieldset className="mt-10">
          <legend className="label mb-4 text-steel-600">03 — Payment {preorder && quote ? `· ${money(quote.totals.dueNow)} deposit today` : ''}</legend>
          <div className="space-y-2" role="radiogroup">
            {methods.map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer items-center gap-4 border px-4 py-4 transition-colors ${chosen === m ? 'border-ink bg-white' : 'border-ink/15 hover:border-ink/40'}`}
              >
                <input type="radio" name="payment" checked={chosen === m} onChange={() => setMethod(m)} className="accent-ink" />
                <span className="flex-1">
                  <span className="block font-medium">{PAYMENT_LABELS[m].title}</span>
                  <span className="block text-sm text-ink/60">{PAYMENT_LABELS[m].note}</span>
                </span>
              </label>
            ))}
          </div>
          {preorder ? (
            <p className="mt-3 text-sm text-ink/60">
              Preorder deposits are paid online. The balance can be paid online or in cash on delivery when your order ships.
            </p>
          ) : null}
        </fieldset>

        <button
          type="submit"
          className="btn-primary mt-10 h-14 w-full"
          disabled={pending || loading || !quote || !quote.lines.length || quote.problems.length > 0 || Boolean(coupon && quote.couponError)}
        >
          {pending
            ? 'Placing order…'
            : !quote
              ? 'Checkout'
              : preorder
                ? `Pay ${money(quote.totals.dueNow)} deposit`
                : chosen === 'cod'
                  ? `Place order · ${money(quote.totals.total)}`
                  : `Pay ${money(quote.totals.total)}`}
          {!pending ? <Chevrons count={3} className="h-3 w-auto text-ember" /> : null}
        </button>
        <p className="mt-4 flex items-center justify-center gap-2 text-center text-[13px] text-steel-600">
          <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
            <rect x="3" y="7" width="10" height="7" rx="1" />
            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
          </svg>
          Card and wallet details are entered on the payment provider&apos;s secure page.
        </p>
        <p className="mt-3 text-center text-xs leading-relaxed text-ink/50">
          By placing your order you agree to our{' '}
          <Link href="/terms" className="underline">
            terms of sale
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline">
            privacy policy
          </Link>
          .
        </p>
      </div>

      <aside className="hidden lg:col-span-5 lg:block" aria-label="Order summary">
        <div className="admin-card sticky top-24 p-6 sm:p-8">
          <h2 className="label mb-6 flex justify-between text-steel-600">
            Order summary
            <Link href="/cart" className="tracking-normal normal-case underline underline-offset-4 hover:text-ink">
              Edit
            </Link>
          </h2>
          {!quote ? <div className="h-40 animate-pulse bg-paper" /> : <div className={loading ? 'opacity-60' : ''}>{summary}</div>}
        </div>
      </aside>
    </form>
  );
}
