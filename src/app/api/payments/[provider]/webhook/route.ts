import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { settleOutcome } from '@/lib/orders';
import { providerFor } from '@/lib/payments';
import { PaymentVerificationError } from '@/lib/payments/types';

// Server-to-server notifications:
//   Safepay  → POST /api/payments/safepay/webhook   (X-SFPY-SIGNATURE, HMAC-SHA512 of the raw body)
//   Easypaisa → GET/POST /api/payments/easypaisa/webhook?url=…  (IPN; we fetch the status URL ourselves)
// Register these URLs in each merchant portal.

async function handle(request: Request, ctx: RouteContext<'/api/payments/[provider]/webhook'>) {
  const { provider } = await ctx.params;
  if (env.paymentsMode !== 'live' || !['safepay', 'easypaisa'].includes(provider)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  try {
    const handler = providerFor(provider);
    if (!handler.handleWebhook) return NextResponse.json({ error: 'not supported' }, { status: 404 });
    const outcome = await handler.handleWebhook(request);
    if (outcome) await settleOutcome(outcome, provider);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[payments:${provider}] webhook failed`, error);
    const status = error instanceof PaymentVerificationError ? 401 : 500;
    return NextResponse.json({ error: 'webhook failed' }, { status });
  }
}

export const GET = handle;
export const POST = handle;
