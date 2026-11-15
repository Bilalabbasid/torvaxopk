import { notFound } from 'next/navigation';
import { JsonLd, abs, breadcrumbs } from '@/components/json-ld';
import { COLLECTIONS } from '@/content/collections';
import { ProductBuyBox, type BundleOffer, type Sibling } from '@/components/product-buy-box';
import { ProductCard, priceRange, singlePrices } from '@/components/product-card';
import { SizeGuide } from '@/components/size-guide';
import { getProductBySlug, getSettings, listActiveProducts } from '@/lib/catalog';
import { colourSlug } from '@/lib/colour';
import { EDITIONS, FORWARD, forwardCases, forwardSet, hasWheels, optionLabel } from '@/lib/lines';
import { money, unitPrice } from '@/lib/pricing';
import { siteUrl } from '@/lib/site-url';

export async function generateMetadata(props: PageProps<'/products/[slug]'>) {
  const { slug } = await props.params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getSettings()]);
  if (!product) return { title: 'Not found' };
  const { price, compareAt } = priceRange(product, settings.sale_mode);
  const preorder = settings.sale_mode === 'preorder' && compareAt;
  const priceText = preorder ? `${money(price)} on preorder (${money(compareAt)} after launch)` : money(price);
  const description = `${product.name}: ${product.tagline} ${priceText}. ${
    product.category === 'luggage' ? 'Hardshell, TSA lock, detachable spinner wheels. ' : ''
  }German brand, 2-year warranty, delivery across Pakistan.`;
  return {
    title: `${product.name} Price in Pakistan`,
    description: description.slice(0, 300),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: `${product.name} | Torvaxo Pakistan`, description, images: product.product_images.slice(0, 1).map((i) => abs(i.url)) },
  };
}

export default async function ProductPage(props: PageProps<'/products/[slug]'>) {
  const [{ slug }, query] = await Promise.all([props.params, props.searchParams]);
  const [product, settings, catalogue] = await Promise.all([getProductBySlug(slug), getSettings(), listActiveProducts()]);
  if (!product) notFound();

  const mode = settings.sale_mode;
  const cases = forwardCases(catalogue);
  const set = forwardSet(catalogue);
  const isForwardSet = product.series === FORWARD && product.is_set;
  const separatePrices = isForwardSet ? singlePrices(catalogue, mode) : undefined;

  // The Forward set: every case and the colours it comes in, so each case can have its own colour.
  const setColours = new Set(product.product_variants.map((v) => v.color_name));
  const setCases = isForwardSet
    ? cases.map((p) => ({
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
    // listings, unless a colour has no other photo (the set, the bags).
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

  // Options: the other products of the same series (sizes of a case, editions of a bag, packs of a part).
  const series = catalogue.filter((p) => p.series === product.series);
  const siblings: Sibling[] = series.map((p) => ({
    slug: p.slug,
    label: p.is_set ? 'Set of 3' : p.size_label,
    price: priceRange(p, mode).price,
  }));
  // Forward and Forward Signature are two editions of the same cases: offer the other one by size.
  const otherEdition =
    product.category === 'luggage' && !product.is_set
      ? catalogue.find(
          (p) =>
            p.category === 'luggage' &&
            !p.is_set &&
            p.edition !== product.edition &&
            p.size_label === product.size_label &&
            (p.series === FORWARD || p.series === `${FORWARD} Signature`),
        )
      : undefined;
  const editions: Sibling[] = otherEdition
    ? [product, otherEdition]
        .sort((a, b) => (a.edition === 'standard' ? -1 : 1) - (b.edition === 'standard' ? -1 : 1))
        .map((p) => ({ slug: p.slug, label: EDITIONS[p.edition], price: priceRange(p, mode).price }))
    : [];

  const spec = (label: string) => product.specs.find((s) => s.label === label)?.value;
  const keyFigures = ['Size', 'Volume', 'Weight', 'Dimensions', 'Total volume', 'Includes']
    .map((label) => ({ label, value: spec(label) ?? '' }))
    .filter((f) => f.value && f.value.length <= 18)
    .slice(0, 4);

  // The set offer, on the standard Forward cases.
  const bundle: BundleOffer | null =
    product.series === FORWARD && !product.is_set && set
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

  // Cross-selling, pre-set to the colour being viewed: on a case the other sizes, on the set the single
  // sizes, on anything else the rest of its line, or failing that more of the same category.
  const sameSeries = series.filter((p) => p.id !== product.id && !(product.series === FORWARD && p.is_set));
  const others = isForwardSet
    ? cases
    : sameSeries.length
      ? sameSeries
      : catalogue.filter((p) => p.category === product.category && p.edition === product.edition && p.id !== product.id).slice(0, 3);
  const suggestions = Object.fromEntries(
    product.product_variants.map((v) => [
      v.color_name,
      others.map((p, i) => <ProductCard key={`${p.id}-${v.color_name}`} product={p} mode={mode} index={i} colour={v.color_name} />),
    ]),
  );

  // The size guide belongs to the cases.
  const sizeGuide =
    product.category === 'luggage'
      ? Object.fromEntries(
          product.product_variants.map((v) => [
            v.color_name,
            <SizeGuide key={v.color_name} products={catalogue} mode={mode} current={product.is_set ? undefined : product.size_label} colour={v.color_name} />,
          ]),
        )
      : undefined;

  // The landing page this product belongs to, for breadcrumbs.
  const landing = COLLECTIONS.find((c) => c.filter(product));

  const wantedColour = typeof query.colour === 'string' ? colourSlug(query.colour) : null;

  // Product structured data (Google rich results: price, availability, PKR).
  const site = siteUrl();
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
      <JsonLd
        data={[
          jsonLd,
          breadcrumbs([
            { name: 'Home', url: '/' },
            ...(landing ? [{ name: landing.h1, url: `/collections/${landing.slug}` }] : [{ name: 'Shop', url: '/shop' }]),
            { name: product.name, url: `/products/${product.slug}` },
          ]),
        ]}
      />
      <ProductBuyBox
        key={product.slug}
        product={{
          name: product.name,
          slug: product.slug,
          tagline: product.tagline,
          description: product.description,
          isSet: product.is_set,
          category: product.category,
          optionLabel: optionLabel(product.category),
          hasWheels: hasWheels(product.category),
          specs: product.specs,
          features: product.features,
        }}
        variants={variants}
        mode={mode}
        depositAmount={settings.deposit_amount}
        couponPercent={settings.launch_coupon_percent}
        shipping={{ flat: settings.shipping_flat, freeFrom: settings.shipping_free_from }}
        separatePrices={separatePrices}
        cases={setCases}
        siblings={siblings}
        editions={editions}
        keyFigures={keyFigures}
        bundle={bundle}
        initialColour={wantedColour}
        suggestions={suggestions}
        sizeGuide={sizeGuide}
      />
    </>
  );
}
