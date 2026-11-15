import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { getSettings, listActiveProducts } from '@/lib/catalog';
import { colourMatches, colourSlug } from '@/lib/colour';
import { CATEGORIES, EDITIONS, type Category } from '@/lib/lines';
import { COLLECTIONS } from '@/content/collections';

export const metadata = {
  title: 'Luggage, Suitcases & Travel Bags in Pakistan',
  description:
    'Shop Torvaxo luggage in Pakistan: hardshell suitcases and trolley bags, 3-piece luggage sets, backpacks, duffel bags, sling bags and spare wheels. Delivery nationwide, cash on delivery.',
  alternates: { canonical: '/shop' },
};

// "bags" groups every bag category for the menu link.
const BAG_CATEGORIES: Category[] = ['backpacks', 'work', 'slings', 'duffels'];

type Query = { category?: string; edition?: string; colour?: string };

function href(query: Query) {
  const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v) as [string, string][]);
  const qs = params.toString();
  return qs ? `/shop?${qs}` : '/shop';
}

function Filter({ to, on, children }: { to: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      aria-pressed={on}
      className={`label flex h-10 shrink-0 items-center gap-2.5 border px-4 text-[10px] transition-colors ${on ? 'border-ink bg-ink text-bone' : 'border-ink/15 hover:border-ink'}`}
    >
      {children}
    </Link>
  );
}

export default async function ShopPage(props: PageProps<'/shop'>) {
  const raw = await props.searchParams;
  const pick = (key: string) => (typeof raw[key] === 'string' ? (raw[key] as string) : undefined);
  const query: Query = { category: pick('category'), edition: pick('edition'), colour: pick('colour') };
  const [settings, products] = await Promise.all([getSettings(), listActiveProducts()]);

  const categories = (Object.keys(CATEGORIES) as Category[]).filter((c) => products.some((p) => p.category === c));
  const inCategory = (p: (typeof products)[number]) =>
    !query.category || (query.category === 'bags' ? BAG_CATEGORIES.includes(p.category as Category) : p.category === query.category);
  const inEdition = (p: (typeof products)[number]) => !query.edition || p.edition === query.edition;

  // Colours offered are the ones in the current category and edition.
  const scoped = products.filter((p) => inCategory(p) && inEdition(p));
  const colours = [
    ...new Map(scoped.flatMap((p) => p.product_variants.map((v) => [v.color_name, { name: v.color_name, hex: v.color_hex }]))).values(),
  ];
  const colour = colours.find((c) => colourMatches(c.name, query.colour)) ?? null;
  const shown = colour ? scoped.filter((p) => p.product_variants.some((v) => v.color_name === colour.name)) : scoped;

  const title =
    query.edition === 'signature'
      ? 'Signature'
      : query.category === 'bags'
        ? 'Bags'
        : query.category && query.category in CATEGORIES
          ? CATEGORIES[query.category as Category].label
          : 'Shop';

  return (
    <section className="container-x py-14 lg:py-20">
      <header className="border-b border-ink pb-8">
        <p className="label text-steel-600">{settings.sale_mode === 'preorder' ? 'Torvaxo · Preorder' : 'Torvaxo'}</p>
        <h1 className="display mt-4 text-6xl sm:text-7xl lg:text-8xl">{title}</h1>

        <div className="mt-8 space-y-3">
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by category">
            <Filter to={href({ ...query, category: undefined, colour: undefined })} on={!query.category}>
              All
            </Filter>
            {categories.map((c) => (
              <Filter key={c} to={href({ ...query, category: c, colour: undefined })} on={query.category === c}>
                {CATEGORIES[c].label}
              </Filter>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2" role="group" aria-label="Filter by edition">
              {(Object.keys(EDITIONS) as (keyof typeof EDITIONS)[]).map((e) => (
                <Filter key={e} to={href({ ...query, edition: query.edition === e ? undefined : e, colour: undefined })} on={query.edition === e}>
                  {EDITIONS[e]}
                </Filter>
              ))}
            </div>
            <span className="mx-1 hidden h-6 w-px bg-ink/15 sm:block" aria-hidden="true" />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by colour">
              {colours.map((c) => {
                const on = colour?.name === c.name;
                return (
                  <Filter key={c.name} to={href({ ...query, colour: on ? undefined : colourSlug(c.name) })} on={on}>
                    <span className="size-3 rounded-full ring-1 ring-ink/15" style={{ backgroundColor: c.hex }} />
                    {c.name}
                  </Filter>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <nav className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink/60" aria-label="Popular">
        <span className="label text-[10px] text-steel-600">Popular</span>
        {COLLECTIONS.map((c) => (
          <Link key={c.slug} href={`/collections/${c.slug}`} className="underline-offset-4 hover:text-ink hover:underline">
            {c.nav}
          </Link>
        ))}
      </nav>

      <p className="label mt-6 text-steel-600" aria-live="polite">
        {shown.length} {shown.length === 1 ? 'product' : 'products'}
      </p>
      <div className="mt-8 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((product, i) => (
          // Keyed by colour too, so cards re-seed their selected swatch when the filter changes.
          <ProductCard key={`${product.id}-${colour?.name ?? ''}`} product={product} mode={settings.sale_mode} index={i} colour={colour?.name} />
        ))}
      </div>
      {!shown.length ? (
        <p className="mt-12 text-steel-600">
          Nothing here yet.{' '}
          <Link href="/shop" className="underline underline-offset-4 hover:text-ink">
            See everything
          </Link>
        </p>
      ) : null}
    </section>
  );
}
