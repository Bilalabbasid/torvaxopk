import 'server-only';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { getSettings, getVariantsWithProducts, imageForVariant, invalidateCatalog, listActiveProducts } from './catalog';
import { issueLaunchReward, validateCoupon } from './coupons';
import { emailOrderConfirmed, emailReward } from './email';
import { PROVINCES } from './constants';
import { forwardCases } from './lines';
import { isMatched, lineKey, mixLabel, resolveMix, type MixCase } from './mix';
import { calculateTotals, unitPrice, type Totals } from './pricing';
import { karachiStamp, paymentReference, randomCode } from './payments/crypto';
import { db, must } from './supabase/admin';
import type { CartLine, Coupon, Order, OrderItem, OrderWithItems, PaymentMethod, Settings } from './types';
import type { Outcome } from './payments/types';

export const MAX_QTY = 10;
const MAX_OPEN_UNPAID = 3;

// ---------------------------------------------------------------------------
// Quote: authoritative prices from the database
// ---------------------------------------------------------------------------

export interface QuoteLine {
  /** Cart line identity (see `lineKey`): the variant, plus the colour choices for a mixed set. */
  key: string;
  variantId: string;
  productName: string;
  productSlug: string;
  variantLabel: string;
  /** Sets only: the colour chosen for each case when they are not all the same. */
  mix: string[] | null;
  sku: string;
  image: string;
  quantity: number;
  unitPrice: number;
  regularPrice: number;
  compareAt: number | null;
  stock: number;
  lineTotal: number;
}

export interface Quote {
  saleMode: Settings['sale_mode'];
  lines: QuoteLine[];
  totals: Totals;
  coupon: { code: string; percent: number } | null;
  couponError: string | null;
  problems: string[];
  paymentMethods: PaymentMethod[];
  /** Delivery is free from this subtotal (0 = never free). */
  freeShippingFrom: number;
  /** One quiet cross-sell: the next case not in the cart yet, in the colour last chosen. */
  suggestion: CartSuggestion | null;
}

export interface CartSuggestion {
  variantId: string;
  productName: string;
  productSlug: string;
  colorName: string;
  price: number;
  image: string;
}

export function availableMethods(settings: Settings, purpose: 'deposit' | 'full' | 'balance'): PaymentMethod[] {
  const all: PaymentMethod[] = ['safepay', 'jazzcash', 'easypaisa', 'cod'];
  return all.filter((m) => settings.payment_methods?.[m] !== false && !(m === 'cod' && purpose === 'deposit'));
}

export async function quoteCart(
  cart: CartLine[],
  couponCode?: string | null,
  email?: string | null,
): Promise<Quote & { couponRow: Coupon | null }> {
  const settings = await getSettings();
  // Merge duplicate lines. A set with its own colour per case is a different line from the matched set.
  const merged = new Map<string, { variantId: string; mix: string[] | null; quantity: number }>();
  for (const line of cart) {
    if (!line?.variantId || !Number.isFinite(line.quantity)) continue;
    const mix = Array.isArray(line.mix) && line.mix.length ? line.mix.slice(0, 6).map(String) : null;
    const key = lineKey(line.variantId, mix);
    const quantity = Math.min((merged.get(key)?.quantity ?? 0) + Math.floor(line.quantity), MAX_QTY);
    merged.set(key, { variantId: line.variantId, mix, quantity });
  }
  const entries = [...merged.entries()];
  const variants = await getVariantsWithProducts([...new Set(entries.map(([, e]) => e.variantId))]);
  // The cases a set is made of, and the colours each one comes in (only needed for mixed-colour sets).
  const cases: MixCase[] = entries.some(([, e]) => e.mix)
    ? forwardCases(await listActiveProducts())
        .map((p) => ({ label: p.size_label, colours: p.product_variants.map((v) => v.color_name) }))
    : [];
  // Several lines can draw on the same variant's stock.
  const wanted = new Map<string, number>();
  for (const [, e] of entries) if (e.quantity >= 1) wanted.set(e.variantId, (wanted.get(e.variantId) ?? 0) + e.quantity);

  const problems: string[] = [];
  const lines: QuoteLine[] = [];

  for (const [key, { variantId, mix: rawMix, quantity }] of entries) {
    const v = variants.find((x) => x.id === variantId);
    const mix = rawMix && v?.products.is_set ? resolveMix(rawMix, cases) : null;
    if (!v || v.products.status !== 'active' || (rawMix && !mix)) {
      problems.push('An item in your cart is no longer available and was removed.');
      continue;
    }
    if (quantity < 1) continue;
    const { price, compareAt } = unitPrice(v, settings.sale_mode);
    if (v.stock < (wanted.get(variantId) ?? quantity)) {
      const problem =
        v.stock === 0 ? `${v.products.name} in ${v.color_name} is sold out.` : `Only ${v.stock} × ${v.products.name} in ${v.color_name} left.`;
      if (!problems.includes(problem)) problems.push(problem);
    }
    // All three the same colour as the variant is just the matched set.
    const mixed = mix && !(isMatched(mix) && mix[0] === v.color_name) ? mix : null;
    lines.push({
      key,
      variantId,
      productName: v.products.name,
      productSlug: v.products.slug,
      variantLabel: mixed ? mixLabel(mixed, cases) : v.color_name,
      mix: mixed,
      sku: v.sku,
      image: imageForVariant(v.products.product_images, v.id),
      quantity,
      unitPrice: price,
      regularPrice: v.price,
      compareAt,
      stock: v.stock,
      lineTotal: price * quantity,
    });
  }

  let couponRow: Coupon | null = null;
  let couponError: string | null = null;
  if (couponCode?.trim()) {
    const result = await validateCoupon(couponCode, email ?? null);
    couponRow = result.coupon;
    couponError = result.error;
  }

  const totals = calculateTotals(
    lines.map((l) => ({ unitPrice: l.unitPrice, regularPrice: Math.max(l.regularPrice, l.compareAt ?? 0), quantity: l.quantity })),
    settings,
    couponRow?.percent,
  );

  return {
    saleMode: settings.sale_mode,
    freeShippingFrom: settings.shipping_free_from,
    suggestion: lines.length ? await suggestFor(lines, variants, settings.sale_mode) : null,
    lines,
    totals,
    coupon: couponRow ? { code: couponRow.code, percent: couponRow.percent } : null,
    couponRow,
    couponError,
    problems,
    paymentMethods: availableMethods(settings, settings.sale_mode === 'preorder' && totals.dueLater > 0 ? 'deposit' : 'full'),
  };
}

