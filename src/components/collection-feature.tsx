import Link from 'next/link';
import { colourSlug } from '@/lib/colour';
import type { Product, SaleMode } from '@/lib/types';
import { Chevrons } from './brand';
import { PriceTag, priceRange } from './product-card';

/**
 * One product shown large, for collection pages with only a few products: photo on one side,
 * price, colours and key points on the other. Each colour opens the product page in that colour.
 */
export function CollectionFeature({ product, mode, index }: { product: Product; mode: SaleMode; index: number }) {
  const { price, compareAt } = priceRange(product, mode);
  const image = product.product_images.find((i) => i.is_listing) ?? product.product_images[0];
  const href = `/products/${product.slug}`;
  const flip = index % 2 === 1;

  return (
    <article className="grid items-center gap-8 border-b border-ink/10 py-12 last:border-b-0 lg:grid-cols-12 lg:gap-14 lg:py-16">
      <Link
        href={href}
        className={`group relative block aspect-square overflow-hidden bg-paper lg:col-span-7 ${flip ? 'lg:order-2 lg:col-start-6' : ''}`}
      >
        <span className="label absolute top-4 left-4 z-10 text-[10px] text-steel-600">0{index + 1}</span>
        {mode === 'preorder' ? (
          <span className="label absolute top-4 right-4 z-10 bg-ember px-2.5 py-1.5 text-[10px] text-bone">Preorder</span>
        ) : null}
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.alt || product.name}
            className="size-full object-contain p-6 transition-transform duration-700 ease-out-expo group-hover:scale-[1.03] sm:p-10"
          />
        ) : null}
      </Link>

      <div className={`lg:col-span-5 ${flip ? 'lg:order-1 lg:col-start-1' : ''}`}>
        {product.size_label ? <p className="label text-steel-600">{product.size_label}</p> : null}
        <h2 className="display mt-3 text-4xl sm:text-5xl">
          <Link href={href} className="hover:text-ink/80">
            {product.name}
          </Link>
        </h2>
        {product.tagline ? <p className="mt-4 text-lg leading-relaxed text-ink/70">{product.tagline}</p> : null}

        <PriceTag price={price} compareAt={compareAt} preorder={mode === 'preorder'} className="mt-6 block text-2xl" />

        {product.product_variants.length > 1 ? (
          <div className="mt-8">
            <p className="label text-[10px] text-steel-600">{product.product_variants.length} colours</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {product.product_variants.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`${href}?colour=${colourSlug(v.color_name)}`}
                    className="flex h-9 items-center gap-2 border border-ink/15 px-3 text-sm transition-colors hover:border-ink"
                  >
                    <span className="size-3 rounded-full ring-1 ring-ink/15" style={{ backgroundColor: v.color_hex }} />
                    {v.color_name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {product.features.length ? (
          <ul className="mt-8 space-y-3 border-t border-ink/10 pt-6 text-ink/75">
            {product.features.slice(0, 4).map((f) => (
              <li key={f} className="flex gap-3">
                <Chevrons count={1} className="mt-1.5 h-2.5 w-auto shrink-0 text-ember" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <Link href={href} className="btn-primary mt-8">
          See {product.name}
        </Link>
      </div>
    </article>
  );
}

const perks = [
  { title: 'German quality', text: 'Designed in Germany, built to EU quality standards.' },
  { title: '2-year warranty', text: 'Wheels you can replace yourself, at home.' },
  { title: 'Delivery across Pakistan', text: 'Card, JazzCash, Easypaisa or cash on delivery.' },
  { title: '7-day returns', text: 'Changed your mind? Send it back within 7 days.' },
];

/** Four short promises, on every collection page. */
export function CollectionPerks() {
  return (
    <ul className="grid border-y border-ink/10 sm:grid-cols-2 lg:grid-cols-4">
      {perks.map((p, i) => (
        <li
          key={p.title}
          className="border-ink/10 px-1 py-7 sm:px-6 [&:nth-child(n+2)]:border-t sm:[&:nth-child(2)]:border-t-0 sm:[&:nth-child(even)]:border-l lg:[&:nth-child(n+2)]:border-t-0 lg:[&:nth-child(n+2)]:border-l lg:first:pl-0"
        >
          <span className="label text-[10px] text-ember">0{i + 1}</span>
          <p className="mt-3 font-medium tracking-tight">{p.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink/60">{p.text}</p>
        </li>
      ))}
    </ul>
  );
}

const details = [
  { image: '/images/detail-lock.jpg', title: 'TSA lock, built in', text: 'Both zip pullers dock straight into the frame lock.' },
  { image: '/images/detail-wheels.jpg', title: 'Wheels that come off', text: 'Four 360° double spinners. A worn wheel is a quick swap.' },
  { image: '/images/detail-interior.jpg', title: 'Packed the way you left it', text: 'Zipped divider, mesh pocket and compression straps.' },
];

/** The suitcase details, for luggage collections. */
export function CollectionDetails() {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-3">
      {details.map((d) => (
        <figure key={d.title}>
          <div className="aspect-[5/4] overflow-hidden bg-paper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.image} alt={d.title} loading="lazy" className="size-full object-contain" />
          </div>
          <figcaption className="mt-4">
            <p className="font-medium tracking-tight">{d.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink/60">{d.text}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
