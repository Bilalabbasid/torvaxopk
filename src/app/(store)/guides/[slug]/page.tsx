import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Chevrons } from '@/components/brand';
import { JsonLd, breadcrumbs, faqPage, SITE } from '@/components/json-ld';
import { COLLECTIONS } from '@/content/collections';
import { GUIDES, getGuide } from '@/content/guides';

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata(props: PageProps<'/guides/[slug]'>) {
  const { slug } = await props.params;
  const guide = getGuide(slug);
  if (!guide) return { title: 'Not found' };
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: { type: 'article', title: guide.title, description: guide.description },
  };
}

export default async function GuidePage(props: PageProps<'/guides/[slug]'>) {
  const { slug } = await props.params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbs([
            { name: 'Home', url: '/' },
            { name: 'Guides', url: `/guides/${GUIDES[0].slug}` },
            { name: guide.h1, url: `/guides/${guide.slug}` },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: guide.h1,
            description: guide.description,
            mainEntityOfPage: `${SITE}/guides/${guide.slug}`,
            author: { '@type': 'Organization', name: 'Torvaxo' },
            publisher: { '@type': 'Organization', name: 'Torvaxo', logo: { '@type': 'ImageObject', url: `${SITE}/icon.svg` } },
          },
          faqPage(guide.faqs),
        ]}
      />

      <article className="container-x max-w-4xl py-14 lg:py-20">
        <nav className="label flex items-center gap-2 text-[10px] text-steel-600" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span>Guides</span>
        </nav>
        <h1 className="display mt-6 text-5xl sm:text-6xl">{guide.h1}</h1>
        <p className="mt-6 text-lg leading-relaxed text-ink/70">{guide.intro}</p>

        <div className="mt-14 space-y-12">
          {guide.sections.map((section) => (
            <section key={section.heading} className="hairline border-t pt-8">
              <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">{section.heading}</h2>
              <div className="mt-4 space-y-3 leading-relaxed text-ink/75">
                {section.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              {section.table ? (
                <div className="-mx-5 mt-6 overflow-x-auto px-5 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-ink">
                        {section.table[0].map((h) => (
                          <th key={h} scope="col" className="label py-3 pr-4 font-normal text-steel-600">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.slice(1).map((row) => (
                        <tr key={row[0]} className="hairline border-b">
                          {row.map((cell, i) =>
                            i === 0 ? (
                              <th key={cell} scope="row" className="py-3 pr-4 font-medium">
                                {cell}
                              </th>
                            ) : (
                              <td key={cell} className="py-3 pr-4">
                                {cell}
                              </td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ))}

          <section className="hairline border-t pt-8">
            <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">Questions</h2>
            <div className="mt-4">
              {guide.faqs.map((f) => (
                <div key={f.q} className="hairline border-b py-5">
                  <h3 className="font-medium">{f.q}</h3>
                  <p className="mt-2 leading-relaxed text-ink/70">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <Link href={guide.cta.href} className="btn-primary mt-12 h-14 px-8">
          {guide.cta.label} <Chevrons count={1} className="h-3 w-auto text-ember" />
        </Link>

        <nav className="mt-16" aria-label="More guides and collections">
          <p className="label text-steel-600">Read next</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {others.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="btn-outline btn-sm">
                  {g.nav}
                </Link>
              </li>
            ))}
            {COLLECTIONS.slice(0, 4).map((c) => (
              <li key={c.slug}>
                <Link href={`/collections/${c.slug}`} className="btn-outline btn-sm">
                  {c.nav}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </>
  );
}
