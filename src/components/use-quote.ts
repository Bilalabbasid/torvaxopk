'use client';

import { useEffect, useState } from 'react';
import { quoteAction } from '@/app/actions';
import { useCart, useHydrated } from '@/lib/cart-store';
import type { Quote } from '@/lib/orders';

/** Live, server-priced view of the browser cart. Re-quotes when the cart, coupon or email changes. */
export function useQuote(coupon = '', email = '') {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify([lines, coupon, email]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      quoteAction(lines, coupon, email)
        .then((q) => {
          if (cancelled) return;
          setQuote(q);
          setError(null);
          setLoadedKey(key);
        })
        .catch(() => {
          if (cancelled) return;
          setError('We could not load your cart. Please refresh the page.');
          setLoadedKey(key);
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hydrated, lines, coupon, email, key]);

  return { quote, error, loading: !hydrated || loadedKey !== key, empty: hydrated && lines.length === 0 };
}
