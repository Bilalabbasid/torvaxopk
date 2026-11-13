'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Fades `.reveal` elements up the first time they scroll into view (the German shop's v-reveal).
 * Mark an element with className="reveal" and optionally style={{ '--reveal-delay': '120ms' }}.
 * Without JavaScript the `.js-reveal` class is never set, so nothing stays hidden.
 */
export function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.classList.add('js-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    const watch = () => document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => observer.observe(el));
    watch();
    // Client-side updates (colour switches, cart changes) can add new sections.
    const mutations = new MutationObserver(watch);
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [pathname]);

  return null;
}