/** The next Forward case not in the cart, in the colour of the last case. None once the set is in the cart. */
async function suggestFor(
  lines: QuoteLine[],
  variants: Awaited<ReturnType<typeof getVariantsWithProducts>>,
  mode: Settings['sale_mode'],
): Promise<CartSuggestion | null> {
  if (variants.some((v) => v.products.is_set)) return null;
  const cases = forwardCases(await listActiveProducts());
  const caseSlugs = new Set(cases.map((p) => p.slug));
  const inCart = new Set(lines.map((l) => l.productSlug));
  const last = [...lines].reverse().find((l) => caseSlugs.has(l.productSlug));
  if (!last) return null;
  const colour = variants.find((v) => v.id === last.variantId)?.color_name;
  for (const product of cases) {
    if (inCart.has(product.slug)) continue;
    const variant = product.product_variants.find((v) => v.color_name === colour && v.stock > 0);
    if (!variant) continue;
    return {
      variantId: variant.id,
      productName: product.name,
      productSlug: product.slug,
      colorName: variant.color_name,
      price: unitPrice(variant, mode).price,
      image: imageForVariant(product.product_images, variant.id),
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Place order
// ---------------------------------------------------------------------------

const phone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ''))
  .refine((s) => /^(\+92|0092|0)?3\d{9}$/.test(s) || /^(\+92|0)\d{9,10}$/.test(s), 'Enter a valid Pakistani phone number, e.g. 0300 1234567.');

export const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  phone,
  address_line1: z.string().trim().min(5, 'Enter your street address.').max(200),
  address_line2: z.string().trim().max(200).default(''),
  city: z.string().trim().min(2, 'Enter your city.').max(80),
  province: z.enum(PROVINCES, { message: 'Choose your province.' }),
  postal_code: z.string().trim().max(10).default(''),
  customer_note: z.string().trim().max(500).default(''),
  payment_method: z.enum(['safepay', 'jazzcash', 'easypaisa', 'cod']),
  coupon: z.string().trim().max(40).default(''),
  cart: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(MAX_QTY),
        mix: z.array(z.string().max(40)).max(6).optional(),
      }),
    )
    .min(1, 'Your cart is empty.')
    .max(20),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export type PlaceOrderResult =
  | { ok: true; orderId: string; next: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function orderNumber(now = new Date()) {
  return `TXPK-${karachiStamp(now).slice(2, 8)}-${randomCode(5)}`;
}

export async function placeOrder(raw: unknown): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: 'Please check the highlighted fields.', fieldErrors };
  }
  const input = parsed.data;

  await expireStaleOrders().catch((e) => console.error('expireStaleOrders', e));

  // Abuse guard: unpaid online orders hold stock for up to 2 hours, so cap how many one customer can open.
  if (input.payment_method !== 'cod') {
    const { data: open } = await db().rpc('recent_unpaid_orders', { p_email: input.email, p_phone: input.phone, p_minutes: 60 });
    if (typeof open === 'number' && open >= MAX_OPEN_UNPAID) {
      return { ok: false, error: 'You have several unpaid orders open. Please complete one of them or try again in an hour.' };
    }
  }

  const settings = await getSettings();
  const quote = await quoteCart(input.cart, input.coupon, input.email);
  if (!quote.lines.length) return { ok: false, error: 'Your cart is empty.' };
  if (quote.problems.length) return { ok: false, error: quote.problems.join(' ') };
  if (input.coupon && quote.couponError) return { ok: false, error: quote.couponError, fieldErrors: { coupon: quote.couponError } };
  if (!quote.paymentMethods.includes(input.payment_method)) {
    return { ok: false, error: 'That payment method is not available for this order.' };
  }

  const preorder = settings.sale_mode === 'preorder';
  const { totals } = quote;
  const cod = input.payment_method === 'cod';
  const purpose = preorder && totals.dueLater > 0 ? 'deposit' : 'full';

  const orderRow = {
    number: orderNumber(),
    email: input.email,
    name: input.name,
    phone: input.phone,
    address_line1: input.address_line1,
    address_line2: input.address_line2,
    city: input.city,
    province: input.province,
    postal_code: input.postal_code,
    customer_note: input.customer_note,
    kind: preorder ? 'preorder' : 'standard',
    sale_mode: settings.sale_mode,
    // Cash on delivery is confirmed straight away; online payments wait for the gateway.
    status: cod ? 'confirmed' : 'pending',
    payment_method: input.payment_method,
    subtotal: totals.subtotal,
    discount: totals.discount,
    shipping: totals.shipping,
    total: totals.total,
    deposit_amount: preorder ? totals.dueNow : 0,
    coupon_id: quote.couponRow?.id ?? '',
    coupon_code: quote.couponRow?.code ?? '',
    balance_token: preorder ? randomBytes(24).toString('base64url') : '',
  };
  const items = quote.lines.map((l) => ({
    variant_id: l.variantId,
    product_name: l.productName,
    variant_label: l.variantLabel,
    sku: l.sku,
    image_url: l.image,
    unit_price: l.unitPrice,
    regular_price: l.regularPrice,
    quantity: l.quantity,
  }));
  const payment = cod
    ? null
    : { reference: paymentReference(), provider: input.payment_method, purpose, amount: totals.dueNow };

  const { data, error } = await db().rpc('create_order', { p_order: orderRow, p_items: items, p_payment: payment });
  if (error) {
    if (error.message.includes('INSUFFICIENT_STOCK')) {
      return { ok: false, error: 'Sorry, one of your items just sold out. Please review your cart.' };
    }
    if (error.message.includes('COUPON_UNAVAILABLE')) {
      return { ok: false, error: 'That discount code is no longer available.', fieldErrors: { coupon: 'No longer available.' } };
    }
    if (error.message.includes('duplicate')) return { ok: false, error: 'Please try again.' };
    console.error('create_order', error);
    return { ok: false, error: 'We could not place your order. Please try again.' };
  }
  const { order_id: orderId } = data as { order_id: string; payment_id: string | null };
  invalidateCatalog(); // stock changed

  if (cod) {
    await onOrderConfirmed(orderId);
    return { ok: true, orderId, next: `/order/${orderId}?placed=1` };
  }
  return { ok: true, orderId, next: `/pay/${payment!.reference}` };
}

