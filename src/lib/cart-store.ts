'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine } from './types';

const MAX_QTY = 10;

interface CartState {
  lines: CartLine[];
  add: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (variantId, quantity = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.variantId === variantId);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.variantId === variantId ? { ...l, quantity: Math.min(l.quantity + quantity, MAX_QTY) } : l,
              ),
            };
          }
          return { lines: [...s.lines, { variantId, quantity: Math.min(quantity, MAX_QTY) }] };
        }),
      setQuantity: (variantId, quantity) =>
        set((s) => ({
          lines:
            quantity <= 0
              ? s.lines.filter((l) => l.variantId !== variantId)
              : s.lines.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(quantity, MAX_QTY) } : l)),
        })),
      remove: (variantId) => set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'torvaxo-pk-cart', version: 1 },
  ),
);

/** True once the persisted cart has loaded in the browser (avoids hydration mismatches). */
export function useHydrated() {
  return useSyncExternalStore(
    (onChange) => useCart.persist.onFinishHydration(onChange),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
}

export function useCartCount() {
  const hydrated = useHydrated();
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  return hydrated ? count : 0;
}
