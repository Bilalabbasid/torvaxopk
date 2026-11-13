'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { money } from '@/lib/pricing';
import type { SaleMode } from '@/lib/types';
import { Chevrons } from './brand';
import { PriceTag } from './product-card';

interface BuyVariant {
  id: string;
  colorName: string;
  colorHex: string;
  stock: number;
  price: number;
  compareAt: number | null;
  images: { url: string; alt: string }[];
}

/** One case in a set, with the colours it can be ordered in. */
export interface SetCase {
  label: string;
  colours: { name: string; hex: string; image: string }[];
}

export function ProductBuyBox({
  product,
  variants,
  mode,
  depositAmount,
  couponPercent,
  separatePrices,
  cases,
}: {
  product: { name: string; tagline: string; description: string; sizeLabel: string };
  variants: BuyVariant[];
  mode: SaleMode;
  depositAmount: number;
  couponPercent: number;
  /** Sets only: the current price of each case bought on its own. */
  separatePrices?: number[];
  /** Sets only: lets the customer pick a different colour for each case. */
  cases?: SetCase[];
}) {
  const add = useCart((s) => s.add);
  const firstInStock = variants.findIndex((v) => v.stock > 0);
  const [index, setIndex] = useState(Math.max(firstInStock, 0));
  const [imageIndex, setImageIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  // Cursor position over the main image, in percent. Null when not hovering.
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  // Sets only: a colour per case when they are not all the same. Null means the matched set.
  const [picks, setPicks] = useState<string[] | null>(null);

  const variant = variants[index];
  if (!variant) return null;
  const image = variant.images[imageIndex] ?? variant.images[0];
  const soldOut = variant.stock <= 0;
  const preorder = mode === 'preorder';
  const maxQty = Math.min(variant.stock, 10);
  const preorderPrice = preorder && variant.compareAt != null;
  const separateTotal = (separatePrices ?? []).reduce((sum, p) => sum + p, 0);
  const setSaving = separateTotal - variant.price;
  const mixable = cases && cases.length > 1 ? cases : null;
  const chosen = mixable ? (picks ?? mixable.map(() => variant.colorName)) : [];
  const mixed = picks != null;
  // The three chosen cases side by side stand in for the set photo while colours are mixed.
  const mixedImages = mixed && mixable ? mixable.map((c, i) => c.colours.find((x) => x.name === chosen[i])) : null;

  function choose(i: number) {
    setIndex(i);
    setPicks(null);
    setImageIndex(0);
    setQty(1);
    setAdded(false);
  }

  function pickCase(caseIndex: number, colour: string) {
    const next = chosen.map((c, i) => (i === caseIndex ? colour : c));
    const allSame = next.every((c) => c === next[0]);
    // A mixed set is ordered (and counted in stock) under the colour chosen for the first case.
    const anchor = variants.findIndex((v) => v.colorName === next[0]);
    if (anchor >= 0) setIndex(anchor);
    setPicks(allSame && anchor >= 0 ? null : next);
    setImageIndex(0);
    setQty(1);
    setAdded(false);
  }

  function addToCart() {
    add(variant.id, qty, mixed ? chosen : undefined);
    setAdded(true);
  }

  return (
    <section className="container-x grid gap-10 py-8 lg:grid-cols-12 lg:gap-16 lg:py-12">
      <div className="lg:col-span-7">
        <div
          className="aspect-[4/5] cursor-zoom-in overflow-hidden bg-paper sm:aspect-[5/4]"
          onPointerMove={(e) => {
            if (e.pointerType !== 'mouse') return;
            const box = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - box.left) / box.width) * 100, y: ((e.clientY - box.top) / box.height) * 100 });
          }}
          onPointerLeave={() => setZoom(null)}
        >
          {mixedImages && imageIndex === 0 ? (
            <div
              className="grid size-full grid-cols-3 items-center px-4 transition-transform duration-200 ease-out motion-reduce:transition-none"
              style={zoom ? { transform: 'scale(2.2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            >
              {mixedImages.map((c, i) =>
                c ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={c.image} alt={`${mixable?.[i].label} in ${c.name}`} className="aspect-[4/5] w-full object-contain" />
                ) : (
                  <span key={i} />
                ),
              )}
            </div>
          ) : image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={image.alt}
              className="size-full object-contain transition-transform duration-200 ease-out motion-reduce:transition-none"
              style={zoom ? { transform: 'scale(2.2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            />
          ) : null}
        </div>
        {variant.images.length > 1 ? (
          <div className="mt-3 grid grid-cols-5 gap-3">
            {variant.images.map((img, i) => (
              <button
                key={img.url}
                onClick={() => setImageIndex(i)}
                aria-label={`Show image ${i + 1}`}
                className={`aspect-square overflow-hidden bg-paper ring-offset-2 ${i === imageIndex ? 'ring-1 ring-ink' : 'opacity-70 hover:opacity-100'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="size-full object-contain" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="lg:col-span-5 lg:pt-6">
        <p className="label flex items-center gap-3 text-steel-600">
          <span className="h-px w-8 bg-ember" />
          {product.sizeLabel} {preorder ? '· Preorder' : ''}
        </p>
        <h1 className="display mt-5 text-5xl sm:text-6xl">{product.name}</h1>
        <p className="mt-4 text-lg text-ink/70">{product.tagline}</p>

        {preorderPrice ? (
          <div className="mt-8">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <span className="font-mono text-2xl tabular-nums">{money(variant.price)}</span>
              <span className="label bg-ember px-2 py-1 text-[10px] text-ink">Preorder price</span>
            </div>
            <p className="mt-2 font-mono text-sm tabular-nums text-ink/70">{money(variant.compareAt ?? 0)} after launch</p>
            <p className="mt-3 text-sm text-ink/60">
              This is a preorder price, not a sale. Once we launch, {product.name} goes to its regular price of{' '}
              {money(variant.compareAt ?? 0)}. Pay a {money(Math.min(depositAmount, variant.price))} deposit today, the rest
              when it ships.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <PriceTag price={variant.price} compareAt={variant.compareAt} className="text-2xl" />
              {variant.compareAt ? (
                <span className="label bg-ember px-2 py-1 text-[10px] text-ink">
                  Save {money(variant.compareAt - variant.price)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-ink/60">
              {preorder
                ? `Pay ${money(Math.min(depositAmount, variant.price))} deposit today, the rest when it ships.`
                : `Launch buyers get a ${couponPercent}% code for everything, valid for a year.`}
            </p>
          </>
        )}

        {separatePrices && separatePrices.length > 1 && setSaving > 0 ? (
          <dl className="hairline mt-6 space-y-2 border-y py-4 text-sm">
            <div className="flex flex-wrap justify-between gap-x-4">
              <dt className="text-ink/60">Buying one by one{preorder ? ' (preorder)' : ''}</dt>
              <dd className="font-mono tabular-nums text-ink/70">
                {separatePrices.map((p) => money(p)).join(' + ')} = {money(separateTotal)}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4">
              <dt className="text-ink/60">As a Set of 3{preorder ? ' (preorder)' : ''}</dt>
              <dd className="font-mono tabular-nums">{money(variant.price)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 font-medium">
              <dt>The set saves you</dt>
              <dd className="font-mono tabular-nums text-ember-600">{money(setSaving)}</dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-10">
          <p className="label text-steel-600">
            {mixable ? 'All three' : 'Colour'} · <span className="text-ink">{mixed ? 'Mixed' : variant.colorName}</span>
          </p>
          <div className="mt-4 flex gap-3" role="radiogroup" aria-label={mixable ? 'Colour for all three cases' : 'Colour'}>
            {variants.map((v, i) => (
              <button
                key={v.id}
                role="radio"
                aria-checked={i === index && !mixed}
                aria-label={`${v.colorName}${v.stock <= 0 ? ' (sold out)' : ''}`}
                onClick={() => choose(i)}
                className={`relative size-11 rounded-full ring-offset-4 ring-offset-bone transition ${i === index && !mixed ? 'ring-2 ring-ink' : 'ring-1 ring-ink/15 hover:ring-ink/40'}`}
                style={{ backgroundColor: v.colorHex }}
              >
                {v.stock <= 0 ? <span className="absolute inset-0 m-auto h-px w-full rotate-45 bg-bad" /> : null}
              </button>
            ))}
          </div>

          {mixable ? (
            <div className="hairline mt-8 border-t pt-6">
              <p className="label text-steel-600">Or pick a colour for each case</p>
              <p className="mt-2 text-sm text-ink/60">Mix them any way you like. The price stays the same.</p>
              <div className="mt-4 space-y-3">
                {mixable.map((c, ci) => (
                  <div key={c.label} className="flex items-center justify-between gap-4">
                    <p className="text-sm">
                      {c.label} <span className="text-ink/60">· {chosen[ci]}</span>
                    </p>
                    <div className="flex gap-2.5" role="radiogroup" aria-label={`${c.label} colour`}>
                      {c.colours.map((col) => (
                        <button
                          key={col.name}
                          role="radio"
                          aria-checked={chosen[ci] === col.name}
                          aria-label={`${c.label} in ${col.name}`}
                          title={col.name}
                          onClick={() => pickCase(ci, col.name)}
                          className={`size-8 rounded-full ring-offset-2 ring-offset-bone transition ${chosen[ci] === col.name ? 'ring-2 ring-ink' : 'ring-1 ring-ink/15 hover:ring-ink/40'}`}
                          style={{ backgroundColor: col.hex }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-10 flex gap-3">
          <div className="flex h-12 items-center border border-ink/15">
            <button className="h-full w-11 text-lg disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Fewer">
              −
            </button>
            <span className="w-8 text-center font-mono tabular-nums" aria-live="polite">
              {qty}
            </span>
            <button className="h-full w-11 text-lg disabled:opacity-30" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="More">
              +
            </button>
          </div>
          <button className="btn-primary flex-1" onClick={addToCart} disabled={soldOut}>
            {soldOut ? 'Sold out' : preorder ? 'Preorder' : 'Add to cart'} · {money(variant.price * qty)}
          </button>
        </div>
        {!soldOut && variant.stock <= 5 ? <p className="mt-3 text-sm text-warn">Only {variant.stock} left in {variant.colorName}.</p> : null}

        {added ? (
          <div className="mt-4 flex items-center justify-between border border-ok/30 bg-ok/5 px-4 py-3 text-sm">
            <span>Added to your cart.</span>
            <Link href="/cart" className="label flex items-center gap-2 text-ink hover:text-ember-600">
              View cart <Chevrons count={2} className="h-2.5 w-auto text-ember" />
            </Link>
          </div>
        ) : null}

        <p className="mt-10 leading-relaxed text-ink/70">{product.description}</p>

        <ul className="hairline mt-8 space-y-3 border-t pt-6 text-sm text-ink/70">
          <li>German quality · Built to EU standards</li>
          <li>Delivery across Pakistan · Cash on delivery available{preorder ? ' for the balance' : ''}</li>
          <li>Pay by card (Safepay), JazzCash or Easypaisa</li>
          <li>7-day returns · 2-year warranty</li>
        </ul>
      </div>
    </section>
  );
}