// ---------------------------------------------------------------------------
// Balance payments for preorders
// ---------------------------------------------------------------------------

export async function getOrderByBalanceToken(token: string): Promise<OrderWithItems | null> {
  if (!token || token.length < 20) return null;
  return must(
    await db().from('orders').select('*, order_items(*)').eq('balance_token', token).maybeSingle(),
    'Load order',
  ) as OrderWithItems | null;
}

export async function startBalancePayment(token: string, method: PaymentMethod): Promise<PlaceOrderResult> {
  const order = await getOrderByBalanceToken(token);
  if (!order || order.status === 'cancelled') return { ok: false, error: 'This payment link is not valid.' };
  if (order.balance_due <= 0) return { ok: true, orderId: order.id, next: `/order/${order.id}` };
  if (order.payment_status === 'unpaid') return { ok: false, error: 'The deposit for this order has not been received yet.' };

  const settings = await getSettings();
  if (!availableMethods(settings, 'balance').includes(method)) return { ok: false, error: 'That payment method is not available.' };

  if (method === 'cod') {
    must(await db().from('orders').update({ balance_method: 'cod', updated_at: new Date().toISOString() }).eq('id', order.id), 'Set COD');
    await logEvent(order.id, 'balance', `Customer chose cash on delivery for the balance of PKR ${order.balance_due}`, 'customer');
    return { ok: true, orderId: order.id, next: `/order/${order.id}?balance=cod` };
  }

  const reference = paymentReference();
  must(
    await db().from('payments').insert({ order_id: order.id, reference, provider: method, purpose: 'balance', amount: order.balance_due }),
    'Create balance payment',
  );
  must(await db().from('orders').update({ balance_method: method }).eq('id', order.id), 'Set balance method');
  return { ok: true, orderId: order.id, next: `/pay/${reference}` };
}

