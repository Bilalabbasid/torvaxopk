import type React from 'react';
import Link from 'next/link';
import { Chevrons } from '@/components/brand';
import { ColourStory } from '@/components/colour-story';
import { PriceTag, ProductCard, priceRange, singlePrices } from '@/components/product-card';
import { TripPicker, type TripOption } from '@/components/trip-picker';
import { getSettings, listActiveProducts } from '@/lib/catalog';
import { forwardCases, forwardSet } from '@/lib/lines';
import { money, unitPrice } from '@/lib/pricing';

const technology = [
  {
    image: '/images/detail-lock.jpg',
    title: 'Locked in.',
    body: 'A TSA combination lock is built into the frame, with both zip pullers docking straight into it. Nothing to attach, nothing to lose.',
    tag: 'TSA combination lock',
  },
  {
    image: '/images/detail-wheels.jpg',
    title: 'Wheels that come off.',
    body: 'Four 360° double spinners glide in any direction. Each one detaches, so a worn wheel is a quick swap rather than the end of a suitcase.',
    tag: 'Detachable 360° spinners',
  },
  {
    image: '/images/detail-interior.jpg',
    title: 'A place for everything.',
    body: 'A zipped divider with a mesh pocket on one side, compression straps on the other. What you pack stays where you packed it.',
    tag: 'Divider · Mesh pocket · Straps',
  },
];

const marquee = ['German quality', 'Built to EU standards', 'Elegance endures', 'TSA lock built in', 'Detachable spinners', '2-year warranty', 'Three sizes', 'Three colours', 'Delivered across Pakistan'];

