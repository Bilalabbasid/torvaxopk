'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useCart } from '@/lib/cart-store';
import { colourSlug } from '@/lib/colour';
import { categoryLabel } from '@/lib/lines';
import { money } from '@/lib/pricing';
import type { SaleMode } from '@/lib/types';
import { Chevrons } from './brand';

export interface BuyVariant {
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

export interface Sibling {
  slug: string;
  label: string;
  price: number;
}

export interface BundleOffer {
  slug: string;
  name: string;
  /** What the three cases cost bought one by one, right now. */
  oneByOne: number;
  colours: { name: string; price: number; image: { url: string; alt: string } | null }[];
}

const LOW_STOCK = 5;

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 54.56 100" className={className} fill="currentColor" aria-hidden="true">
      <polygon points="0,0 20.56,0 54.56,50 20.56,100 0,100 34,50" />
    </svg>
  );
}

/** Product photo that zooms under a mouse pointer. */
function ZoomFigure({ children, className = '', hidden }: { children: ReactNode; className?: string; hidden?: boolean }) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  return (
    <figure
      aria-hidden={hidden || undefined}
      className={`overflow-hidden bg-paper ${className} ${zoom ? 'cursor-zoom-out' : 'lg:cursor-zoom-in'}`}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const box = e.currentTarget.getBoundingClientRect();
        setZoom({ x: ((e.clientX - box.left) / box.width) * 100, y: ((e.clientY - box.top) / box.height) * 100 });
      }}
      onPointerLeave={() => setZoom(null)}
    >
      <div
        className="size-full transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={zoom ? { transform: 'scale(2.2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
      >
        {children}
      </div>
    </figure>
  );
}

function Fold({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="hairline group border-b" open={open}>
      <summary className="label flex list-none items-center justify-between py-5 text-[10px] [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-base transition-transform duration-300 group-open:rotate-45">+</span>
      </summary>
      {children}
    </details>
  );
}

