import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductBuyBox } from '@/components/product-buy-box';
import { singlePrices } from '@/components/product-card';
import { getProductBySlug, getSettings, listActiveProducts } from '@/lib/catalog';
import { money, unitPrice } from '@/lib/pricing';

export async function generateMetadata(props: PageProps<'/products/[slug]'>) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Not found' };
  return {
    title: product.name,
    description: `${product.tagline} ${product.description}`.slice(0, 160),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.name, description: product.tagline, images: product.product_images.slice(0, 1).map((i) => i.url) },
  };
}

export default async function ProductPage(props: PageProps<'/products/[slug]'>) {
  const { slug } = await props.params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getSettings()]);
  if (!product) notFound();

  const mode = settings.sale_mode;
  const catalogue = product.is_set ? await listActiveProducts() : [];
  const separatePrices = product.is_set ? singlePrices(catalogue, mode) : undefined;
  // Sets: every case and the colours it comes in, so each case can have its own colour.
  const setColours = new Set(product.product_variants.map((v) => v.color_name));
  const cases = product.is_set
    ? catalogue
        .filter((p) => !p.is_set)
        .map((p) => ({
          label: p.size_label,
          colours: p.product_variants
            .filter((v) => setColours.has(v.color_name))
            .map((v) => {
              const own = p.product_images.filter((img) => img.variant_id === v.id);
              return { name: v.color_name, hex: v.color_hex, image: (own.find((img) => img.is_listing) ?? own[0])?.url ?? '' };
            }),
        }))
    : undefined;
  const variants = product.product_variants.map((v) => {
    // Gallery: this colour's own photos first, then the shared detail shots. The Set of Three only has
    // its listing photo per colour, so fall back to that rather than showing no photo of the colour.
    const own = product.product_images.filter((img) => img.variant_id === v.id);
    const gallery = own.filter((img) => !img.is_listing);
    return {
      id: v.id,
      colorName: v.color_name,
      colorHex: v.color_hex,
      stock: v.stock,
      ...unitPrice(v, mode),
      images: (gallery.length ? gallery : own)
        .concat(product.product_images.filter((img) => !img.variant_id))
        .map((img) => ({ url: img.url, alt: img.alt })),
    };
  });

  // Product structured data (Google rich results: price, availability, PKR).
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const abs = (u: string) => (u.startsWith('http') ? u : `${site}${u}`);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProductGroup',
    name: product.name,
    description: product.description,
    brand: { '@type': 'Brand', name: 'Torvaxo' },
    url: `${site}/products/${product.slug}`,
    productGroupID: product.slug,
    variesBy: ['https://schema.org/color'],
    hasVariant: product.product_variants.map((v) => ({
      '@type': 'Product',
      name: `${product.name} — ${v.color_name}`,
      sku: v.sku,
      color: v.color_name,
      image: product.product_images.filter((i) => i.variant_id === v.id).slice(0, 3).map((i) => abs(i.url)),
      offers: {
        '@type': 'Offer',
        price: unitPrice(v, mode).price,
        priceCurrency: 'PKR',
        availability:
          v.stock <= 0
            ? 'https://schema.org/SoldOut'
            : mode === 'preorder'
              ? 'https://schema.org/PreOrder'
              : 'https://schema.org/InStock',
        url: `${site}/products/${product.slug}`,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped cannot break out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <nav className="container-x label pt-8 text-steel-600" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-ink">
          Shop
        </Link>{' '}
        / {product.name}
      </nav>
      <ProductBuyBox
        product={{ name: product.name, tagline: product.tagline, description: product.description, sizeLabel: product.size_label }}
        variants={variants}
        mode={mode}
        depositAmount={settings.deposit_amount}
        couponPercent={settings.launch_coupon_percent}
        separatePrices={separatePrices}
        cases={cases}
      />

      <section className="container-x grid gap-12 border-t hairline py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="label text-steel-600">Specifications</p>
          <h2 className="display mt-4 text-4xl">The details.</h2>
        </div>
        <dl className="lg:col-span-8">
          {product.specs.map((spec) => (
            <div key={spec.label} className="hairline grid grid-cols-3 gap-4 border-b py-4">
              <dt className="label pt-1 text-steel-600">{spec.label}</dt>
              <dd className="col-span-2">{spec.value}</dd>
            </div>
          ))}
          <div className="mt-10">
            <p className="label text-steel-600">Features</p>
            <ul className="mt-4 space-y-2">
              {product.features.map((f) => (
                <li key={f} className="flex gap-3">
                  <span className="text-ember">›</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </dl>
      </section>

      {mode === 'preorder' ? (
        <section className="bg-ink text-bone">
          <div className="container-x grid gap-8 py-14 md:grid-cols-3">
            <p className="label text-ember md:col-span-1">How preorder works</p>
            <p className="text-bone/70 md:col-span-2">
              Pay a {money(settings.deposit_amount)} deposit today to lock in the preorder price. It is not a sale: the
              preorder price ends at launch, when every case goes to its regular price. We email you a secure link to pay
              the balance (online or cash on delivery) when your order is ready to ship.{' '}
              <Link href="/launch" className="text-bone underline underline-offset-4 hover:text-ember">
                Read more
              </Link>
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
