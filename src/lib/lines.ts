// Product lines, as in the German shop. A series groups the products that are options of one another
// (the sizes of a case, the editions of a bag, the pack sizes of a part); the category says what the
// options are called on the product page.

import type { Product } from './types';

export const CATEGORIES = {
  luggage: { label: 'Luggage', option: 'Size' },
  backpacks: { label: 'Backpacks', option: 'Edition' },
  work: { label: 'Laptop bags', option: 'Edition' },
  slings: { label: 'Sling bags', option: 'Edition' },
  duffels: { label: 'Duffels', option: 'Edition' },
  parts: { label: 'Wheels and parts', option: 'Pack' },
} as const;

export type Category = keyof typeof CATEGORIES;

export const EDITIONS = { standard: 'Standard', signature: 'Signature' } as const;

export type Edition = keyof typeof EDITIONS;

/** The original Forward line: Cabin, Medium and Large in the standard edition, plus their set. */
export const FORWARD = 'Forward';

/** Forward Cabin, Medium and Large (standard edition, no set). */
export function forwardCases(products: Product[]): Product[] {
  return products.filter((p) => p.series === FORWARD && !p.is_set);
}

/** The Forward Set of Three. */
export function forwardSet(products: Product[]): Product | undefined {
  return products.find((p) => p.series === FORWARD && p.is_set);
}

export function categoryLabel(category: string): string {
  return CATEGORIES[category as Category]?.label ?? 'Products';
}

export function optionLabel(category: string): string {
  return CATEGORIES[category as Category]?.option ?? 'Option';
}

/** Products that roll: wheel service and the size guide apply to these. */
export function hasWheels(category: string): boolean {
  return category === 'luggage' || category === 'parts';
}
