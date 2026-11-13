import 'server-only';
import { env } from './env';
import { money } from './pricing';
import type { Coupon, Order, OrderItem, Settings } from './types';

interface Mail {
  to: string;
  subject: string;
  html: string;
}

/** Sends through Resend when RESEND_API_KEY is set; otherwise logs to the server console. Never throws. */
export async function sendEmail(mail: Mail): Promise<void> {
  if (!env.resendApiKey || env.resendApiKey.startsWith('PLACEHOLDER')) {
    console.info(`[email:dev] to=${mail.to} subject="${mail.subject}"`);
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.resendApiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.emailFrom, to: [mail.to], subject: mail.subject, html: mail.html }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) console.error('[email] Resend failed', res.status, await res.text());
  } catch (error) {
    console.error('[email] send failed', error);
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function layout(title: string, body: string, settings: Settings) {
  return `<!doctype html><html><body style="margin:0;background:#f4f2ee;font-family:Helvetica,Arial,sans-serif;color:#0e0e10">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:20px;font-weight:600;letter-spacing:-0.02em;margin:0 0 24px">TORVAXO <span style="color:#f0561f">›››</span></p>
<h1 style="font-size:26px;letter-spacing:-0.03em;margin:0 0 16px">${esc(title)}</h1>
${body}
<hr style="border:none;border-top:1px solid #d8d4cc;margin:32px 0 16px">
<p style="font-size:12px;color:#5f6266">${esc(settings.store_name)} · ${esc(settings.store_email)} · WhatsApp ${esc(settings.store_whatsapp)}</p>
</div></body></html>`;
}

function itemsTable(items: OrderItem[]) {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">${items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e8e5df">${esc(i.product_name)} · ${esc(i.variant_label)} × ${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #e8e5df;text-align:right">${money(i.line_total)}</td></tr>`,
    )
    .join('')}</table>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${href}" style="background:#0e0e10;color:#f4f2ee;padding:14px 22px;text-decoration:none;font-size:14px">${esc(label)}</a></p>`;

export function orderUrl(order: Pick<Order, 'id'>) {
  return `${env.siteUrl}/order/${order.id}`;
}

export function balanceUrl(order: Pick<Order, 'balance_token'>) {
  return `${env.siteUrl}/pay/balance/${order.balance_token}`;
}

export async function emailOrderConfirmed(order: Order, items: OrderItem[], settings: Settings) {
  const preorder = order.kind === 'preorder';
  const body = `
<p>Hi ${esc(order.name.split(' ')[0])}, thank you for your ${preorder ? 'preorder' : 'order'} <strong>${esc(order.number)}</strong>.</p>
${itemsTable(items)}
<p style="font-size:14px">Total: <strong>${money(order.total)}</strong><br>
Paid so far: ${money(order.amount_paid)}${order.balance_due > 0 ? `<br>Balance due ${preorder ? 'when your order ships' : 'on delivery'}: <strong>${money(order.balance_due)}</strong>` : ''}</p>
${preorder ? '<p style="font-size:14px">Your preorder price is locked in. We will email you before dispatch to collect the balance.</p>' : ''}
${button(orderUrl(order), 'View your order')}`;
  await sendEmail({
    to: order.email,
    subject: `${preorder ? 'Preorder' : 'Order'} ${order.number} confirmed`,
    html: layout(preorder ? 'Your preorder is in.' : 'Your order is confirmed.', body, settings),
  });
  if (env.adminNotifyEmail) {
    await sendEmail({
      to: env.adminNotifyEmail,
      subject: `New ${order.kind} ${order.number} — ${money(order.total)}`,
      html: layout(`New ${order.kind}`, `${itemsTable(items)}${button(`${env.siteUrl}/admin/orders/${order.id}`, 'Open in admin')}`, settings),
    });
  }
}

export async function emailBalanceRequest(order: Order, settings: Settings) {
  const body = `
<p>Good news: your Torvaxo preorder <strong>${esc(order.number)}</strong> is ready to ship.</p>
<p style="font-size:14px">Remaining balance: <strong>${money(order.balance_due)}</strong>. Pay online now, or choose cash on delivery.</p>
${button(balanceUrl(order), 'Pay the balance')}`;
  await sendEmail({ to: order.email, subject: `Your preorder ${order.number} is ready — balance due`, html: layout('Ready to ship.', body, settings) });
}

export async function emailReward(order: Order, coupon: Coupon, settings: Settings) {
  const expires = coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString('en-GB', { dateStyle: 'long' }) : '';
  const body = `
<p>Thank you for buying at launch. Here is your launch-buyer reward: <strong>${coupon.percent}% off everything</strong> on torvaxo.pk for a year.</p>
<p style="font-size:28px;font-family:monospace;letter-spacing:0.08em;background:#0e0e10;color:#f4f2ee;padding:16px;text-align:center">${esc(coupon.code)}</p>
<p style="font-size:14px">Valid until ${esc(expires)}. Use it as often as you like with ${esc(order.email)}.</p>`;
  await sendEmail({ to: order.email, subject: `Your ${coupon.percent}% launch reward`, html: layout('A year of 12% off.', body, settings) });
}

export async function emailShipped(order: Order, settings: Settings) {
  const body = `
<p>Your order <strong>${esc(order.number)}</strong> is on its way.</p>
${order.carrier || order.tracking_number ? `<p style="font-size:14px">${esc(order.carrier)} ${order.tracking_number ? `· Tracking: <strong>${esc(order.tracking_number)}</strong>` : ''}</p>` : ''}
${order.balance_due > 0 ? `<p style="font-size:14px">Please keep <strong>${money(order.balance_due)}</strong> ready for the courier.</p>` : ''}
${button(orderUrl(order), 'View your order')}`;
  await sendEmail({ to: order.email, subject: `Order ${order.number} has shipped`, html: layout('On its way.', body, settings) });
}
