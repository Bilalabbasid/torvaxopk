import type { Metadata } from 'next';
import './globals.css';

// Stock, prices and the preorder/live switch come from the database on every request.
export const dynamic = 'force-dynamic';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Torvaxo Pakistan — Elegance endures.', template: '%s · Torvaxo Pakistan' },
  description:
    'Hardshell luggage built to look as good on its hundredth trip as on its first. The Forward series — now in Pakistan. Preorder at launch prices.',
  openGraph: { type: 'website', locale: 'en_PK', siteName: 'Torvaxo Pakistan', images: ['/images/hero-trio.jpg'] },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-PK">
      <body className="flex min-h-svh flex-col">{children}</body>
    </html>
  );
}
