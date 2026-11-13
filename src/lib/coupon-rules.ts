// Pure coupon rules (unit tested).
import type { Coupon } from './types';

export function couponProblem(
  coupon: Pick<Coupon, 'active' | 'starts_at' | 'expires_at' | 'max_uses' | 'uses' | 'email'>,
  email: string | null,
  now: Date,
): string | null {
  if (!coupon.active) return 'This code is no longer active.';
  if (new Date(coupon.starts_at) > now) return 'This code is not active yet.';
  if (coupon.expires_at && new Date(coupon.expires_at) <= now) return 'This code has expired.';
  if (coupon.max_uses != null && coupon.uses >= coupon.max_uses) return 'This code has been fully used.';
  if (coupon.email) {
    if (!email) return 'Enter the email address this code was issued to.';
    if (coupon.email.toLowerCase() !== email.trim().toLowerCase()) {
      return 'This code belongs to a different email address.';
    }
  }
  return null;
}
