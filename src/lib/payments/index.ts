import 'server-only';
import { env, gatewayConfigured } from '../env';
import { db, must } from '../supabase/admin';
import type { OnlineMethod, Order, Payment } from '../types';
import { easypaisa } from './easypaisa';
import { jazzcash } from './jazzcash';
import { mock } from './mock';
import { safepay } from './safepay';
import type { PaymentProvider, StartResult } from './types';

const REAL: Record<OnlineMethod, PaymentProvider> = { safepay, jazzcash, easypaisa };

const METHOD_LABELS: Record<string, string> = {
  safepay: 'Safepay',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
};

export function paymentsAreMock() {
  return env.paymentsMode !== 'live';
}

/** The provider that actually handles a payment, honouring PAYMENTS_MODE=mock. */
export function providerFor(method: string): PaymentProvider {
  if (env.paymentsMode !== 'live') return mock;
  const real = REAL[method as OnlineMethod];
  if (!real) throw new Error(`No online provider for ${method}`);
  if (!gatewayConfigured(method as OnlineMethod)) {
    throw new Error(`${METHOD_LABELS[method]} is selected but its credentials are still placeholders (see .env.example).`);
  }
  return real;
}

/** Route segment the gateway returns to. Mock payments share the mock route. */
export function returnSlug(method: string) {
  return env.paymentsMode === 'live' ? method : 'mock';
}

export async function beginPayment(payment: Payment, order: Order): Promise<StartResult> {
  const slug = returnSlug(payment.provider);
  const result = await providerFor(payment.provider).start({
    payment,
    order,
    returnUrl: `${env.siteUrl}/api/payments/${slug}/return`,
    cancelUrl: `${env.siteUrl}/api/payments/${slug}/return?cancelled=1`,
  });
  if (result.providerRef) {
    must(await db().from('payments').update({ provider_ref: result.providerRef }).eq('id', payment.id), 'Store provider ref');
  }
  return result;
}
