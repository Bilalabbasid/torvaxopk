import Link from 'next/link';
import type { CSSProperties } from 'react';
import { colourSlug } from '@/lib/colour';
import { money } from '@/lib/pricing';
import type { Product, SaleMode } from '@/lib/types';
import { priceRange } from './product-card';

// Rows, matched by label against each case's specs (edited in Admin → Products).
const ROWS = ['Size', 'Dimensions', 'Volume', 'Weight', 'Best for'];

/** "Which one is yours?" Cabin, Medium and Large side by side. The case being viewed is highlighted. */
export function SizeGuide({
  products,
  mode,
  current,
  colour,
}: {
  products: Product[];
  mode: SaleMode;
  /** Slug of the product being viewed, if any. */
  current?: string;
  /** Colour name to carry into the View links. */
  colour?: string;
}) {
  const singles = products.filter((p) => !p.is_set);
  if (singles.length < 2) return null;
  const preorder = mode === 'preorder';
  const query = colour ? `?colour=${colourSlug(colour)}` : '';
  const cell = (p: Product) => (p.slug === current ? 'bg-ink/[0.035]' : '');

  return (
    <section id="size-guide" className="container-x py-16 lg:py-24">
      <p className="reveal label text-steel-600">Size guide</p>
      <h2 className="reveal display mt-4 text-4xl sm:text-5xl" style={{ '--reveal-delay': '80ms' } as CSSProperties}>
        Which one is yours?
      </h2>
      <div className="-mx-5 mt-10 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:mt-14 lg:px-0">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-ink">
              <th className="w-1/4 pb-5" />
              {singles.map((p) => (
                <th key={p.id} scope="col" className={`px-4 pb-5 align-bottom ${cell(p)}`}>
                  {p.slug === current ? <span className="label mb-2 block text-[10px] text-ember-600">You are viewing</span> : null}
                  <span className="text-2xl font-medium tracking-tight sm:text-3xl">{p.size_label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((label) => (
              <tr key={label} className="hairline border-b">
                <th scope="row" className="label py-5 pr-4 font-normal text-steel-600">
                  {label}
                </th>
                {singles.map((p) => (
                  <td key={p.id} className={`px-4 py-5 ${cell(p)}`}>
                    {p.specs.find((s) => s.label === label)?.value ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="hairline border-b">
              <th scope="row" className="label py-5 pr-4 font-normal text-steel-600">
                {preorder ? 'Preorder price' : 'Price'}
              </th>
              {singles.map((p) => {
                const { price, compareAt } = priceRange(p, mode);
                return (
                  <td key={p.id} className={`px-4 py-5 ${cell(p)}`}>
                    <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <span className="font-mono tabular-nums">{money(price)}</span>
                      {p.slug === current ? null : (
                        <Link
                          href={`/products/${p.slug}${query}`}
                          className="label border-b border-ink pb-0.5 text-[10px] transition-colors hover:border-ember hover:text-ember-600"
                        >
                          View
                        </Link>
                      )}
                    </span>
                    {preorder && compareAt ? <span className="mt-1 block text-xs text-ink/60">{money(compareAt)} after launch</span> : null}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
