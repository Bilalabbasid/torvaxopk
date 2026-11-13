'use server';

import { placeOrder, quoteCart, startBalancePayment, type Quote } from '@/lib/orders';
import type { CartLine, PaymentMethod } from '@/lib/types';

/** Authoritative cart prices from the database (the browser only stores variant ids and quantities). */
export async function quoteAction(lines: CartLine[], coupon?: string, email?: string): Promise<Quote> {
  const safe = Array.isArray(lines) ? lines.slice(0, 20) : [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { couponRow, ...quote } = await quoteCart(safe, coupon ?? null, email ?? null);
  return quote;
}

export async function placeOrderAction(input: unknown) {
  return placeOrder(input);
}

export async function startBalanceAction(token: string, method: PaymentMethod) {
  return startBalancePayment(String(token), method);
}
