'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCartCount } from '@/lib/cart-store';
import { Logo } from './brand';

const links = [
  { label: 'Shop', href: '/shop' },
  { label: 'Luggage', href: '/shop?category=luggage' },
  { label: 'Bags', href: '/shop?category=bags' },
  { label: 'Signature', href: '/shop?edition=signature' },
  { label: 'Preorder & launch', href: '/launch' },
];

export function SiteHeader({ announcement }: { announcement: string }) {
  const count = useCartCount();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  // A small pulse on the cart count whenever something is added.
  const [bump, setBump] = useState(false);
  const [lastCount, setLastCount] = useState(count);
  if (count !== lastCount) {
    setLastCount(count);
    if (count > lastCount) setBump(true);
  }
  useEffect(() => {
    if (!bump) return;
    const t = window.setTimeout(() => setBump(false), 450);
    return () => window.clearTimeout(t);
  }, [bump]);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const menuOpen = openPath === pathname; // closes itself on navigation
  // "A · B · C" scrolls as separate items.
  const items = announcement.split(' · ').map((part) => part.trim()).filter(Boolean);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="group overflow-hidden bg-ink text-bone">
        <p className="sr-only">{announcement}</p>
        <div
          className="flex min-h-9 w-max animate-drift items-center [animation-duration:70s] group-hover:[animation-play-state:paused] motion-reduce:animate-none"
          aria-hidden="true"
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {items.map((item) => (
                <span key={item} className="label flex items-center gap-6 pr-6 text-[10px] whitespace-nowrap text-bone/80">
                  {item}
                  <svg viewBox="0 0 54.56 100" className="h-2.5 w-auto shrink-0 text-ember" fill="currentColor">
                    <polygon points="0,0 20.56,0 54.56,50 20.56,100 0,100 34,50" />
                  </svg>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <header
        className={`sticky top-0 z-40 border-b transition-[background-color,border-color] duration-300 ${
          scrolled || menuOpen ? 'hairline bg-bone/85 backdrop-blur-xl' : 'border-transparent bg-bone'
        }`}
      >
        <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center">
          <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="group relative py-2 text-sm text-ink/70 transition-colors hover:text-ink">
                {link.label}
                <span className="absolute inset-x-0 bottom-1 h-px origin-left scale-x-0 bg-ink transition-transform duration-300 ease-out-expo group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>

          <button
            className="-ml-2 grid size-10 place-items-center md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label="Menu"
            onClick={() => setOpenPath(menuOpen ? null : pathname)}
          >
            <span className="relative block h-3 w-5">
              <span className={`absolute left-0 h-px w-full bg-ink transition-transform ${menuOpen ? 'top-1.5 rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 h-px w-full bg-ink transition-transform ${menuOpen ? 'top-1.5 -rotate-45' : 'top-3'}`} />
            </span>
          </button>

          <Link href="/" aria-label="Torvaxo home" className="justify-self-center">
            <Logo className="h-[18px] w-auto" />
          </Link>

          <div className="flex items-center justify-end">
            <Link
              href="/cart"
              className="relative flex h-10 items-center gap-2 pr-1 pl-2 text-ink/70 transition-colors hover:text-ink"
              aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <rect x="5" y="8" width="14" height="12" rx="1.5" />
                <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
              </svg>
              <span
                className={`grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[11px] tabular-nums transition-all duration-300 ${
                  bump ? 'scale-125 bg-ember text-ink' : count ? 'bg-ink text-bone' : 'bg-ink/10 text-ink/50'
                }`}
              >
                {count}
              </span>
            </Link>
          </div>
        </div>

        {menuOpen && (
          <nav id="mobile-menu" className="hairline border-t md:hidden" aria-label="Mobile">
            <div className="container-x flex flex-col py-3">
              {links.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpenPath(null)}
                  className="hairline flex items-center justify-between border-b py-4 text-2xl tracking-tight last:border-0"
                >
                  {link.label}
                  <span className="label text-steel">0{i + 1}</span>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
