'use client';

import Link from 'next/link';
import { Chevrons } from '@/components/brand';
import { TotalsTable } from '@/components/order-summary';
import { useQuote } from '@/components/use-quote';
import { useCart } from '@/lib/cart-store';
import { money } from '@/lib/pricing';

export default function CartPage() {
  const { quote, error, loading, empty } = useQuote();
  const { setQuantity, remove, add } = useCart();

  return (
    <section className="container-x py-14 lg:py-20">
      <h1 className="display text-5xl sm:text-7xl">Your cart</h1>

      {empty ? (
        <div className="mt-12">
          <p className="text-ink/70">Your cart is empty.</p>
          <Link href="/shop" className="btn-primary mt-6">
            Shop the series
          </Link>
        </div>
      ) : error ? (
        <p className="mt-12 text-bad">{error}</p>
      ) : !quote ? (
        <div className="mt-12 h-40 animate-pulse bg-paper" />
      ) : (
        <div className={`mt-12 grid gap-12 lg:grid-cols-12 ${loading ? 'opacity-60' : ''}`}>
          <div className="lg:col-span-8">
          {quote.freeShippingFrom > 0 && quote.lines.length ? (
            // Free-delivery progress: tells the shopper exactly how far they are.
            <div className="mb-6">
              <p className="text-[13px] text-ink/80">
                {quote.totals.subtotal - quote.totals.discount >= quote.freeShippingFrom ? (
                  <>
                    Your order delivers <strong className="font-medium text-ink">free</strong> anywhere in Pakistan.
                  </>
                ) : (
                  <>
                    You are{' '}
                    <strong className="font-medium text-ink">
                      {money(quote.freeShippingFrom - (quote.totals.subtotal - quote.totals.discount))}
                    </strong>{' '}
                    away from free delivery.
                  </>
                )}
              </p>
              <div className="mt-2.5 h-0.5 w-full bg-ink/10">
                <div
                  className="h-full bg-ember transition-[width] duration-700 ease-out-expo"
                  style={{
                    width: `${Math.min(100, ((quote.totals.subtotal - quote.totals.discount) / quote.freeShippingFrom) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
          <ul>
            {quote.problems.map((p) => (
              <li key={p} className="mb-4 border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
                {p}
              </li>
            ))}
            {quote.lines.map((line) => (
              <li key={line.key} className="hairline flex gap-5 border-b py-6 first:border-t">
                <Link href={`/products/${line.productSlug}`} className="w-28 shrink-0 bg-paper sm:w-36">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={line.image} alt="" className="aspect-[4/5] w-full object-contain" />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-4">
                    <div>
                      <Link href={`/products/${line.productSlug}`} className="text-lg font-medium tracking-tight hover:text-ember-600">
                        {line.productName}
                      </Link>
                      <p className="text-sm text-ink/60">{line.variantLabel}</p>
                    </div>
                    <p className="font-mono tabular-nums">{money(line.lineTotal)}</p>
                  </div>
                  <p className="mt-1 text-sm text-ink/60">
                    {money(line.unitPrice)} each
                    {line.compareAt ? (
                      quote.saleMode === 'preorder' ? (
                        <span className="ml-2 text-steel-600">· preorder price, {money(line.compareAt)} after launch</span>
                      ) : (
                        <s className="ml-2 text-steel">{money(line.compareAt)}</s>
                      )
                    ) : null}
                  </p>
                  <div className="mt-auto flex items-center gap-4 pt-4">
                    <div className="flex h-9 items-center border border-ink/15">
                      <button className="h-full w-9" onClick={() => setQuantity(line.key, line.quantity - 1)} aria-label="Fewer">
                        −
                      </button>
                      <span className="w-7 text-center font-mono text-sm tabular-nums">{line.quantity}</span>
                      <button
                        className="h-full w-9 disabled:opacity-30"
                        onClick={() => setQuantity(line.key, line.quantity + 1)}
                        disabled={line.quantity >= Math.min(line.stock, 10)}
                        aria-label="More"
                      >
                        +
                      </button>
                    </div>
                    <button className="label text-steel-600 hover:text-bad" onClick={() => remove(line.key)}>
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {quote.suggestion ? (
            <div className="mt-6 bg-paper px-5 py-4">
              <p className="label text-[10px] text-steel-600">Goes with it</p>
              <div className="mt-3 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={quote.suggestion.image} alt="" className="aspect-[4/5] w-12 shrink-0 object-contain" />
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${quote.suggestion.productSlug}`} className="block truncate text-sm font-medium hover:text-ember-600">
                    {quote.suggestion.productName}
                  </Link>
                  <p className="text-[13px] text-steel-600">
                    {quote.suggestion.colorName} · {money(quote.suggestion.price)}
                    {quote.saleMode === 'preorder' ? ' preorder' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="label h-9 shrink-0 border border-ink px-3 text-[10px] transition-colors hover:bg-ink hover:text-bone"
                  aria-label={`Add ${quote.suggestion.productName} in ${quote.suggestion.colorName} to cart`}
                  onClick={() => add(quote.suggestion!.variantId, 1)}
                >
                  Add
                </button>
              </div>
            </div>
          ) : null}
          </div>

          <aside className="lg:col-span-4">
            <div className="admin-card p-6">
              <p className="label mb-5 text-steel-600">{quote.saleMode === 'preorder' ? 'Preorder summary' : 'Summary'}</p>
              <TotalsTable quote={quote} />
              <Link
                href="/checkout"
                aria-disabled={quote.problems.length > 0 || !quote.lines.length}
                className={`btn-primary mt-6 w-full ${quote.problems.length || !quote.lines.length ? 'pointer-events-none opacity-50' : ''}`}
              >
                Checkout <Chevrons count={3} className="h-3 w-auto text-ember" />
              </Link>
              <p className="mt-4 text-center text-xs text-ink/50">Card · JazzCash · Easypaisa · Cash on delivery</p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
