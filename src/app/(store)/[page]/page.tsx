import { notFound } from 'next/navigation';
import { INFO_PAGES } from '@/content/pages';
import { getSettings } from '@/lib/catalog';

export async function generateMetadata(props: PageProps<'/[page]'>) {
  const { page } = await props.params;
  return { title: INFO_PAGES[page]?.title ?? 'Not found' };
}

export default async function InfoPage(props: PageProps<'/[page]'>) {
  const { page } = await props.params;
  const content = Object.hasOwn(INFO_PAGES, page) ? INFO_PAGES[page] : null;
  if (!content) notFound();
  const settings = await getSettings();

  return (
    <article className="container-x max-w-4xl py-16 lg:py-24">
      <p className="label text-steel-600">{content.label}</p>
      <h1 className="display mt-4 text-5xl sm:text-6xl">{content.title}</h1>
      <p className="mt-6 text-lg text-ink/70">{content.intro}</p>
      <div className="mt-14 space-y-12">
        {content.sections(settings).map((section) => (
          <section key={section.heading} className="hairline border-t pt-8">
            <h2 className="text-2xl font-medium tracking-tight">{section.heading}</h2>
            <div className="mt-4 space-y-3 leading-relaxed text-ink/75">
              {section.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
