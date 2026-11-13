import { notFound } from 'next/navigation';
import { ProductBuyBox, type BundleOffer, type Sibling } from '@/components/product-buy-box';
import { ProductCard, priceRange, singlePrices } from '@/components/product-card';
import { SizeGuide } from '@/components/size-guide';
import { getProductBySlug, getSettings, listActiveProducts } from '@/lib/catalog';
import { colourSlug } from '@/lib/colour';
import { unitPrice } from '@/lib/pricing';

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
  const [{ slug }, query] = await Promise.all([props.params, props.searchParams]);
  const [product, settings, catalogue] = await Promise.all([getProductBySlug(slug), getSettings(), listActiveProducts()]);
  if (!product) notFound();

  const mode = settings.sale_mode;
  const singles = catalogue.filter((p) => !p.is_set);
  const set = catalogue.find((p) => p.is_set);
  const separatePrices = product.is_set ? singlePrices(catalogue, mode) : undefined;

  // Sets: every case and the colours it comes in, so each case can have its own colour.
  const setColours = new Set(product.product_variants.map((v) => v.color_name));
  const cases = product.is_set
    ? singles.map((p) => ({
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
    // Gallery: this colour's photos first, then the shared detail shots. Card (listing) photos are for
    // listings, except on the Set of Three, whose only photo per colour is its listing shot.
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

  // Size tiles: the three cases, then the set.
  const siblings: Sibling[] = [...singles, ...(set ? [set] : [])].map((p) => ({
    slug: p.slug,
    label: p.is_set ? 'Set of 3' : p.size_label,
    price: priceRange(p, mode).price,
  }));

  const spec = (label: string) => product.specs.find((s) => s.label === label)?.value;
  const keyFigures = ['Size', 'Volume', 'Weight', 'Dimensions', 'Total volume', 'Includes']
    .map((label) => ({ label, value: spec(label) ?? '' }))
    .filter((f) => f.value && f.value.length <= 18)
    .slice(0, 4);

  const bundle: BundleOffer | null =
    !product.is_set && set
      ? {
          slug: set.slug,
          name: set.name,
          oneByOne: singlePrices(catalogue, mode).reduce((sum, p) => sum + p, 0),
          colours: set.product_variants.map((v) => {
            const image = set.product_images.find((img) => img.variant_id === v.id);
            return { name: v.color_name, price: unitPrice(v, mode).price, image: image ? { url: image.url, alt: image.alt } : null };
          }),
        }
      : null;

  // Cross-selling: the other cases (or, on the set, the single sizes), pre-set to the colour being viewed.
  const others = product.is_set ? singles : singles.filter((p) => p.id !== product.id);
  const suggestions = Object.fromEntries(
    product.product_variants.map((v) => [
      v.color_name,
      others.map((p, i) => <ProductCard key={`${p.id}-${v.color_name}`} product={p} mode={mode} index={i} colour={v.color_name} />),
    ]),
  );

  const sizeGuide = Object.fromEntries(
    product.product_variants.map((v) => [
      v.color_name,
      <SizeGuide key={v.color_name} products={catalogue} mode={mode} current={product.slug} colour={v.color_name} />,
    ]),
  );

  const wantedColour = typeof query.colour === 'string' ? colourSlug(query.colour) : null;

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
        url: `${site}/products/${product.slug}?colour=${colourSlug(v.color_name)}`,
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
      <ProductBuyBox
        key={product.slug}
        product={{
          name: product.name,
          slug: product.slug,
          tagline: product.tagline,
          description: product.description,
          isSet: product.is_set,
          specs: product.specs,
          features: product.features,
        }}
        variants={variants}
        mode={mode}
        depositAmount={settings.deposit_amount}
        couponPercent={settings.launch_coupon_percent}
        shipping={{ flat: settings.shipping_flat, freeFrom: settings.shipping_free_from }}
        separatePrices={separatePrices}
        cases={cases}
        siblings={siblings}
        keyFigures={keyFigures}
        bundle={bundle}
        initialColour={wantedColour}
        suggestions={suggestions}
        sizeGuide={sizeGuide}
      />
    </>
  );
}