// ---------------------------------------------------------------------------
// Settlement (gateway callbacks and admin)
// ---------------------------------------------------------------------------

export async function getPaymentByReference(reference: string) {
  return must(
    await db().from('payments').select('*, orders(*)').eq('reference', reference).maybeSingle(),
    'Load payment',
  ) as (import('./types').Payment & { orders: Order }) | null;
}

/** Apply a verified gateway outcome. Returns the order id. Safe to call more than once. */
export async function settleOutcome(outcome: Outcome, provider: string): Promise<string | null> {
  let payment = outcome.reference ? await getPaymentByReference(outcome.reference) : null;
  if (!payment && outcome.providerRef) {
    payment = must(
      await db().from('payments').select('*, orders(*)').eq('provider_ref', outcome.providerRef).maybeSingle(),
      'Load payment by provider ref',
    ) as typeof payment;
  }
  if (!payment) {
    console.error('settleOutcome: unknown payment', outcome.reference, outcome.providerRef);
    return null;
  }
  if (outcome.status === 'pending') {
    await logEvent(payment.order_id, 'payment_pending', `${provider} reports the payment as pending`, 'gateway');
    return payment.order_id;
  }

  let status: 'paid' | 'failed' = outcome.status;
  if (status === 'paid' && outcome.amount != null && Math.round(outcome.amount) !== payment.amount) {
    console.error('settleOutcome: amount mismatch', outcome.amount, payment.amount);
    await logEvent(payment.order_id, 'payment_mismatch', `Gateway amount ${outcome.amount} ≠ expected ${payment.amount}`, 'gateway');
    status = 'failed';
  }

  const { data, error } = await db().rpc('settle_payment', {
    p_payment: payment.id,
    p_status: status,
    p_provider_ref: outcome.providerRef ?? null,
    p_raw: outcome.raw ?? null,
    p_actor: provider,
  });
  if (error) throw new Error(`settle_payment: ${error.message}`);
  const result = data as { changed: boolean; status: string };
  if (result.changed && status === 'failed') invalidateCatalog(); // stock was released
  if (result.changed && status === 'paid') {
    await onPaymentReceived(payment.order_id, payment.purpose);
  }
  return payment.order_id;
}

async function loadOrder(orderId: string) {
  return must(await db().from('orders').select('*, order_items(*)').eq('id', orderId).single(), 'Load order') as OrderWithItems;
}

/** First confirmation of an order: send the confirmation email. */
async function onOrderConfirmed(orderId: string) {
  const [order, settings] = await Promise.all([loadOrder(orderId), getSettings()]);
  await emailOrderConfirmed(order, order.order_items as OrderItem[], settings);
}

/** Side effects after money arrives: emails and the launch reward. */
export async function onPaymentReceived(orderId: string, purpose: 'deposit' | 'balance' | 'full') {
  const [order, settings] = await Promise.all([loadOrder(orderId), getSettings()]);
  if (purpose !== 'balance' && order.payment_method !== 'cod') {
    await emailOrderConfirmed(order, order.order_items, settings);
  }
  const reward = await issueLaunchReward(order, settings).catch((e) => {
    console.error('issueLaunchReward', e);
    return null;
  });
  if (reward && reward.issued_order_id === order.id) {
    await logEvent(order.id, 'reward', `Launch reward ${reward.code} (${reward.percent}% for 1 year) issued`);
    await emailReward(order, reward, settings);
  }
}

export async function logEvent(orderId: string, type: string, message: string, actor = 'system') {
  await db().from('order_events').insert({ order_id: orderId, type, message, actor });
}

/** Cancel online orders that never got paid (customer abandoned the gateway), releasing stock. */
export async function expireStaleOrders(maxAgeMinutes = 120) {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();
  const stale = must(
    await db()
      .from('orders')
      .select('id')
      .eq('status', 'pending')
      .eq('amount_paid', 0)
      .neq('payment_method', 'cod')
      .lt('created_at', cutoff)
      .limit(50),
    'Find stale orders',
  ) as { id: string }[];
  for (const { id } of stale) {
    await db().from('payments').update({ status: 'cancelled' }).eq('order_id', id).eq('status', 'pending');
    await db().rpc('release_order', { p_order: id, p_reason: 'Payment not completed in time', p_actor: 'system' });
  }
  return stale.length;
}
