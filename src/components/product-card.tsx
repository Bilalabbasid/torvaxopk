import Link from 'next/link';
import { money, unitPrice } from '@/lib/pricing';
import type { Product, SaleMode } from '@/lib/types';

export function priceRange(product: Product, mode: SaleMode) {
  const prices = product.product_variants.map((v) => unitPrice(v, mode));
  const lowest = prices.reduce((a, b) => (b.price < a.price ? b : a), prices[0] ?? { price: 0, compareAt: null });
  return lowest;
}

export function PriceTag({
  price,
  compareAt,
  className = '',
  dark = false,
}: {
  price: number;
  compareAt: number | null;
  className?: string;
  dark?: boolean;
}) {
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {compareAt ? <s className={`mr-2 ${dark ? 'text-steel' : 'text-steel-600'}`}>{money(compareAt)}</s> : null}
      <span>{money(price)}</span>
    </span>
  );
}

export function ProductCard({ product, mode, index }: { product: Product; mode: SaleMode; index: number }) {
  const listing = product.product_images.filter((i) => i.is_listing);
  const image = listing[0] ?? product.product_images[0];
  const { price, compareAt } = priceRange(product, mode);
  const soldOut = product.product_variants.every((v) => v.stock <= 0);

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-paper">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.alt}
            loading="lazy"
            className="size-full object-cover transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.03]"
          />
        ) : null}
        <span className="label absolute top-4 left-4 text-steel-600">0{index + 1}</span>
        {mode === 'preorder' ? (
          <span className="label absolute top-4 right-4 bg-ember px-2 py-1 text-[10px] text-ink">Preorder</span>
        ) : null}
        {soldOut ? (
          <span className="label absolute right-4 bottom-4 bg-ink px-2 py-1 text-[10px] text-bone">Sold out</span>
        ) : null}
      </div>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-medium tracking-tight">{product.name}</h3>
          <p className="mt-1 text-sm text-ink/60">{product.tagline}</p>
          <div className="mt-3 flex gap-1.5">
            {product.product_variants.map((v) => (
              <span
                key={v.id}
                title={v.color_name}
                className="size-3.5 rounded-full ring-1 ring-ink/15 ring-inset"
                style={{ backgroundColor: v.color_hex }}
              />
            ))}
          </div>
        </div>
        <PriceTag price={price} compareAt={compareAt} className="shrink-0 text-right text-sm" />
      </div>
    </Link>
  );
}
