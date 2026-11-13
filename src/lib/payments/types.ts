import type { OnlineMethod, Order, Payment } from '../types';

export type StartResult = (
  | { kind: 'redirect'; url: string }
  | { kind: 'form'; action: string; fields: Record<string, string> }
) & {
  /** Gateway-side id created at start (e.g. Safepay tracker), stored so webhooks can find the payment. */
  providerRef?: string;
};

export interface Outcome {
  /** Our payments.reference that the gateway echoed back. Empty when only providerRef is known. */
  reference: string;
  status: 'paid' | 'failed' | 'pending';
  providerRef?: string;
  /** Amount the gateway says was paid, in whole PKR, when it reports one. */
  amount?: number;
  raw: unknown;
}

export type ReturnResult =
  | { kind: 'settled'; outcome: Outcome }
  /** Some gateways need one more browser hop (Easypaisa: auth_token → Confirm.jsf). */
  | { kind: 'form'; action: string; fields: Record<string, string> };

export interface StartInput {
  payment: Payment;
  order: Order;
  /** Absolute URL the gateway sends the customer back to. */
  returnUrl: string;
  /** Absolute URL for a cancelled payment. */
  cancelUrl: string;
}

export interface PaymentProvider {
  id: OnlineMethod | 'mock';
  start(input: StartInput): Promise<StartResult>;
  /** Browser return (GET query or POST form). Must verify authenticity before reporting 'paid'. */
  handleReturn(request: Request): Promise<ReturnResult>;
  /** Optional server-to-server notification. */
  handleWebhook?(request: Request): Promise<Outcome | null>;
}

export class PaymentVerificationError extends Error {}

export async function readParams(request: Request): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  new URL(request.url).searchParams.forEach((v, k) => (out[k] = v));
  if (request.method === 'POST') {
    const type = request.headers.get('content-type') ?? '';
    if (type.includes('application/json')) {
      const body = (await request.json()) as Record<string, unknown>;
      for (const [k, v] of Object.entries(body)) out[k] = String(v ?? '');
    } else {
      const form = await request.formData();
      form.forEach((v, k) => (out[k] = typeof v === 'string' ? v : ''));
    }
  }
  return out;
}
