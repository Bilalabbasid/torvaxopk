import { describe, expect, it } from 'vitest';
import { calculateTotals, discountFor, money, shippingFor, unitPrice } from '../pricing';

const set = { price: 51000, preorder_price: 35000, compare_at: 56497 };
const settings = { deposit_amount: 5000, shipping_flat: 500, shipping_free_from: 15000 };

describe('unitPrice', () => {
  it('uses the preorder price in preorder mode, striking through the regular price', () => {
    expect(unitPrice(set, 'preorder')).toEqual({ price: 35000, compareAt: 51000 });
  });
  it('uses the regular price when live, striking through compare-at', () => {
    expect(unitPrice(set, 'live')).toEqual({ price: 51000, compareAt: 56497 });
  });
  it('ignores a preorder price that is not lower', () => {
    expect(unitPrice({ price: 1000, preorder_price: 1200, compare_at: null }, 'preorder')).toEqual({ price: 1000, compareAt: null });
  });
});

describe('calculateTotals', () => {
  it('preorder of the Set of Three: Rs 35,000 total, Rs 5,000 deposit now, Rs 30,000 later, free delivery', () => {
    const t = calculateTotals([{ unitPrice: 35000, regularPrice: 51000, quantity: 1 }], { ...settings, sale_mode: 'preorder' });
    expect(t).toMatchObject({ subtotal: 35000, shipping: 0, total: 35000, dueNow: 5000, dueLater: 30000, savings: 16000 });
  });

  it('live purchase charges the full amount now', () => {
    const t = calculateTotals([{ unitPrice: 51000, regularPrice: 56497, quantity: 1 }], { ...settings, sale_mode: 'live' });
    expect(t).toMatchObject({ total: 51000, dueNow: 51000, dueLater: 0 });
  });

  it('applies the 12% launch reward to the subtotal', () => {
    const t = calculateTotals([{ unitPrice: 51000, regularPrice: 51000, quantity: 1 }], { ...settings, sale_mode: 'live' }, 12);
    expect(t.discount).toBe(6120);
    expect(t.total).toBe(44880);
  });

  it('charges delivery under the free threshold', () => {
    const t = calculateTotals([{ unitPrice: 8999, regularPrice: 12999, quantity: 1 }], { ...settings, sale_mode: 'preorder' });
    expect(t.shipping).toBe(500);
    expect(t.total).toBe(9499);
    expect(t.dueNow).toBe(5000);
  });

  it('caps the deposit at the order total', () => {
    const t = calculateTotals([{ unitPrice: 3000, regularPrice: 3000, quantity: 1 }], { ...settings, shipping_flat: 0, sale_mode: 'preorder' });
    expect(t.dueNow).toBe(3000);
    expect(t.dueLater).toBe(0);
  });

  it('treats a zero deposit as pay-in-full', () => {
    const t = calculateTotals([{ unitPrice: 35000, regularPrice: 51000, quantity: 1 }], { ...settings, deposit_amount: 0, sale_mode: 'preorder' });
    expect(t.dueNow).toBe(35000);
  });
});

describe('helpers', () => {
  it('discountFor rounds and caps', () => {
    expect(discountFor(999, 12)).toBe(120);
    expect(discountFor(100, 150)).toBe(100);
    expect(discountFor(100, null)).toBe(0);
  });
  it('shippingFor is free on an empty cart', () => {
    expect(shippingFor(0, settings)).toBe(0);
  });
  it('money formats rupees without decimals', () => {
    expect(money(51000)).toBe('Rs 51,000');
  });
});
