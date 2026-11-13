import Link from 'next/link';
import { money } from '@/lib/pricing';
import type { Settings } from '@/lib/types';
import { Chevrons, Logo } from './brand';
import { INFO_PAGES } from '@/content/pages';

export function SiteFooter({ settings }: { settings: Settings }) {
  return (
    <footer className="mt-auto bg-ink text-bone">
      <div className="container-x grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo className="h-5 w-auto text-bone" />
          <p className="mt-6 max-w-sm text-bone/60">
            A German luggage brand. Hardshell cases built to EU quality standards and made to look as good on their hundredth trip as on their first. Now shipping across Pakistan.
          </p>
          <Chevrons count={8} className="mt-8 h-4 w-auto text-ember" />
        </div>
        <div className="md:col-span-3">
          <p className="label text-steel">Service</p>
          <ul className="mt-5 space-y-3 text-sm text-bone/75">
            <li>Delivery in {settings.delivery_time}</li>
            <li>
              {settings.shipping_free_from > 0
                ? `Free delivery over ${money(settings.shipping_free_from)}`
                : `Delivery ${money(settings.shipping_flat)}`}
            </li>
            <li>Card, JazzCash, Easypaisa or cash on delivery</li>
            <li>
              <a href={`mailto:${settings.store_email}`} className="hover:text-ember">
                {settings.store_email}
              </a>
            </li>
            <li>WhatsApp {settings.store_whatsapp}</li>
          </ul>
        </div>
        <div className="md:col-span-4">
          <p className="label text-steel">Information</p>
          <ul className="mt-5 grid grid-cols-2 gap-3 text-sm text-bone/75">
            {Object.entries(INFO_PAGES).map(([slug, page]) => (
              <li key={slug}>
                <Link href={`/${slug}`} className="hover:text-ember">
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="container-x label flex flex-wrap justify-between gap-4 border-t border-bone/10 py-6 text-[10px] text-bone/40">
        <span>© {new Date().getFullYear()} {settings.store_name}</span>
        <span>Prices in Pakistani rupees · torvaxo.pk</span>
      </div>
    </footer>
  );
}
