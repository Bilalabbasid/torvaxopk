// Pure pricing maths. Shared by the server (authoritative) and unit tests.
// All amounts are whole PKR.

import type { SaleMode, Variant } from './types';

export interface PricingSettings {
  sale_mode: SaleMode;
  deposit_amount: number;
  shipping_flat: number;
  shipping_free_from: number;
}

/** What a customer pays per unit right now, and the price shown struck through next to it. */
export function unitPrice(variant: Pick<Variant, 'price' | 'preorder_price' | 'compare_at'>, mode: SaleMode) {
  if (mode === 'preorder' && variant.preorder_price != null && variant.preorder_price < variant.price) {
    return { price: variant.preorder_price, compareAt: variant.price };
  }
  const compareAt = variant.compare_at != null && variant.compare_at > variant.price ? variant.compare_at : null;
  return { price: variant.price, compareAt };
}

export interface PricedLine {
  unitPrice: number;
  regularPrice: number;
  quantity: number;
}

export interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  /** Amount charged now. Preorders: the deposit. Standard orders: the total. */
  dueNow: number;
  /** Preorders only: what is collected later. */
  dueLater: number;
  /** Savings against regular prices (preorder pricing / compare-at), for display. */
  savings: number;
}

export function discountFor(subtotal: number, percent: number | null | undefined): number {
  if (!percent || percent <= 0) return 0;
  return Math.min(subtotal, Math.round((subtotal * Math.min(percent, 100)) / 100));
}

export function shippingFor(afterDiscount: number, settings: Pick<PricingSettings, 'shipping_flat' | 'shipping_free_from'>) {
  if (afterDiscount <= 0) return 0;
  if (settings.shipping_free_from > 0 && afterDiscount >= settings.shipping_free_from) return 0;
  return settings.shipping_flat;
}

export function calculateTotals(lines: PricedLine[], settings: PricingSettings, couponPercent?: number | null): Totals {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const regular = lines.reduce((sum, l) => sum + l.regularPrice * l.quantity, 0);
  const discount = discountFor(subtotal, couponPercent);
  const shipping = shippingFor(subtotal - discount, settings);
  const total = subtotal - discount + shipping;

  let dueNow = total;
  if (settings.sale_mode === 'preorder') {
    dueNow = Math.min(Math.max(settings.deposit_amount, 0), total);
    // A zero deposit setting would mean nothing is charged now; fall back to the full amount.
    if (dueNow === 0) dueNow = total;
  }

  return {
    subtotal,
    discount,
    shipping,
    total,
    dueNow,
    dueLater: total - dueNow,
    savings: Math.max(regular - subtotal, 0) + discount,
  };
}

const pkr = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 });

/** "Rs 51,000" */
export function money(amount: number): string {
  return pkr.format(amount).replace('PKR', 'Rs').replace(/\s+/, ' ');
}
