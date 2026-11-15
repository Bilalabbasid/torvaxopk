import type { Metadata } from 'next';
import './globals.css';
import { siteUrl as siteUrlFor } from '@/lib/site-url';

// Stock, prices and the preorder/live switch come from the database on every request.
export const dynamic = 'force-dynamic';

const siteUrl = siteUrlFor();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Torvaxo Pakistan: Suitcases, Trolley Bags & Luggage Sets', template: '%s | Torvaxo Pakistan' },
  description:
    'Suitcase and luggage bag prices in Pakistan from Torvaxo, a German brand: hardshell trolley bags, 3-piece luggage sets and travel bags. TSA lock, 2-year warranty, delivery across Pakistan.',
  openGraph: { type: 'website', locale: 'en_PK', siteName: 'Torvaxo Pakistan', images: ['/images/hero-trio.jpg'] },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-PK">
      <body className="flex min-h-svh flex-col">{children}</body>
    </html>
  );
}
