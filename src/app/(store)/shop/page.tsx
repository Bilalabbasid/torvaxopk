import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { getSettings, listActiveProducts } from '@/lib/catalog';

export const metadata = {
  title: 'Shop hardshell luggage',
  description: 'The Torvaxo Forward series: cabin, medium and large hardshell suitcases and the matched Set of Three. Delivered across Pakistan.',
  alternates: { canonical: '/shop' },
};

export default async function ShopPage(props: PageProps<'/shop'>) {
  const { colour } = await props.searchParams;
  const selected = typeof colour === 'string' ? colour : null;
  const [settings, products] = await Promise.all([getSettings(), listActiveProducts()]);
  const colours = [...new Set(products.flatMap((p) => p.product_variants.map((v) => v.color_name)))];
  const shown = selected
    ? products.filter((p) => p.product_variants.some((v) => v.color_name.toLowerCase() === selected.toLowerCase()))
    : products;

  return (
    <section className="container-x py-14 lg:py-20">
      <p className="label text-steel-600">{settings.sale_mode === 'preorder' ? 'Preorder · The Forward series' : 'The Forward series'}</p>
      <h1 className="display mt-4 text-5xl sm:text-7xl">Shop</h1>

      <div className="mt-10 flex flex-wrap gap-2">
        <Link href="/shop" className={`btn-sm btn ${!selected ? 'bg-ink text-bone' : 'border border-ink/15 hover:border-ink'}`}>
          All
        </Link>
        {colours.map((c) => (
          <Link
            key={c}
            href={`/shop?colour=${encodeURIComponent(c)}`}
            className={`btn-sm btn ${selected?.toLowerCase() === c.toLowerCase() ? 'bg-ink text-bone' : 'border border-ink/15 hover:border-ink'}`}
          >
            {c}
          </Link>
        ))}
      </div>

      <div className="mt-12 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((product, i) => (
          <ProductCard key={product.id} product={product} mode={settings.sale_mode} index={i} />
        ))}
      </div>
      {!shown.length ? <p className="mt-12 text-steel-600">Nothing here yet.</p> : null}
    </section>
  );
}