export function ProductBuyBox({
  product,
  variants,
  mode,
  depositAmount,
  couponPercent,
  shipping,
  separatePrices,
  cases,
  siblings,
  editions,
  keyFigures,
  bundle,
  initialColour,
  suggestions,
  sizeGuide,
}: {
  product: {
    name: string;
    slug: string;
    tagline: string;
    description: string;
    isSet: boolean;
    category: string;
    /** What the siblings are called: Size, Edition or Pack. */
    optionLabel: string;
    hasWheels: boolean;
    specs: { label: string; value: string }[];
    features: string[];
  };
  variants: BuyVariant[];
  mode: SaleMode;
  depositAmount: number;
  couponPercent: number;
  shipping: { flat: number; freeFrom: number };
  /** Sets only: the current price of each case bought on its own. */
  separatePrices?: number[];
  /** Sets only: lets the customer pick a different colour for each case. */
  cases?: SetCase[];
  siblings: Sibling[];
  /** Cases only: Standard and Signature edition of the same size. */
  editions?: Sibling[];
  keyFigures: { label: string; value: string }[];
  bundle: BundleOffer | null;
  /** ?colour= from the address, as a slug. */
  initialColour: string | null;
  /** Cards for the other products of the series, one set per colour name. */
  suggestions: Record<string, ReactNode>;
  /** The size guide table, one per colour name. */
  sizeGuide?: Record<string, ReactNode>;
}) {
  const add = useCart((s) => s.add);
  const wanted = variants.findIndex((v) => colourSlug(v.colorName) === initialColour);
  const firstInStock = variants.findIndex((v) => v.stock > 0);
  const [index, setIndex] = useState(wanted >= 0 ? wanted : Math.max(firstInStock, 0));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [slide, setSlide] = useState(0);
  // Sets only: a colour per case when they are not all the same. Null means the matched set.
  const [picks, setPicks] = useState<string[] | null>(null);
  const carousel = useRef<HTMLDivElement>(null);
  const buyRow = useRef<HTMLDivElement>(null);
  const [buyRowVisible, setBuyRowVisible] = useState(true);

  const variant = variants[index] ?? variants[0];
  const colour = variant ? colourSlug(variant.colorName) : '';

  // Keep the colour in the address so the choice survives a reload or a shared link.
  useEffect(() => {
    if (!colour) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('colour') === colour) return;
    url.searchParams.set('colour', colour);
    window.history.replaceState(window.history.state, '', url);
  }, [colour]);

  // Small screens: a sticky buy bar once the main button scrolls out of view.
  useEffect(() => {
    const el = buyRow.current;
    if (!el) return;
    // Only once it has scrolled up past the top, not while it is still further down the page.
    const observer = new IntersectionObserver(([entry]) =>
      setBuyRowVisible(entry.isIntersecting || entry.boundingClientRect.top > 0),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!variant) return null;
  const soldOut = variant.stock <= 0;
  const preorder = mode === 'preorder';
  const maxQty = Math.max(1, Math.min(variant.stock, 10));
  const preorderPrice = preorder && variant.compareAt != null;
  const separateTotal = (separatePrices ?? []).reduce((sum, p) => sum + p, 0);
  const setSaving = separateTotal - variant.price;
  const mixable = cases && cases.length > 1 ? cases : null;
  const chosen = mixable ? (picks ?? mixable.map(() => variant.colorName)) : [];
  const mixed = picks != null;
  const mixedImages = mixed && mixable ? mixable.map((c, i) => c.colours.find((x) => x.name === chosen[i])) : null;
  const photos: { key: string; url: string; alt: string; composite?: typeof mixedImages }[] = [
    ...(mixedImages ? [{ key: `mix-${chosen.join('-')}`, url: '', alt: 'Your mix of colours', composite: mixedImages }] : []),
    ...variant.images.map((img) => ({ key: img.url, url: img.url, alt: img.alt })),
  ];

  function goTo(index: number) {
    const el = carousel.current;
    if (!el) return;
    const target = Math.max(0, Math.min(photos.length - 1, index));
    el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' });
  }
  const total = variant.price * qty;
  const shippingNote =
    shipping.freeFrom > 0 && total >= shipping.freeFrom
      ? 'Delivers free across Pakistan'
      : shipping.freeFrom > 0
        ? `${money(shipping.flat)}, free over ${money(shipping.freeFrom)}`
        : `${money(shipping.flat)} anywhere in Pakistan`;
  const bundleColour = bundle ? (bundle.colours.find((c) => c.name === variant.colorName) ?? bundle.colours[0]) : null;
  const bundleSaving = bundle && bundleColour ? bundle.oneByOne - bundleColour.price : 0;
  const cards = suggestions[variant.colorName] ?? Object.values(suggestions)[0];

  function reset() {
    setQty(1);
    setAdded(false);
    setSlide(0);
    carousel.current?.scrollTo({ left: 0 });
  }

  function choose(i: number) {
    setIndex(i);
    setPicks(null);
    reset();
  }

  function pickCase(caseIndex: number, name: string) {
    const next = chosen.map((c, i) => (i === caseIndex ? name : c));
    const allSame = next.every((c) => c === next[0]);
    // A mixed set is ordered (and counted in stock) under the colour chosen for the first case.
    const anchor = variants.findIndex((v) => v.colorName === next[0]);
    if (anchor >= 0) setIndex(anchor);
    setPicks(allSame && anchor >= 0 ? null : next);
    reset();
  }

  function addToCart() {
    if (soldOut) return;
    add(variant.id, qty, mixed ? chosen : undefined);
    setAdded(true);
  }

  const delay = (ms: number) => ({ '--reveal-delay': `${ms}ms` }) as CSSProperties;

  return (
    <>
      <div className="container-x grid gap-x-12 gap-y-8 pt-4 pb-16 lg:grid-cols-12 lg:pt-8 lg:pb-24 xl:gap-x-20">
        {/* Gallery: one photo at a time (swipe, arrows or thumbnails). */}
        <div className="lg:col-span-6">
          <div className="lg:sticky lg:top-24">
            <div className="group/gallery relative -mx-5 sm:-mx-8 lg:mx-0">
              <div
                ref={carousel}
                tabIndex={0}
                role="group"
                aria-roledescription="carousel"
                aria-label={`${product.name} photos`}
                className="flex snap-x snap-mandatory overflow-x-auto bg-paper [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    goTo(slide - 1);
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    goTo(slide + 1);
                  }
                }}
              >
                {photos.map((photo, i) => (
                  <ZoomFigure key={photo.key} className="w-full shrink-0 snap-center" hidden={i !== slide}>
                    {photo.composite ? (
                      <div className="grid aspect-[4/5] grid-cols-3 items-center px-4">
                        {photo.composite.map((c, ci) =>
                          c ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={ci} src={c.image} alt={`${mixable?.[ci].label} in ${c.name}`} className="aspect-[4/5] w-full object-contain" />
                          ) : (
                            <span key={ci} />
                          ),
                        )}
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.url}
                        alt={photo.alt}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        fetchPriority={i === 0 ? 'high' : undefined}
                        className="aspect-[4/5] w-full object-contain"
                      />
                    )}
                  </ZoomFigure>
                ))}
              </div>

              {photos.length > 1 ? (
                <>
                  <p className="label pointer-events-none absolute bottom-4 left-5 bg-bone/80 px-2 py-1 text-[10px] text-ink/70 backdrop-blur sm:left-8 lg:left-4">
                    {String(slide + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
                  </p>
                  {[-1, 1].map((direction) => (
                    <button
                      key={direction}
                      type="button"
                      onClick={() => goTo(slide + direction)}
                      disabled={direction < 0 ? slide === 0 : slide === photos.length - 1}
                      aria-label={direction < 0 ? 'Previous photo' : 'Next photo'}
                      className={`absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center bg-bone/85 text-ink opacity-0 backdrop-blur transition-opacity duration-200 group-hover/gallery:opacity-100 focus-visible:opacity-100 disabled:!opacity-0 lg:grid ${
                        direction < 0 ? 'left-3' : 'right-3'
                      }`}
                    >
                      <svg viewBox="0 0 12 16" className="h-4 w-auto" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d={direction < 0 ? 'M9 2 3 8l6 6' : 'M3 2l6 6-6 6'} />
                      </svg>
                    </button>
                  ))}
                </>
              ) : null}
            </div>

            {photos.length > 1 ? (
              <div className="mt-3 hidden flex-wrap gap-2 sm:flex" role="tablist" aria-label="Choose a photo">
                {photos.map((photo, i) => (
                  <button
                    key={photo.key}
                    type="button"
                    role="tab"
                    aria-selected={i === slide}
                    aria-label={photo.alt}
                    onClick={() => goTo(i)}
                    className={`w-20 overflow-hidden border bg-paper transition-colors ${
                      i === slide ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    {photo.composite ? (
                      <span className="grid aspect-square grid-cols-3 items-center px-1">
                        {photo.composite.map((c, ci) =>
                          c ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={ci} src={c.image} alt="" className="w-full object-contain" />
                          ) : (
                            <span key={ci} />
                          ),
                        )}
                      </span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.url} alt="" loading="lazy" className="aspect-square w-full object-contain" />
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Buy box */}
        <div className="lg:col-span-6 xl:col-span-5 xl:col-start-8">
          <div className="lg:sticky lg:top-24">
            <nav className="label flex items-center gap-2 text-[10px] text-steel-600" aria-label="Breadcrumb">
              <Link href="/shop" className="hover:text-ink">
                Shop
              </Link>
              <span aria-hidden="true">/</span>
              <span>{categoryLabel(product.category)}{preorder ? ' · Preorder' : ''}</span>
            </nav>

            <h1 className="display mt-4 text-5xl xl:text-6xl">{product.name}</h1>
            <p className="mt-3 text-lg text-ink/65">{product.tagline}</p>

            {preorderPrice ? (
              <div className="mt-6">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="display text-4xl tabular-nums">{money(variant.price)}</span>
                  <span className="label bg-ember px-2 py-1 text-[10px] text-ink">Preorder price</span>
                </p>
                <p className="mt-2 font-mono text-sm tabular-nums text-ink/70">{money(variant.compareAt ?? 0)} after launch</p>
                <p className="mt-2 text-[13px] text-steel-600">
                  A preorder price, not a sale: at launch {product.name} goes to {money(variant.compareAt ?? 0)}. Pay a{' '}
                  {money(Math.min(depositAmount, variant.price))} deposit today, the rest when it ships.
                </p>
              </div>
            ) : (
              <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="display text-4xl tabular-nums">{money(variant.price)}</span>
                {variant.compareAt ? <s className="font-mono text-steel tabular-nums">{money(variant.compareAt)}</s> : null}
                {variant.compareAt ? (
                  <span className="label bg-ember px-2 py-1 text-[10px] text-ink">Save {money(variant.compareAt - variant.price)}</span>
                ) : null}
                <span className="w-full text-[13px] text-steel-600">
                  {preorder
                    ? `Pay ${money(Math.min(depositAmount, variant.price))} deposit today, the rest when it ships.`
                    : `Launch buyers get a ${couponPercent}% code for everything, valid for a year.`}{' '}
                  <Link href="/shipping" className="underline underline-offset-4 hover:text-ink">
                    Delivery
                  </Link>
                </span>
              </p>
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

            {/* Size: each size is its own product, so this switches page and keeps the colour. */}
            {siblings.length > 1 ? (
              <div className="mt-8">
                <p className="label text-[10px] text-steel-600">{product.optionLabel}</p>
                <div
                  className={`mt-3 grid gap-px bg-ink/15 p-px ${
                    siblings.length === 3 ? 'grid-cols-3' : siblings.length > 3 ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4' : 'grid-cols-2'
                  }`}
                >
                  {siblings.map((s) => {
                    const current = s.slug === product.slug;
                    return (
                      <Link
                        key={s.slug}
                        href={`/products/${s.slug}?colour=${colour}`}
                        aria-current={current ? 'page' : undefined}
                        className={`flex flex-col gap-1 px-3 py-3 transition-colors ${current ? 'bg-ink text-bone' : 'bg-bone hover:bg-white'}`}
                      >
                        <span className="text-sm font-medium">{s.label}</span>
                        <span className="font-mono text-[12px] tabular-nums opacity-65">{money(s.price)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {editions && editions.length > 1 ? (
              <div className="mt-6">
                <p className="label text-[10px] text-steel-600">Edition</p>
                <div className="mt-3 grid grid-cols-2 gap-px bg-ink/15 p-px">
                  {editions.map((s) => {
                    const current = s.slug === product.slug;
                    return (
                      <Link
                        key={s.slug}
                        href={`/products/${s.slug}?colour=${colour}`}
                        aria-current={current ? 'page' : undefined}
                        className={`flex flex-col gap-1 px-3 py-3 transition-colors ${current ? 'bg-ink text-bone' : 'bg-bone hover:bg-white'}`}
                      >
                        <span className="text-sm font-medium">{s.label}</span>
                        <span className="font-mono text-[12px] tabular-nums opacity-65">{money(s.price)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-7">
              <p className="label text-[10px] text-steel-600">
                {mixable ? 'All three' : 'Colour'} <span className="ml-2 text-ink">{mixed ? 'Mixed' : variant.colorName}</span>
              </p>
              <div className="mt-3 flex gap-3" role="radiogroup" aria-label={mixable ? 'Colour for all three cases' : 'Colour'}>
                {variants.map((v, i) => (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={i === index && !mixed}
                    aria-label={`${v.colorName}${v.stock <= 0 ? ' (sold out)' : ''}`}
                    onClick={() => choose(i)}
                    className={`relative size-11 rounded-full ring-offset-4 ring-offset-bone transition ${
                      i === index && !mixed ? 'ring-2 ring-ink' : 'ring-1 ring-ink/15 hover:ring-ink/40'
                    }`}
                    style={{ backgroundColor: v.colorHex }}
                  >
                    {v.stock <= 0 ? <span className="absolute inset-0 m-auto h-px w-full rotate-45 bg-bad" /> : null}
                  </button>
                ))}
              </div>

              {mixable ? (
                <div className="hairline mt-6 border-t pt-5">
                  <p className="label text-[10px] text-steel-600">Or pick a colour for each case</p>
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
                              type="button"
                              role="radio"
                              aria-checked={chosen[ci] === col.name}
                              aria-label={`${c.label} in ${col.name}`}
                              title={col.name}
                              onClick={() => pickCase(ci, col.name)}
                              className={`size-8 rounded-full ring-offset-2 ring-offset-bone transition ${
                                chosen[ci] === col.name ? 'ring-2 ring-ink' : 'ring-1 ring-ink/15 hover:ring-ink/40'
                              }`}
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

            <div ref={buyRow} className="mt-8 flex gap-2">
              <div className="flex h-14 items-center border border-ink/15">
                <button
                  type="button"
                  className="h-full w-11 text-lg disabled:opacity-30"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1 || soldOut}
                  aria-label="Fewer"
                >
                  −
                </button>
                <span className="w-8 text-center font-mono tabular-nums" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  className="h-full w-11 text-lg disabled:opacity-30"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty || soldOut}
                  aria-label="More"
                >
                  +
                </button>
              </div>
              <button type="button" className="btn-primary h-14 flex-1" onClick={addToCart} disabled={soldOut}>
                {soldOut ? 'Sold out' : `${preorder ? 'Preorder' : 'Add to cart'} · ${money(total)}`}
                {soldOut ? null : <Chevrons count={1} className="h-3 w-auto text-ember" />}
              </button>
            </div>

            <p className="mt-4 flex items-center gap-2.5 text-[13px] text-ink/70" aria-live="polite">
              <span className={`relative flex size-2 ${soldOut ? 'text-bad' : variant.stock <= LOW_STOCK ? 'text-warn' : 'text-ok'}`}>
                {soldOut ? null : <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-50" />}
                <span className="relative inline-flex size-2 rounded-full bg-current" />
              </span>
              {soldOut
                ? `${variant.colorName} is sold out. Try another colour.`
                : variant.stock <= LOW_STOCK
                  ? `Only ${variant.stock} left in ${variant.colorName}`
                  : preorder
                    ? 'Open for preorder, ships when the series lands'
                    : 'In stock, ready to ship'}
            </p>

            {added ? (
              <div className="mt-4 flex items-center justify-between border border-ok/30 bg-ok/5 px-4 py-3 text-sm">
                <span>Added to your cart.</span>
                <Link href="/cart" className="label flex items-center gap-2 text-ink hover:text-ember-600">
                  View cart <Chevrons count={2} className="h-2.5 w-auto text-ember" />
                </Link>
              </div>
            ) : null}

            {/* What the shopper gets, each line backed by a page. */}
            <ul className="hairline mt-7 grid grid-cols-3 divide-x divide-ink/10 border text-center">
              {[
                { title: 'Delivery', text: shippingNote, href: '/shipping' },
                { title: 'Returns', text: '7 days to return', href: '/returns' },
                product.hasWheels
                  ? { title: 'Warranty', text: '2 years, replaceable wheels', href: '/warranty' }
                  : { title: 'Warranty', text: '2-year warranty', href: '/warranty' },
              ].map((perk) => (
                <li key={perk.href}>
                  <Link href={perk.href} className="group block h-full px-2 py-4 transition-colors hover:bg-white">
                    <span className="label block text-[10px] text-ember-600">{perk.title}</span>
                    <span className="mt-1.5 block text-[12px] leading-snug text-ink/70 group-hover:text-ink">{perk.text}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <p className="label mt-8 text-[10px] text-steel-600">German quality · Built to EU standards</p>
            <p className="mt-3 leading-relaxed text-ink/75">{product.description}</p>

            <div className="mt-8 border-t border-ink">
              {product.specs.length ? (
                <Fold title="Specifications">
                  <dl className="pb-5">
                    {product.specs.map((row) => (
                      <div key={row.label} className="hairline flex justify-between gap-6 border-t py-3 text-sm">
                        <dt className="text-steel-600">{row.label}</dt>
                        <dd className="text-right">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Fold>
              ) : null}
              {product.features.length ? (
                <Fold title="Features" open>
                  <ul className="space-y-3 pb-6 text-sm">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex gap-3">
                        <Chevron className="mt-1 h-3 w-auto shrink-0 text-ember" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Fold>
              ) : null}
              {preorder ? (
                <Fold title="How preorder works">
                  <p className="pb-6 text-sm leading-relaxed text-ink/75">
                    Pay a {money(depositAmount)} deposit today by card, JazzCash or Easypaisa to lock in the preorder price. It is
                    not a sale: the preorder price ends at launch. When your order is ready to ship we email you a secure link to
                    pay the balance online, or pay the courier in cash.{' '}
                    <Link href="/launch" className="underline underline-offset-4 hover:text-ember-600">
                      Read more
                    </Link>
                  </p>
                </Fold>
              ) : null}
              <Fold title="Warranty and service">
                <p className="pb-6 text-sm leading-relaxed text-ink/75">
                  {product.hasWheels
                    ? 'Every Forward case has a 2-year warranty. A worn wheel is a quick swap, as the wheels detach.'
                    : 'Covered by a 2-year warranty.'}{' '}
                  See{' '}
                  <Link href="/warranty" className="underline underline-offset-4 hover:text-ember-600">
                    Warranty
                  </Link>{' '}
                  and{' '}
                  <Link href="/returns" className="underline underline-offset-4 hover:text-ember-600">
                    Returns
                  </Link>
                  .
                </p>
              </Fold>
            </div>
          </div>
        </div>
      </div>

      {/* Key figures */}
      {keyFigures.length ? (
        <section className="bg-ink text-bone" aria-label="Key figures">
          <dl className="container-x grid grid-cols-2 lg:grid-cols-4">
            {keyFigures.map((figure, i) => (
              <div
                key={figure.label}
                className="reveal border-bone/10 py-10 pr-4 lg:border-l lg:py-14 lg:pl-8 lg:first:border-l-0 lg:first:pl-0 [&:nth-child(even)]:border-l [&:nth-child(even)]:pl-6 [&:nth-child(n+3)]:border-t lg:[&:nth-child(n+3)]:border-t-0"
                style={delay(i * 70)}
              >
                <dt className="label text-[10px] text-ember">{figure.label}</dt>
                <dd className="display mt-4 text-2xl sm:text-3xl xl:text-4xl">{figure.value.replace(/\s*inch$/i, '″')}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {sizeGuide ? (sizeGuide[variant.colorName] ?? Object.values(sizeGuide)[0]) : null}

      {/* Cross-selling: the set offer, then the other sizes in the same colour. */}
      {bundle && bundleColour && bundleSaving > 0 ? (
        <section className="container-x pt-16 lg:pt-24">
          <Link href={`/products/${bundle.slug}?colour=${colour}`} className="reveal group grid overflow-hidden bg-paper lg:grid-cols-2">
            <div className="order-2 flex flex-col justify-between gap-8 p-8 sm:p-12 lg:order-1">
              <p className="label text-ember-600">Travelling more often?</p>
              <div>
                <h2 className="display text-4xl sm:text-5xl">
                  Take all three
                  <br />
                  and save {money(bundleSaving)}.
                </h2>
                <p className="mt-4 max-w-md text-ink/70">
                  The {bundle.name} in {bundleColour.name}: this case plus the two other sizes, for less than buying them one by
                  one. You can also give each case its own colour.
                </p>
              </div>
              <p className="hairline flex flex-wrap items-center justify-between gap-4 border-t pt-5">
                <span className="font-mono tabular-nums">
                  <span className="mr-2 text-sm text-steel-600">One by one {money(bundle.oneByOne)}</span>
                  <span className="text-xl">{money(bundleColour.price)}</span>
                  {preorder ? <span className="ml-1.5 font-sans text-xs text-ink/60">preorder</span> : null}
                </span>
                <span className="label border-b border-ink pb-1 transition-colors group-hover:border-ember group-hover:text-ember-600">
                  View the set
                </span>
              </p>
            </div>
            <div className="order-1 overflow-hidden lg:order-2">
              {bundleColour.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bundleColour.image.url}
                  alt={bundleColour.image.alt}
                  loading="lazy"
                  className="size-full min-h-64 object-contain transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.03]"
                />
              ) : null}
            </div>
          </Link>
        </section>
      ) : null}

      {cards ? (
        <section className="container-x grid gap-x-12 gap-y-10 py-16 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-4">
            <p className="reveal label text-steel-600">{product.isSet ? 'Just need one?' : 'Goes with it'}</p>
            <h2 className="reveal display mt-3 text-4xl sm:text-5xl" style={delay(60)}>
              {product.isSet
                ? 'The single sizes.'
                : product.optionLabel === 'Size'
                  ? 'The same case, another size.'
                  : product.optionLabel === 'Edition'
                    ? 'The other edition.'
                    : 'More for your case.'}
            </h2>
            <p className="reveal mt-4 max-w-xs text-ink/65" style={delay(100)}>
              {product.optionLabel === 'Size'
                ? `Shown in ${variant.colorName}, true to scale, so you can see the difference.`
                : `Shown in ${variant.colorName} where available.`}
            </p>
            <Link
              href="/shop"
              className="reveal label mt-6 inline-block border-b border-ink pb-1 hover:border-ember hover:text-ember-600"
              style={delay(140)}
            >
              View all
            </Link>
          </div>
          <div className={`grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:col-span-8 ${product.isSet ? 'xl:grid-cols-3' : ''}`}>{cards}</div>
        </section>
      ) : null}

      {/* Sticky buy bar (small screens) */}
      {!buyRowVisible ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 flex animate-fade-in items-center gap-4 border-t border-ink/10 bg-bone/90 px-5 py-3 backdrop-blur-xl lg:hidden"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="truncate text-[13px] text-steel-600">
              {mixed ? 'Mixed colours' : variant.colorName} · {money(variant.price)}
              {preorder ? ' preorder' : ''}
            </p>
          </div>
          {added ? (
            <Link href="/cart" className="btn-primary">
              View cart
            </Link>
          ) : (
            <button type="button" className="btn-primary" onClick={addToCart} disabled={soldOut}>
              {soldOut ? 'Sold out' : preorder ? 'Preorder' : 'Add to cart'}
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}
