// Built-in test gateway (PAYMENTS_MODE=mock). Sends the customer to /pay/mock/[reference],
// where they approve or decline. The result comes back signed with APP_SECRET, through the
// same return route and settlement code the real gateways use.
import { env } from '../env';
import { hmacHex, safeEqual } from './crypto';
import { PaymentVerificationError, readParams, type PaymentProvider } from './types';

export function mockSignature(reference: string, outcome: string) {
  return hmacHex('sha256', env.appSecret, `${reference}|${outcome}`);
}

export const mock: PaymentProvider = {
  id: 'mock',

  async start({ payment }) {
    return { kind: 'redirect', url: `${env.siteUrl}/pay/mock/${payment.reference}` };
  },

  async handleReturn(request) {
    const params = await readParams(request);
    const { reference, outcome, sig } = params;
    if (!reference || !outcome || !sig || !safeEqual(mockSignature(reference, outcome), sig)) {
      throw new PaymentVerificationError('Mock payment signature mismatch');
    }
    return {
      kind: 'settled',
      outcome: {
        reference,
        status: outcome === 'approve' ? 'paid' : 'failed',
        providerRef: `MOCK-${reference}`,
        raw: { mock: true, outcome },
      },
    };
  },
};
