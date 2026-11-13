import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { settleOutcome } from '@/lib/orders';
import { providerFor } from '@/lib/payments';
import { PaymentVerificationError } from '@/lib/payments/types';

// Customers land here from the gateway (GET or a cross-site form POST). We verify, settle, then send them
// to their order page. Uses no session cookies, so the cross-site POST works with SameSite=Lax.

const ALLOWED = new Set(['safepay', 'jazzcash', 'easypaisa', 'mock']);

async function handle(request: Request, ctx: RouteContext<'/api/payments/[provider]/return'>) {
  const { provider } = await ctx.params;
  if (!ALLOWED.has(provider)) return new NextResponse('Unknown provider', { status: 404 });
  if ((provider === 'mock') !== (env.paymentsMode !== 'live')) return new NextResponse('Provider disabled', { status: 404 });

  try {
    const handler = providerFor(provider === 'mock' ? 'safepay' : provider);
    const result = await handler.handleReturn(request);

    if (result.kind === 'form') {
      return new NextResponse(autoPostHtml(result.action, result.fields), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      });
    }

    const orderId = await settleOutcome(result.outcome, provider);
    if (!orderId) return NextResponse.redirect(new URL('/', env.siteUrl), 303);
    const flag = result.outcome.status === 'paid' ? 'paid' : result.outcome.status === 'pending' ? 'pending' : 'failed';
    return NextResponse.redirect(new URL(`/order/${orderId}?payment=${flag}`, env.siteUrl), 303);
  } catch (error) {
    console.error(`[payments:${provider}] return failed`, error);
    const status = error instanceof PaymentVerificationError ? 400 : 500;
    return NextResponse.redirect(new URL(`/payment-problem?code=${status}`, env.siteUrl), 303);
  }
}

export const GET = handle;
export const POST = handle;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function autoPostHtml(action: string, fields: Record<string, string>) {
  const inputs = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Continuing to payment…</title></head>
<body style="font-family:sans-serif;background:#f5f0eb;display:grid;place-items:center;min-height:100vh">
<form id="f" method="POST" action="${esc(action)}">${inputs}<p>Continuing to payment…</p><button type="submit">Continue</button></form>
<script>document.getElementById('f').submit()</script></body></html>`;
}
