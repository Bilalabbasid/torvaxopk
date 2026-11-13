// Easypaisa "Easypay" plugin redirect.
// Flow: browser auto-POSTs to Index.jsf → Easypay redirects to our return URL with ?auth_token →
// we auto-POST auth_token to Confirm.jsf → customer pays → Easypay sends them back with
// status/desc/orderRefNumber (unsigned). The unsigned result is confirmed server-side via the
// order-status IPN endpoint configured in the Easypay merchant portal (see EASYPAISA_STATUS_URL).
import { env } from '../env';
import { easypaisaHash, karachiStamp } from './crypto';
import { PaymentVerificationError, readParams, type PaymentProvider } from './types';

const HOSTS = {
  sandbox: 'https://easypaystg.easypaisa.com.pk',
  production: 'https://easypay.easypaisa.com.pk',
};

const host = () => HOSTS[env.easypaisa.environment];

export const easypaisa: PaymentProvider = {
  id: 'easypaisa',

  async start({ payment, order, returnUrl }) {
    const fields: Record<string, string> = {
      storeId: env.easypaisa.storeId,
      amount: payment.amount.toFixed(1), // rupees, one decimal place
      postBackURL: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}step=token&ref=${payment.reference}`,
      orderRefNum: payment.reference,
      expiryDate: karachiStamp(new Date(Date.now() + 24 * 60 * 60 * 1000), ' '),
      autoRedirect: '1',
      emailAddr: order.email,
      mobileNum: order.phone.replace(/[^0-9]/g, '').replace(/^92/, '0'),
    };
    fields.merchantHashedReq = easypaisaHash(fields, env.easypaisa.hashKey);
    return { kind: 'form', action: `${host()}/easypay/Index.jsf`, fields };
  },

  async handleReturn(request) {
    const params = await readParams(request);

    // Step 2: we got the auth_token; post it to Confirm.jsf with the final return URL.
    if (params.step === 'token') {
      if (!params.auth_token || !params.ref) throw new PaymentVerificationError('Easypaisa return without auth_token');
      const finalUrl = new URL(request.url);
      finalUrl.search = `step=done&ref=${encodeURIComponent(params.ref)}`;
      return {
        kind: 'form',
        action: `${host()}/easypay/Confirm.jsf`,
        fields: { auth_token: params.auth_token, postBackURL: finalUrl.toString() },
      };
    }

    // Step 3: the customer is back. The query is unsigned: confirm with the status API.
    const reference = params.orderRefNumber || params.ref;
    if (!reference) throw new PaymentVerificationError('Easypaisa return without order reference');
    if (params.status && params.status !== '0000') {
      return { kind: 'settled', outcome: { reference, status: 'failed', raw: params } };
    }
    const status = await inquire(reference);
    return {
      kind: 'settled',
      outcome: {
        reference,
        // Without a verified status we leave the payment pending; the IPN webhook or the admin settles it.
        status: status === 'PAID' ? 'paid' : status === 'FAILED' ? 'failed' : 'pending',
        raw: { return: params, inquiry: status },
      },
    };
  },

  // Easypay IPN: calls us with ?url=<order-status REST url>. We fetch it to learn the real status.
  async handleWebhook(request) {
    const params = await readParams(request);
    if (!params.url) return null;
    const statusUrl = new URL(params.url);
    if (!statusUrl.hostname.endsWith('easypaisa.com.pk')) throw new PaymentVerificationError('Unexpected IPN host');
    const res = await fetch(statusUrl, { signal: AbortSignal.timeout(15000) });
    const data = (await res.json()) as Record<string, string>;
    const reference = data.order_id || data.orderId;
    if (!reference) return null;
    const paid = data.transaction_status === 'PAID' || data.transactionStatus === 'PAID';
    return { reference, status: paid ? 'paid' : 'failed', providerRef: data.transaction_id, raw: data };
  },
};

/**
 * Transaction status lookup. Easypay exposes this as SOAP (inquireTransaction) or the REST order-status
 * URL from the merchant portal; set EASYPAISA_STATUS_URL to that REST URL with {orderId} as placeholder.
 */
async function inquire(reference: string): Promise<'PAID' | 'FAILED' | null> {
  const template = process.env.EASYPAISA_STATUS_URL;
  if (!template || template.startsWith('PLACEHOLDER')) return null;
  try {
    const res = await fetch(template.replace('{orderId}', encodeURIComponent(reference)), {
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json()) as Record<string, string>;
    const status = data.transaction_status || data.transactionStatus;
    if (status === 'PAID') return 'PAID';
    if (status === 'FAILED' || status === 'EXPIRED') return 'FAILED';
    return null;
  } catch {
    return null;
  }
}
