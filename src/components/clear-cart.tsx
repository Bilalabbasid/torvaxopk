'use client';

import { useEffect } from 'react';
import { useCart } from '@/lib/cart-store';

/** Empties the browser cart once an order is confirmed. */
export function ClearCart() {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
