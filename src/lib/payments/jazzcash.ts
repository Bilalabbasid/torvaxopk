// JazzCash "Page Redirection" (hosted form, v1.1).
// Flow: browser auto-POSTs signed fields to merchantform → customer pays → JazzCash POSTs back to pp_ReturnURL.
// We verify pp_SecureHash on the return, then confirm with the Payment Inquiry API before marking paid.
// Official docs need a sandbox.jazzcash.com.pk login; field list follows the v1.1 integration guide.
import { env } from '../env';
import { jazzcashHash, karachiStamp, safeEqual } from './crypto';
import { PaymentVerificationError, readParams, type PaymentProvider } from './types';

const HOSTS = {
  sandbox: 'https://sandbox.jazzcash.com.pk',
  production: 'https://payments.jazzcash.com.pk',
};

const host = () => HOSTS[env.jazzcash.environment];

export const jazzcash: PaymentProvider = {
  id: 'jazzcash',

  async start({ payment, order, returnUrl }) {
    const now = new Date();
    const fields: Record<string, string> = {
      pp_Version: '1.1',
      pp_TxnType: '', // empty: customer chooses wallet / card / voucher on the JazzCash page
      pp_Language: 'EN',
      pp_MerchantID: env.jazzcash.merchantId,
      pp_SubMerchantID: '',
      pp_Password: env.jazzcash.password,
      pp_BankID: '',
      pp_ProductID: '',
      pp_TxnRefNo: payment.reference,
      pp_Amount: String(payment.amount * 100), // paisa, no decimal point
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: karachiStamp(now),
      pp_TxnExpiryDateTime: karachiStamp(new Date(now.getTime() + 24 * 60 * 60 * 1000)),
      pp_BillReference: order.number.replace(/[^A-Za-z0-9]/g, ''),
      pp_Description: `Torvaxo order ${order.number} (${payment.purpose})`,
      pp_ReturnURL: returnUrl,
      ppmpf_1: order.phone,
      ppmpf_2: '',
      ppmpf_3: '',
      ppmpf_4: '',
      ppmpf_5: '',
    };
    fields.pp_SecureHash = jazzcashHash(fields, env.jazzcash.integritySalt);
    return { kind: 'form', action: `${host()}/CustomerPortal/transactionmanagement/merchantform/`, fields };
  },

  async handleReturn(request) {
    const params = await readParams(request);
    const reference = params.pp_TxnRefNo;
    if (!reference) throw new PaymentVerificationError('JazzCash return without pp_TxnRefNo');

    const expected = jazzcashHash(params, env.jazzcash.integritySalt);
    if (!params.pp_SecureHash || !safeEqual(expected, params.pp_SecureHash)) {
      throw new PaymentVerificationError('JazzCash return signature mismatch');
    }

    const code = params.pp_ResponseCode;
    if (code !== '000') {
      // 124 / 157: voucher issued or wallet confirmation pending. Keep pending; inquiry or admin settles it later.
      const pending = code === '124' || code === '157';
      return { kind: 'settled', outcome: { reference, status: pending ? 'pending' : 'failed', raw: params } };
    }

    // Double-check with the inquiry API (the return is signed, but inquiry is the source of truth).
    const inquiry = await inquire(reference);
    const confirmed = inquiry?.pp_ResponseCode === '000' && (inquiry.pp_PaymentResponseCode ?? '000') === '000';
    return {
      kind: 'settled',
      outcome: {
        reference,
        status: confirmed || inquiry === null ? 'paid' : 'failed',
        providerRef: params.pp_RetreivalReferenceNo,
        amount: Number(params.pp_Amount) / 100,
        raw: { return: params, inquiry },
      },
    };
  },
};

/** Payment Inquiry API. Returns null when the API is unreachable (we then trust the signed return). */
async function inquire(reference: string): Promise<Record<string, string> | null> {
  const body: Record<string, string> = {
    pp_TxnRefNo: reference,
    pp_MerchantID: env.jazzcash.merchantId,
    pp_Password: env.jazzcash.password,
  };
  body.pp_SecureHash = jazzcashHash(body, env.jazzcash.integritySalt);
  try {
    const res = await fetch(`${host()}/ApplicationAPI/API/PaymentInquiry/Inquire`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, string>;
  } catch {
    return null;
  }
}
