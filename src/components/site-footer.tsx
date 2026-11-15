import Link from 'next/link';
import { COLLECTIONS } from '@/content/collections';
import { GUIDES } from '@/content/guides';
import { money } from '@/lib/pricing';
import type { Settings } from '@/lib/types';
import { Logo } from './brand';

const shop = [
  { label: 'All products', href: '/shop' },
  ...COLLECTIONS.map((c) => ({ label: c.nav, href: `/collections/${c.slug}` })),
  { label: 'Signature edition', href: '/shop?edition=signature' },
];

const service = [
  { label: 'Preorder & launch', href: '/launch' },
  { label: 'Delivery', href: '/shipping' },
  { label: 'Returns', href: '/returns' },
  { label: 'Warranty', href: '/warranty' },
  { label: 'Contact', href: '/contact' },
  ...GUIDES.map((g) => ({ label: g.nav, href: `/guides/${g.slug}` })),
];

const legal = [
  { label: 'Terms of sale', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
];

export function SiteFooter({ settings }: { settings: Settings }) {
  // Four promises, each backed by a page. Figures come from the shop settings.
  const promises = [
    {
      title: 'Delivery',
      text:
        settings.shipping_free_from > 0
          ? `Free over ${money(settings.shipping_free_from)} across Pakistan`
          : `${money(settings.shipping_flat)} anywhere in Pakistan`,
      href: '/shipping',
    },
    { title: 'Returns', text: '7 days to change your mind', href: '/returns' },
    { title: 'Payment', text: 'Card, JazzCash, Easypaisa or cash on delivery', href: '/launch' },
    { title: 'Warranty', text: '2-year warranty, wheels you replace yourself', href: '/warranty' },
  ];

  return (
    <footer className="mt-auto overflow-hidden bg-ink text-bone">
      <div className="container-x">
        <ul className="grid grid-cols-2 border-b border-bone/10 lg:grid-cols-4">
          {promises.map((promise, i) => (
            <li
              key={promise.href + promise.title}
              className="border-bone/10 lg:border-l lg:first:border-l-0 [&:nth-child(even)]:border-l [&:nth-child(n+3)]:border-t lg:[&:nth-child(n+3)]:border-t-0"
            >
              <Link
                href={promise.href}
                className="group flex h-full items-start gap-4 px-4 py-6 transition-colors hover:bg-bone/[0.04] sm:px-6 lg:py-7"
              >
                <span className="label mt-0.5 text-[10px] text-ember">0{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium tracking-tight">{promise.title}</span>
                  <span className="mt-0.5 block text-[13px] text-bone/55">{promise.text}</span>
                </span>
                <svg
                  viewBox="0 0 54.56 100"
                  className="mt-1.5 h-3 w-auto shrink-0 text-bone/25 transition-all duration-300 ease-out-expo group-hover:translate-x-1 group-hover:text-ember"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <polygon points="0,0 20.56,0 54.56,50 20.56,100 0,100 34,50" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" aria-label="Torvaxo home">
              <Logo className="h-5 w-auto text-bone" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-bone/55">
              A German luggage brand. Hardshell cases built to EU quality standards, with a built-in lock and wheels you can
              replace yourself. Now in Pakistan.
            </p>
          </div>

          <nav aria-label="Shop">
            <h2 className="label text-[10px] text-steel">Shop</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-bone/75">
              {shop.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-bone">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Service">
            <h2 className="label text-[10px] text-steel">Service</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-bone/75">
              {service.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-bone">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="label text-[10px] text-steel">Get in touch</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-bone/75">
              <li>
                <a href={`mailto:${settings.store_email}`} className="break-all transition-colors hover:text-bone">
                  {settings.store_email}
                </a>
              </li>
              <li>WhatsApp {settings.store_whatsapp}</li>
              <li>Delivery in {settings.delivery_time}</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-bone/10 py-5 text-[13px] text-bone/55">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legal.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-bone">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="label text-[10px] text-steel">
            © {new Date().getFullYear()} {settings.store_name} · Prices in Pakistani rupees
          </p>
        </div>
      </div>
    </footer>
  );
}
