'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { lineKey } from './mix';
import type { CartLine } from './types';

const MAX_QTY = 10;

const keyOf = (l: CartLine) => lineKey(l.variantId, l.mix);

interface CartState {
  lines: CartLine[];
  add: (variantId: string, quantity?: number, mix?: string[]) => void;
  /** `key` is the line key from `lineKey` (also returned on every quote line). */
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (variantId, quantity = 1, mix) =>
        set((s) => {
          const key = lineKey(variantId, mix);
          if (s.lines.some((l) => keyOf(l) === key)) {
            return {
              lines: s.lines.map((l) => (keyOf(l) === key ? { ...l, quantity: Math.min(l.quantity + quantity, MAX_QTY) } : l)),
            };
          }
          const line: CartLine = { variantId, quantity: Math.min(quantity, MAX_QTY) };
          if (mix?.length) line.mix = mix;
          return { lines: [...s.lines, line] };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          lines:
            quantity <= 0
              ? s.lines.filter((l) => keyOf(l) !== key)
              : s.lines.map((l) => (keyOf(l) === key ? { ...l, quantity: Math.min(quantity, MAX_QTY) } : l)),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => keyOf(l) !== key) })),
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
