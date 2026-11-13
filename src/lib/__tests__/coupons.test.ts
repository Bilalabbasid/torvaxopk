import { describe, expect, it } from 'vitest';
import { couponProblem } from '../coupon-rules';

const now = new Date('2027-01-15T12:00:00Z');
const reward = {
  active: true,
  starts_at: '2027-01-01T00:00:00Z',
  expires_at: '2028-01-01T00:00:00Z',
  max_uses: null,
  uses: 4,
  email: 'ali@example.com',
};

describe('couponProblem', () => {
  it('accepts a valid launch reward for its owner, case-insensitively, any number of times', () => {
    expect(couponProblem(reward, ' Ali@Example.com ', now)).toBeNull();
  });
  it('rejects another email', () => {
    expect(couponProblem(reward, 'sara@example.com', now)).toMatch(/different email/);
  });
  it('asks for the email when missing', () => {
    expect(couponProblem(reward, null, now)).toMatch(/email address/);
  });
  it('expires after a year', () => {
    expect(couponProblem(reward, 'ali@example.com', new Date('2028-01-01T00:00:01Z'))).toMatch(/expired/);
  });
  it('respects start date, active flag and max uses', () => {
    expect(couponProblem({ ...reward, email: null, starts_at: '2027-02-01T00:00:00Z' }, null, now)).toMatch(/not active yet/);
    expect(couponProblem({ ...reward, active: false }, 'ali@example.com', now)).toMatch(/no longer active/);
    expect(couponProblem({ ...reward, email: null, max_uses: 4 }, null, now)).toMatch(/fully used/);
  });
});
