import { money, unitPrice } from '@/lib/pricing';
import type { Product, SaleMode } from '@/lib/types';
import { colourMatches } from '@/lib/colour';
import { ProductCardView } from './product-card-view';

export function priceRange(product: Product, mode: SaleMode) {
  const prices = product.product_variants.map((v) => unitPrice(v, mode));
  const lowest = prices.reduce((a, b) => (b.price < a.price ? b : a), prices[0] ?? { price: 0, compareAt: null });
  return lowest;
}

/** Current price of each single case, for comparing the set against buying one by one. */
export function singlePrices(products: Product[], mode: SaleMode) {
  return products.filter((p) => !p.is_set).map((p) => priceRange(p, mode).price);
}

export function PriceTag({
  price,
  compareAt,
  className = '',
  dark = false,
  preorder = false,
}: {
  price: number;
  compareAt: number | null;
  className?: string;
  dark?: boolean;
  /** Preorder pricing is not a markdown: show the after-launch price as a plain fact, never struck through. */
  preorder?: boolean;
}) {
  if (preorder && compareAt) {
    const muted = dark ? 'text-bone/60' : 'text-ink/60';
    return (
      <span className={`font-mono tabular-nums ${className}`}>
        <span className="whitespace-nowrap">{money(price)}</span>
        <span className={`ml-2 font-sans text-xs ${muted}`}>preorder</span>
        <span className={`mt-1 block font-sans text-xs ${muted}`}>{money(compareAt)} after launch</span>
      </span>
    );
  }
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {compareAt ? <s className={`mr-2 ${dark ? 'text-steel' : 'text-steel-600'}`}>{money(compareAt)}</s> : null}
      <span>{money(price)}</span>
    </span>
  );
}

export function ProductCard({
  product,
  mode,
  index,
  colour,
}: {
  product: Product;
  mode: SaleMode;
  index: number;
  /** Colour name to start on, e.g. from the shop's colour filter. */
  colour?: string | null;
}) {
  const { price, compareAt } = priceRange(product, mode);
  const soldOut = product.product_variants.every((v) => v.stock <= 0);
  const fallback = product.product_images.find((i) => i.is_listing) ?? product.product_images[0];
  const colours = product.product_variants.map((v) => {
    const own = product.product_images.filter((i) => i.variant_id === v.id);
    const image = own.find((i) => i.is_listing) ?? own[0] ?? fallback;
    return { id: v.id, name: v.color_name, hex: v.color_hex, image: image ? { url: image.url, alt: image.alt } : null };
  });
  const wanted = colour ? colours.findIndex((c) => colourMatches(c.name, colour)) : -1;

  return (
    <ProductCardView
      href={`/products/${product.slug}`}
      name={product.name}
      tagline={product.tagline}
      index={index}
      colours={colours}
      initial={Math.max(wanted, 0)}
      preorder={mode === 'preorder'}
      soldOut={soldOut}
      price={<PriceTag price={price} compareAt={compareAt} preorder={mode === 'preorder'} className="block text-right text-sm" />}
    />
  );
}