export default async function HomePage() {
  const [settings, products] = await Promise.all([getSettings(), listActiveProducts()]);
  const mode = settings.sale_mode;
  // The home page tells the story of the Forward cases; other lines live on the shop and product pages.
  const singles = forwardCases(products);
  const set = forwardSet(products);
  const setPrice = set ? priceRange(set, mode) : null;
  const fromPrice = singles.length ? Math.min(...singles.map((p) => priceRange(p, mode).price)) : null;
  const preorder = mode === 'preorder';
  const separate = singlePrices(products, mode);
  const separateTotal = separate.reduce((sum, p) => sum + p, 0);
  const setSaving = setPrice && separate.length > 1 ? separateTotal - setPrice.price : 0;
  const spec = (p: (typeof singles)[number], label: string) => p.specs.find((x) => x.label === label)?.value;
  const tripOptions: TripOption[] = singles.map((p) => {
    const variant = p.product_variants.find((v) => v.stock > 0) ?? p.product_variants[0];
    const own = p.product_images.filter((img) => img.variant_id === variant?.id);
    const image = own.find((img) => img.is_listing) ?? own[0] ?? p.product_images[0];
    const { price, compareAt } = variant ? unitPrice(variant, mode) : { price: priceRange(p, mode).price, compareAt: null };
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      sizeLabel: p.size_label,
      inches: (spec(p, 'Size') ?? p.size_label).replace(/\s*inch$/i, '″'),
      bestFor: spec(p, 'Best for') ?? p.tagline,
      facts: ['Dimensions', 'Volume', 'Weight'].flatMap((label) => {
        const value = spec(p, label);
        return value ? [{ label, value }] : [];
      }),
      variantId: variant?.id ?? null,
      soldOut: !variant || variant.stock <= 0,
      price,
      afterLaunch: preorder ? compareAt : null,
      image: image ? { url: image.url, alt: image.alt } : null,
    };
  });

  return (
    <>
      {/* 01 Hero */}
      <section className="relative overflow-hidden bg-paper">
        <div className="container-x grid items-center gap-y-4 pt-10 pb-14 lg:min-h-[min(calc(100svh-100px),820px)] lg:grid-cols-12 lg:py-0">
          <div className="relative z-10 lg:col-span-5">
            <p className="label flex items-center gap-3 text-steel-600">
              <span className="h-px w-8 bg-ember" />
              {preorder ? 'German quality · The Forward series · Preorder Pakistan' : 'German quality · The Forward series · Now in Pakistan'}
            </p>
            <h1 className="display mt-6 text-[clamp(3.25rem,8.2vw,7.5rem)]">
              Elegance
              <br />
              endures.
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-ink/70">
              Hardshell luggage from Germany, built to EU quality standards and made to look as good on its hundredth trip
              as on its first. Locked, organised and rolling on wheels you can replace yourself.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/shop" className="btn-primary">
                {preorder ? 'Preorder now' : 'Shop the series'} <Chevrons count={3} className="h-3 w-auto text-ember" />
              </Link>
              <Link href="/launch" className="btn-outline">
                {preorder ? 'How preorder works' : `${settings.launch_coupon_percent}% launch reward`}
              </Link>
            </div>
            {fromPrice ? (
              <p className="label mt-8 text-steel-600">
                From {money(fromPrice)} {preorder ? '· Preorder price, goes up at launch' : ''}
              </p>
            ) : null}
          </div>
          <div className="relative lg:col-span-7 lg:-mr-12 xl:-mr-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/hero-trio.jpg"
              alt="The Forward series: a Glacier Blue cabin case, a Graphite medium case and a Black large case"
              className="hero-image w-full"
              width={2048}
              height={1360}
              fetchPriority="high"
            />
          </div>
        </div>
        <dl className="container-x hairline grid grid-cols-3 border-t">
          {[
            ['3', 'Sizes, cabin to large'],
            ['360°', 'Detachable spinners'],
            ['TSA', 'Lock built into the frame'],
          ].map(([value, label]) => (
            <div key={label} className="hairline border-l py-5 pl-4 first:border-l-0 first:pl-0 sm:py-7 sm:pl-8">
              <dt className="display text-3xl sm:text-5xl">{value}</dt>
              <dd className="label mt-2 text-[10px] text-steel-600 sm:text-[11px]">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Marquee */}
      <div className="overflow-hidden bg-ink py-4 text-bone" aria-hidden="true">
        <div className="flex w-max animate-drift">
          {[0, 1, 2, 3].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {marquee.map((word) => (
                <span key={word} className="label flex items-center gap-8 pr-8 text-bone/80">
                  {word}
                  <Chevrons count={2} className="h-3 w-auto text-ember" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Origin: an editorial split, a product photo beside the German-quality story. */}
      <section className="container-x py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="reveal relative lg:col-span-6">
            <div className="aspect-[4/5] overflow-hidden bg-paper sm:aspect-[5/4] lg:aspect-[4/5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/products/forward-large-glacier.jpg"
                alt="Forward Large in Glacier Blue"
                loading="lazy"
                className="size-full object-contain"
              />
            </div>
            <p className="label absolute bottom-0 left-0 flex items-center gap-3 bg-ink px-4 py-3 text-[10px] text-bone">
              <Chevrons count={2} className="h-2.5 w-auto text-ember" />
              German brand · EU standards
            </p>
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <p className="reveal label text-steel-600">From Germany</p>
            <h2 className="reveal display mt-4 text-5xl sm:text-6xl" style={{ '--reveal-delay': '80ms' } as React.CSSProperties}>
              German quality.
              <br />
              EU standards.
            </h2>
            <p
              className="reveal mt-6 max-w-md text-lg leading-relaxed text-ink/70"
              style={{ '--reveal-delay': '140ms' } as React.CSSProperties}
            >
              Torvaxo is a German luggage brand. The Forward series is built to the quality standards of the European market,
              and that is the case we deliver in Pakistan.
            </p>

            <ul className="mt-10 grid gap-px bg-ink/10 p-px sm:grid-cols-2">
              {[
                ['German brand', 'Made for the European market first'],
                ['EU quality standards', 'The same case, delivered here'],
                ['2-year warranty', 'On every Forward case'],
                ['Replaceable wheels', 'A worn wheel is a quick swap'],
              ].map(([title, text], i) => (
                <li
                  key={title}
                  className="reveal flex gap-4 bg-bone p-5"
                  style={{ '--reveal-delay': `${180 + i * 60}ms` } as React.CSSProperties}
                >
                  <span className="label mt-0.5 text-[10px] text-ember-600">0{i + 1}</span>
                  <span>
                    <span className="block font-medium tracking-tight">{title}</span>
                    <span className="mt-1 block text-[13px] text-ink/60">{text}</span>
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/warranty"
              className="label mt-8 inline-block border-b border-ink pb-1 transition-colors hover:border-ember hover:text-ember-600"
            >
              About the warranty
            </Link>
          </div>
        </div>
      </section>

      {/* Offer: three steps in a row, joined by the forward chevrons, on their own paper band. */}
      <section className="hairline border-y bg-paper">
        <div className="container-x py-20 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="reveal label text-steel-600">{preorder ? 'How preorder works' : 'Launch reward'}</p>
            <h2 className="reveal display mt-4 text-4xl sm:text-5xl" style={{ '--reveal-delay': '80ms' } as React.CSSProperties}>
              {preorder ? 'Lock your price today.' : 'Buy now, save all year.'}
            </h2>
          </div>
          <Link href="/launch" className="label border-b border-ink pb-1 transition-colors hover:border-ember hover:text-ember-600">
            Read more
          </Link>
        </div>
        <ol className="mt-10 grid gap-y-10 md:grid-cols-3 md:gap-x-10 lg:mt-14 lg:gap-x-14">
          {(preorder
            ? [
                [
                  'Preorder price',
                  setPrice?.compareAt
                    ? `A lower price for preorders only, not a sale. The Set of Three is ${money(setPrice.price)} now and ${money(setPrice.compareAt)} after launch.`
                    : 'A lower price for preorders only, not a sale. Every case goes to its regular price at launch.',
                ],
                [`${money(settings.deposit_amount)} deposit`, 'Pay it today by card, JazzCash or Easypaisa. The rest is due when your order ships.'],
                ['Fully refundable', 'Changed your mind before dispatch? Your deposit comes back in full.'],
              ]
            : [
                ['Launch reward', `Every launch purchase earns a personal ${settings.launch_coupon_percent}% code for everything on torvaxo.pk.`],
                ['Valid for a year', 'Use it as often as you like for 12 months with the email you ordered with.'],
                ['Pay your way', 'Card, JazzCash, Easypaisa or cash on delivery anywhere in Pakistan.'],
              ]
          ).map(([title, body], i) => (
            <li
              key={title}
              className="reveal relative border-t border-ink pt-6"
              style={{ '--reveal-delay': `${i * 90}ms` } as React.CSSProperties}
            >
              <div className="flex items-center justify-between">
                <span className="display text-6xl text-ink/15 tabular-nums">0{i + 1}</span>
                {i < 2 ? <Chevrons count={2} className="hidden h-4 w-auto text-ember md:block" /> : null}
              </div>
              <h3 className="mt-6 text-2xl font-medium tracking-tight">{title}</h3>
              <p className="mt-3 max-w-sm leading-relaxed text-ink/65">{body}</p>
            </li>
          ))}
        </ol>
        </div>
      </section>

      {/* 02 Line-up */}
      <section className="container-x pt-24 pb-20 lg:pt-32 lg:pb-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="reveal label text-steel-600">02 — The line-up</p>
            <h2 className="reveal display mt-4 text-5xl sm:text-6xl lg:text-7xl" style={{ '--reveal-delay': '80ms' } as React.CSSProperties}>
              One shape.
              <br />
              Three sizes.
            </h2>
          </div>
          <Link href="/shop" className="label border-b border-ink pb-1 transition-colors hover:border-ember hover:text-ember-600">
            View all
          </Link>
        </div>

        <div className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          {singles.map((product, i) => (
            <ProductCard key={product.id} product={product} mode={mode} index={i} />
          ))}
        </div>

        {set && setPrice ? (
          <Link href={`/products/${set.slug}`} className="group mt-20 grid overflow-hidden bg-ink text-bone lg:mt-28 lg:grid-cols-2">
            <div className="flex flex-col justify-between gap-10 p-8 sm:p-12 lg:p-16">
              <p className="label text-ember">{preorder ? 'The complete set · Preorder' : 'The complete set'}</p>
              <div>
                <h3 className="display text-4xl sm:text-5xl lg:text-6xl">
                  All three.
                  <br />
                  One matched set.
                </h3>
                <p className="mt-5 max-w-sm text-bone/70">{set.description}</p>
                {setSaving > 0 ? (
                  <p className="mt-5 max-w-sm font-mono text-sm tabular-nums text-bone/70">
                    One by one{preorder ? ' (preorder)' : ''}: {separate.map((p) => money(p)).join(' + ')} = {money(separateTotal)}
                    <span className="mt-1 block text-ember">
                      As a set{preorder ? ' (preorder)' : ''}: {money(setPrice.price)} · saves {money(setSaving)}
                    </span>
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-bone/15 pt-6">
                <PriceTag price={setPrice.price} compareAt={setPrice.compareAt} preorder={preorder} className="text-xl" dark />
                <span className="label flex items-center gap-3 whitespace-nowrap">
                  {preorder ? 'Preorder the set' : 'Shop the set'}
                  <Chevrons count={3} className="h-3.5 w-auto text-ember transition-transform duration-500 group-hover:translate-x-1.5" />
                </span>
              </div>
            </div>
            <div className="overflow-hidden bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={set.product_images[0]?.url}
                alt={set.product_images[0]?.alt ?? set.name}
                loading="lazy"
                className="h-full min-h-72 w-full object-contain transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.03]"
              />
            </div>
          </Link>
        ) : null}
      </section>

      {/* 03 Technology */}
      <section id="technology" className="bg-ink text-bone">
        <div className="container-x py-20 lg:py-32">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="reveal label text-ember">03 — Technology</p>
              <h2 className="reveal display mt-4 text-5xl sm:text-6xl lg:text-7xl" style={{ '--reveal-delay': '80ms' } as React.CSSProperties}>
                Built for the
                <br />
                parts of travel
                <br />
                that go wrong.
              </h2>
            </div>
            <p className="self-end text-lg leading-relaxed text-bone/65 lg:col-span-4 lg:col-start-9">
              Wheels wear out. Zips get forced. Cases get thrown around. Every detail on a Forward case is there because of a
              moment like that.
            </p>
          </div>
          <div className="mt-14 grid gap-px bg-bone/10 lg:mt-20 lg:grid-cols-3">
            {technology.map((item, i) => (
              <article key={item.title} className="group bg-ink">
                <div className="overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.tag}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-6 sm:p-8">
                  <p className="label flex items-center justify-between text-steel">
                    <span>0{i + 1}</span>
                    <span>{item.tag}</span>
                  </p>
                  <h3 className="mt-5 text-2xl font-medium tracking-tight">{item.title}</h3>
                  <p className="mt-3 leading-relaxed text-bone/65">{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 04 Colours */}
      {set ? (
        <ColourStory
          colours={set.product_variants.map((v) => ({
            id: v.id,
            name: v.color_name,
            hex: v.color_hex,
            image: set.product_images.find((img) => img.variant_id === v.id)?.url ?? '',
          }))}
        />
      ) : null}

      {/* 05 Find your size */}
      {tripOptions.length > 1 ? (
        <section id="find-your-size" className="container-x pt-20 lg:pt-28">
          <p className="reveal label text-steel-600">05 — Find your size</p>
          <h2 className="reveal display mt-4 mb-12 text-5xl sm:text-6xl lg:mb-16 lg:text-7xl" style={{ '--reveal-delay': '80ms' } as React.CSSProperties}>
            How long are
            <br />
            you away?
          </h2>
          <TripPicker options={tripOptions} preorder={preorder} />
        </section>
      ) : null}

      {/* Closing call to action */}
      <section className="relative overflow-hidden bg-ember text-ink">
        <svg className="absolute inset-0 size-full text-ink/[0.07]" aria-hidden="true">
          <defs>
            <pattern id="forward-strip" width="260" height="420" patternUnits="userSpaceOnUse">
              <polygon points="0,0 82,0 260,210 82,420 0,420 178,210" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#forward-strip)" />
        </svg>
        <div className="container-x relative flex flex-wrap items-end justify-between gap-8 py-20 lg:py-28">
          <h2 className="reveal display text-6xl sm:text-7xl lg:text-8xl">
            Move
            <br />
            forward.
          </h2>
          <Link href="/shop" className="btn bg-ink text-bone hover:bg-bone hover:text-ink">
            {preorder ? 'Preorder the Forward series' : 'Shop the Forward series'} <Chevrons count={1} className="h-3 w-auto" />
          </Link>
        </div>
      </section>
    </>
  );
}
