'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { money } from '@/lib/pricing';
import { Chevrons } from './brand';

export interface TripOption {
  id: string;
  slug: string;
  name: string;
  sizeLabel: string;
  /** "20″" */
  inches: string;
  bestFor: string;
  facts: { label: string; value: string }[];
  /** First colour with stock, or the first colour when all are sold out. */
  variantId: string | null;
  soldOut: boolean;
  price: number;
  /** After-launch price while preorders are open. */
  afterLaunch: number | null;
  image: { url: string; alt: string } | null;
}

/** "How long are you away?" turns the size question into one tap. Everything shown comes from the catalogue. */
export function TripPicker({ options, preorder }: { options: TripOption[]; preorder: boolean }) {
  const add = useCart((s) => s.add);
  const [index, setIndex] = useState(0);
  const [addedId, setAddedId] = useState<string | null>(null);
  const option = options[Math.min(index, options.length - 1)];
  if (!option) return null;
  const added = addedId === option.id;

  function choose(i: number) {
    setIndex(i);
    setAddedId(null);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-6">
        <div role="radiogroup" aria-label="Trip length" className="border-t border-ink">
          {options.map((o, i) => {
            const active = i === index;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(i)}
                onPointerEnter={(e) => (e.pointerType === 'mouse' ? choose(i) : undefined)}
                className={`flex w-full items-center gap-5 border-b py-6 text-left transition-colors sm:gap-8 ${
                  active ? 'border-ink' : 'hairline text-ink/40 hover:text-ink/70'
                }`}
              >
                <span className="display w-24 shrink-0 text-5xl tabular-nums sm:w-32 sm:text-6xl">{o.inches}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xl font-medium tracking-tight sm:text-2xl">{o.bestFor}</span>
                  <span className={`label mt-1.5 block text-[10px] ${active ? 'text-steel-600' : ''}`}>
                    {o.sizeLabel} · {money(o.price)}
                    {preorder ? ' preorder' : ''}
                  </span>
                </span>
                <Chevrons
                  count={2}
                  className={`h-5 w-auto shrink-0 text-ember transition-all duration-300 ease-out-expo ${
                    active ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-6" aria-live="polite">
        <div className="grid gap-6 sm:grid-cols-2 sm:items-end">
          <Link href={`/products/${option.slug}`} className="block overflow-hidden bg-paper" tabIndex={-1} aria-hidden="true">
            {option.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={option.image.url} src={option.image.url} alt="" loading="lazy" className="aspect-[4/5] w-full animate-fade-in object-contain motion-reduce:animate-none" />
            ) : (
              <div className="aspect-[4/5]" />
            )}
          </Link>
          <div>
            <p className="label text-ember-600">Our pick for this trip</p>
            <h3 className="display mt-3 text-4xl">{option.name}</h3>
            <dl className="hairline mt-5 border-t">
              {option.facts.map((f) => (
                <div key={f.label} className="hairline flex justify-between gap-4 border-b py-2.5 text-sm">
                  <dt className="text-steel-600">{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
            {preorder && option.afterLaunch ? (
              <p className="mt-3 text-xs text-ink/60">Preorder price. {money(option.afterLaunch)} after launch.</p>
            ) : null}
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                className="btn-primary w-full"
                disabled={!option.variantId || option.soldOut}
                onClick={() => {
                  if (!option.variantId) return;
                  add(option.variantId, 1);
                  setAddedId(option.id);
                }}
              >
                {option.soldOut ? 'Sold out' : `${preorder ? 'Preorder' : 'Add to cart'} · ${money(option.price)}`}
              </button>
              {added ? (
                <Link href="/cart" className="btn border border-ok/30 bg-ok/5 w-full text-ink hover:border-ok">
                  Added. View cart <Chevrons count={1} className="h-3 w-auto text-ember" />
                </Link>
              ) : (
                <Link href={`/products/${option.slug}`} className="btn-outline w-full">
                  Choose colour and details <Chevrons count={1} className="h-3 w-auto" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
