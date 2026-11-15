import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Chevrons } from '@/components/brand';
import { CollectionDetails, CollectionFeature, CollectionPerks } from '@/components/collection-feature';
import { JsonLd, breadcrumbs, faqPage, abs } from '@/components/json-ld';
import { ProductCard, priceRange } from '@/components/product-card';
import { COLLECTIONS, getCollection } from '@/content/collections';
import { GUIDES } from '@/content/guides';
import { getSettings, listActiveProducts } from '@/lib/catalog';
import { money } from '@/lib/pricing';

async function load(slug: string) {
  const collection = getCollection(slug);
  if (!collection) return null;
  const [settings, products] = await Promise.all([getSettings(), listActiveProducts()]);
  const items = products.filter(collection.filter);
  // A page with only a few products also shows others that go with them, closest category first.
  const others = products
    .filter((p) => !items.includes(p))
    .sort((a, b) => Number(b.category === items[0]?.category) - Number(a.category === items[0]?.category));
  const pairs = items.length < 4 ? others.slice(0, 4) : [];
  const prices = items.map((p) => priceRange(p, settings.sale_mode).price);
  const from = prices.length ? money(Math.min(...prices)) : '';
  const fill = (text: string) => text.replaceAll('{from}', from);
  return { collection, settings, items, pairs, fill };
}

export async function generateMetadata(props: PageProps<'/collections/[slug]'>) {
  const { slug } = await props.params;
  const data = await load(slug);
  if (!data) return { title: 'Not found' };
  const { collection, items, fill } = data;
  return {
    title: collection.title,
    description: fill(collection.description),
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: {
      title: collection.title,
      description: fill(collection.description),
      images: items.slice(0, 1).flatMap((p) => p.product_images.slice(0, 1).map((i) => abs(i.url))),
    },
  };
}

export default async function CollectionPage(props: PageProps<'/collections/[slug]'>) {
  const { slug } = await props.params;
  const data = await load(slug);
  if (!data) notFound();
  const { collection, settings, items, pairs, fill } = data;
  const featured = items.length > 0 && items.length < 4;
  const luggage = items.some((p) => p.category === 'luggage');
  const faqs = collection.faqs.map((f) => ({ q: f.q, a: fill(f.a) }));
  const related = COLLECTIONS.filter((c) => c.slug !== collection.slug);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbs([
            { name: 'Home', url: '/' },
            { name: 'Shop', url: '/shop' },
            { name: collection.h1, url: `/collections/${collection.slug}` },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: collection.h1,
            itemListElement: items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/products/${p.slug}`), name: p.name })),
          },
          faqPage(faqs),
        ]}
      />

      <section className="container-x py-14 lg:py-20">
        <nav className="label flex items-center gap-2 text-[10px] text-steel-600" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/shop" className="hover:text-ink">
            Shop
          </Link>
          <span aria-hidden="true">/</span>
          <span>{collection.eyebrow}</span>
        </nav>

        <header className="mt-6 grid gap-8 border-b border-ink pb-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="label text-steel-600">
              {collection.eyebrow}
              {settings.sale_mode === 'preorder' ? ' · Preorder' : ''}
            </p>
            <h1 className="display mt-4 text-5xl sm:text-6xl lg:text-7xl">{collection.h1}</h1>
          </div>
          <div className="space-y-4 self-end text-lg leading-relaxed text-ink/70 lg:col-span-5 lg:col-start-8">
            {collection.intro.map((p) => (
              <p key={p}>{fill(p)}</p>
            ))}
          </div>
        </header>

        <p className="label mt-6 text-steel-600">
          {items.length} {items.length === 1 ? 'product' : 'products'}
        </p>
        {featured ? (
          <div className="mt-2">
            {items.map((product, i) => (
              <CollectionFeature key={product.id} product={product} mode={settings.sale_mode} index={i} />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((product, i) => (
              <ProductCard key={product.id} product={product} mode={settings.sale_mode} index={i} />
            ))}
          </div>
        )}
        {!items.length ? (
          <p className="mt-10 text-steel-600">
            Coming soon.{' '}
            <Link href="/shop" className="underline underline-offset-4 hover:text-ink">
              See the whole shop
            </Link>
          </p>
        ) : null}

        <div className="mt-16 lg:mt-20">
          <CollectionPerks />
        </div>
      </section>

      {luggage ? (
        <section className="container-x pb-16 lg:pb-24">
          <p className="label text-steel-600">In every case</p>
          <h2 className="display mt-4 mb-10 text-4xl sm:text-5xl">Built for the trip.</h2>
          <CollectionDetails />
        </section>
      ) : null}

      {pairs.length ? (
        <section className="container-x pb-16 lg:pb-24">
          <div className="flex items-end justify-between gap-6 border-b border-ink pb-6">
            <div>
              <p className="label text-steel-600">Pairs well with</p>
              <h2 className="display mt-4 text-4xl sm:text-5xl">Complete the trip.</h2>
            </div>
            <Link href="/shop" className="btn-outline btn-sm hidden sm:inline-flex">
              See the whole shop
            </Link>
          </div>
          <div className="mt-10 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {pairs.map((product, i) => (
              <ProductCard key={product.id} product={product} mode={settings.sale_mode} index={i} />
            ))}
          </div>
        </section>
      ) : null}

      {faqs.length ? (
        <section className="bg-paper">
          <div className="container-x grid gap-10 py-16 lg:grid-cols-12 lg:py-24">
            <div className="lg:col-span-4">
              <p className="label text-steel-600">Questions</p>
              <h2 className="display mt-4 text-4xl sm:text-5xl">Good to know.</h2>
            </div>
            <div className="border-t border-ink lg:col-span-8">
              {faqs.map((f, i) => (
                <details key={f.q} className="hairline group border-b" open={i === 0}>
                  <summary className="flex list-none items-center justify-between gap-6 py-5 text-lg font-medium tracking-tight [&::-webkit-details-marker]:hidden">
                    <h3>{f.q}</h3>
                    <span className="shrink-0 text-xl transition-transform duration-300 group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-6 leading-relaxed text-ink/70">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="container-x py-16 lg:py-20">
        <p className="label text-steel-600">Keep browsing</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {related.map((c) => (
            <li key={c.slug}>
              <Link href={`/collections/${c.slug}`} className="btn-outline btn-sm">
                {c.nav}
              </Link>
            </li>
          ))}
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="btn-outline btn-sm">
                {g.nav} <Chevrons count={1} className="h-2.5 w-auto text-ember" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
