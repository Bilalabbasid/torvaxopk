// Safepay hosted checkout (v3 "Express Checkout").
// Flow: create tracker (POST /order/payments/v3/) → passport token (POST /client/passport/v1/token)
// → redirect to {host}/embedded/?tracker&tbt&environment&source=hosted&redirect_url&cancel_url
// → customer returns with ?tracker= (unsigned) → we fetch /reporter/api/v1/payments/{tracker}.
// Webhooks: X-SFPY-SIGNATURE = HMAC-SHA512(raw body, webhook secret), hex.
// Endpoints and header names match the official @sfpy/node-core SDK (v0.3.7).
import { env } from '../env';
import { hmacHex, safeEqual } from './crypto';
import { PaymentVerificationError, readParams, type Outcome, type PaymentProvider } from './types';

const API = {
  sandbox: 'https://sandbox.api.getsafepay.com',
  production: 'https://api.getsafepay.com',
};
const CHECKOUT = {
  sandbox: 'https://sandbox.api.getsafepay.com/embedded/',
  production: 'https://getsafepay.com/embedded/',
};

const api = () => API[env.safepay.environment];

async function call<T>(path: string, init: RequestInit & { secret?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init.secret) headers['x-sfpy-merchant-secret'] = env.safepay.secretKey;
  const res = await fetch(`${api()}${path}`, { ...init, headers, signal: AbortSignal.timeout(20000) });
  const body = (await res.json().catch(() => ({}))) as T & { status?: { message?: string } };
  if (!res.ok) throw new Error(`Safepay ${path} failed (${res.status}): ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

interface TrackerResponse {
  data: {
    tracker?: {
      token: string;
      state: string;
      metadata?: Record<string, string>;
    };
    purchase_totals?: { quote_amount?: { amount: number; currency: string } };
  };
}

export const safepay: PaymentProvider = {
  id: 'safepay',

  async start({ payment, order, returnUrl, cancelUrl }) {
    const session = await call<{ data: { tracker: { token: string } } }>('/order/payments/v3/', {
      method: 'POST',
      body: JSON.stringify({
        merchant_api_key: env.safepay.apiKey,
        intent: 'CYBERSOURCE',
        mode: 'payment',
        entry_mode: 'raw',
        currency: 'PKR',
        amount: payment.amount * 100, // paisa
        metadata: { order_id: order.number, reference: payment.reference },
      }),
    });
    const tracker = session.data.tracker.token;

    const passport = await call<{ data: string }>('/client/passport/v1/token', { method: 'POST', secret: true });

    const sep = returnUrl.includes('?') ? '&' : '?';
    const params = new URLSearchParams({
      environment: env.safepay.environment,
      tracker,
      tbt: passport.data,
      source: 'hosted',
      redirect_url: `${returnUrl}${sep}ref=${payment.reference}`,
      cancel_url: `${cancelUrl}${cancelUrl.includes('?') ? '&' : '?'}ref=${payment.reference}`,
    });
    return { kind: 'redirect', url: `${CHECKOUT[env.safepay.environment]}?${params}`, providerRef: tracker };
  },

  async handleReturn(request) {
    const params = await readParams(request);
    const reference = params.ref;
    if (!reference) throw new PaymentVerificationError('Safepay return without reference');
    if (!params.tracker) {
      return { kind: 'settled', outcome: { reference, status: 'failed', raw: params } };
    }
    // The return query is unsigned: ask Safepay for the tracker's real state.
    const report = await call<TrackerResponse>(`/reporter/api/v1/payments/${encodeURIComponent(params.tracker)}`, {
      method: 'GET',
      secret: true,
    });
    return { kind: 'settled', outcome: trackerOutcome(reference, params.tracker, report) };
  },

  async handleWebhook(request) {
    const raw = await request.text();
    const signature = request.headers.get('x-sfpy-signature') ?? '';
    const expected = hmacHex('sha512', env.safepay.webhookSecret, raw);
    if (!signature || !safeEqual(expected, signature)) {
      throw new PaymentVerificationError('Safepay webhook signature mismatch');
    }
    const event = JSON.parse(raw) as {
      type?: string;
      data?: { tracker?: string; metadata?: Record<string, string>; amount?: number };
    };
    if (!event.data?.tracker) return null;
    // Our reference travels in metadata; if absent, settlement falls back to the stored tracker.
    const reference = event.data.metadata?.reference ?? '';
    if (event.type === 'payment.succeeded') {
      return { reference, status: 'paid', providerRef: event.data.tracker, raw: event };
    }
    if (event.type === 'payment.failed') {
      return { reference, status: 'failed', providerRef: event.data.tracker, raw: event };
    }
    return null;
  },
};

function trackerOutcome(reference: string, tracker: string, report: TrackerResponse): Outcome {
  const state = report.data?.tracker?.state;
  const quote = report.data?.purchase_totals?.quote_amount?.amount;
  return {
    reference,
    status: state === 'TRACKER_ENDED' ? 'paid' : state === 'TRACKER_STARTED' ? 'pending' : 'failed',
    providerRef: tracker,
    amount: typeof quote === 'number' ? quote / 100 : undefined,
    raw: report,
  };
}
