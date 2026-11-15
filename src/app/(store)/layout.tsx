import { JsonLd, SITE } from '@/components/json-ld';
import { RevealOnScroll } from '@/components/reveal';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getSettings } from '@/lib/catalog';
import { money } from '@/lib/pricing';

export default async function StoreLayout({ children }: LayoutProps<'/'>) {
  const settings = await getSettings();
  const announcement =
    settings.announcement ||
    (settings.sale_mode === 'preorder'
      ? `German quality · EU standards · Preorder open · Preorder prices end at launch · ${money(settings.deposit_amount)} deposit · 2-year warranty`
      : `Now live · Launch buyers get ${settings.launch_coupon_percent}% off for a year`);

  return (
    <>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'OnlineStore',
            name: 'Torvaxo Pakistan',
            url: SITE,
            logo: `${SITE}/icon.svg`,
            description: 'Hardshell suitcases, luggage sets and travel bags from Torvaxo, a German luggage brand, delivered across Pakistan.',
            email: settings.store_email,
            areaServed: { '@type': 'Country', name: 'Pakistan' },
            currenciesAccepted: 'PKR',
            paymentAccepted: 'Card, JazzCash, Easypaisa, Cash on delivery',
          },
          { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Torvaxo Pakistan', url: SITE, inLanguage: 'en-PK' },
        ]}
      />
      <SiteHeader announcement={announcement} />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
      <RevealOnScroll />
    </>
  );
}
