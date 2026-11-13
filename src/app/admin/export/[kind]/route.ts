import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/supabase/admin';

// CSV downloads for the back office: /admin/export/orders.csv, customers.csv, payments.csv, coupons.csv
const EXPORTS: Record<string, { table: string; columns: string[] }> = {
  orders: {
    table: 'orders',
    columns: [
      'number', 'created_at', 'kind', 'sale_mode', 'status', 'payment_status', 'payment_method', 'name', 'email', 'phone',
      'address_line1', 'address_line2', 'city', 'province', 'postal_code', 'subtotal', 'discount', 'shipping', 'total',
      'deposit_amount', 'amount_paid', 'balance_due', 'coupon_code', 'carrier', 'tracking_number', 'customer_note', 'internal_note', 'id',
    ],
  },
  customers: { table: 'customers', columns: ['email', 'name', 'phone', 'city', 'created_at', 'id'] },
  payments: { table: 'payments', columns: ['reference', 'created_at', 'order_id', 'provider', 'purpose', 'amount', 'status', 'provider_ref', 'updated_at'] },
  coupons: { table: 'coupons', columns: ['code', 'percent', 'source', 'email', 'starts_at', 'expires_at', 'max_uses', 'uses', 'active', 'issued_order_id', 'created_at'] },
};

function cell(value: unknown) {
  if (value == null) return '';
  let s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_request: Request, ctx: RouteContext<'/admin/export/[kind]'>) {
  if (!(await getAdmin())) return new NextResponse('Forbidden', { status: 403 });
  const { kind } = await ctx.params;
  const spec = EXPORTS[kind.replace(/\.csv$/, '')];
  if (!spec) return new NextResponse('Unknown export', { status: 404 });

  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db()
      .from(spec.table)
      .select(spec.columns.join(','))
      .order('created_at', { ascending: true })
      .range(from, from + 999);
    if (error) return new NextResponse(error.message, { status: 500 });
    rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if (!data || data.length < 1000) break;
  }

  const csv = [spec.columns.join(','), ...rows.map((r) => spec.columns.map((c) => cell(r[c])).join(','))].join('\r\n');
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse('﻿' + csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="torvaxo-pk-${kind.replace(/\.csv$/, '')}-${stamp}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
