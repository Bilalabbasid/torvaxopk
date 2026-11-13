import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { getSettings, listActiveProducts } from '@/lib/catalog';
import { colourMatches, colourSlug } from '@/lib/colour';

export const metadata = {
  title: 'Shop hardshell luggage',
  description: 'The Torvaxo Forward series: cabin, medium and large hardshell suitcases and the matched Set of Three. Delivered across Pakistan.',
  alternates: { canonical: '/shop' },
};

export default async function ShopPage(props: PageProps<'/shop'>) {
  const { colour } = await props.searchParams;
  const selected = typeof colour === 'string' ? colour : null;
  const [settings, products] = await Promise.all([getSettings(), listActiveProducts()]);
  const colours = [
    ...new Map(products.flatMap((p) => p.product_variants.map((v) => [v.color_name, { name: v.color_name, hex: v.color_hex }]))).values(),
  ];
  const active = colours.find((c) => colourMatches(c.name, selected)) ?? null;
  const shown = active ? products.filter((p) => p.product_variants.some((v) => v.color_name === active.name)) : products;

  return (
    <section className="container-x py-14 lg:py-20">
      <header className="flex flex-wrap items-end justify-between gap-8 border-b border-ink pb-8">
        <div>
          <p className="label text-steel-600">{settings.sale_mode === 'preorder' ? 'The Forward series · Preorder' : 'The Forward series'}</p>
          <h1 className="display mt-4 text-6xl sm:text-7xl lg:text-8xl">Shop</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by colour">
          <Link
            href="/shop"
            aria-pressed={!active}
            className={`label flex h-10 items-center border px-4 transition-colors ${!active ? 'border-ink bg-ink text-bone' : 'border-ink/15 hover:border-ink'}`}
          >
            All
          </Link>
          {colours.map((c) => {
            const on = active?.name === c.name;
            return (
              <Link
                key={c.name}
                href={`/shop?colour=${colourSlug(c.name)}`}
                aria-pressed={on}
                className={`label flex h-10 items-center gap-2.5 border px-4 transition-colors ${on ? 'border-ink bg-ink text-bone' : 'border-ink/15 hover:border-ink'}`}
              >
                <span className="size-3 rounded-full ring-1 ring-ink/15" style={{ backgroundColor: c.hex }} />
                {c.name}
              </Link>
            );
          })}
        </div>
      </header>

      <p className="label mt-6 text-steel-600" aria-live="polite">
        {shown.length} {shown.length === 1 ? 'product' : 'products'}
      </p>
      <div className="mt-8 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((product, i) => (
          // Keyed by colour too, so cards re-seed their selected swatch when the filter changes.
          <ProductCard key={`${product.id}-${active?.name ?? ''}`} product={product} mode={settings.sale_mode} index={i} colour={active?.name} />
        ))}
      </div>
      {!shown.length ? <p className="mt-12 text-steel-600">Nothing here yet.</p> : null}
    </section>
  );
}
