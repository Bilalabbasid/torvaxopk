import 'server-only';
import { db, must } from './supabase/admin';
import { randomCode } from './payments/crypto';
import { couponProblem } from './coupon-rules';
import type { Coupon, Order, Settings } from './types';

export { couponProblem };

export async function findCoupon(code: string): Promise<Coupon | null> {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;
  return must(await db().from('coupons').select('*').ilike('code', clean).maybeSingle(), 'Load coupon') as Coupon | null;
}

/** Look up a code and check it for this customer. Returns the coupon or a reason it can't be used. */
export async function validateCoupon(code: string, email: string | null) {
  const coupon = await findCoupon(code);
  if (!coupon) return { coupon: null, error: 'That code does not exist.' } as const;
  const problem = couponProblem(coupon, email, new Date());
  return problem ? ({ coupon: null, error: problem } as const) : ({ coupon, error: null } as const);
}

/**
 * The launch reward: a full-price purchase made while the sale is live earns a 12% site-wide code,
 * valid for one year, tied to the buyer's email. One active reward per customer; idempotent per order.
 */
export async function issueLaunchReward(order: Order, settings: Settings): Promise<Coupon | null> {
  if (order.kind !== 'standard' || order.sale_mode !== 'live' || order.payment_status !== 'paid') return null;

  const existingForOrder = must(
    await db().from('coupons').select('*').eq('issued_order_id', order.id).maybeSingle(),
    'Check reward',
  ) as Coupon | null;
  if (existingForOrder) return existingForOrder;

  const now = new Date();
  const active = must(
    await db()
      .from('coupons')
      .select('*')
      .eq('source', 'launch_reward')
      .eq('active', true)
      .ilike('email', order.email)
      .gt('expires_at', now.toISOString())
      .limit(1),
    'Check existing reward',
  ) as Coupon[];
  if (active.length) return active[0];

  const expires = new Date(now.getTime() + settings.launch_coupon_days * 24 * 60 * 60 * 1000);
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db()
      .from('coupons')
      .insert({
        code: `TORVAXO-${randomCode(6)}`,
        percent: settings.launch_coupon_percent,
        email: order.email.toLowerCase(),
        source: 'launch_reward',
        starts_at: now.toISOString(),
        expires_at: expires.toISOString(),
        issued_order_id: order.id,
        note: `Launch reward for order ${order.number}`,
      })
      .select('*')
      .single();
    if (!error) return data as Coupon;
    if (!error.message.includes('duplicate')) throw new Error(`Issue reward: ${error.message}`);
  }
  throw new Error('Could not generate a unique coupon code');
}

export async function rewardForOrder(orderId: string): Promise<Coupon | null> {
  return must(
    await db().from('coupons').select('*').eq('issued_order_id', orderId).maybeSingle(),
    'Load reward',
  ) as Coupon | null;
}
