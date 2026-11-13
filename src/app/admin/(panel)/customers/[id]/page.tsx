import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Empty, PageHeader, fmtDate } from '@/components/admin/ui';
import { money } from '@/lib/pricing';
import { db, must } from '@/lib/supabase/admin';
import type { Coupon, Customer, Order } from '@/lib/types';

export const metadata = { title: 'Customer' };

export default async function CustomerPage(props: PageProps<'/admin/customers/[id]'>) {
  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const customer = must(await db().from('customers').select('*').eq('id', id).maybeSingle(), 'Customer') as Customer | null;
  if (!customer) notFound();
  const [orders, coupons] = await Promise.all([
    must(await db().from('orders').select('*').eq('customer_id', id).order('created_at', { ascending: false }), 'Orders') as Order[],
    must(await db().from('coupons').select('*').ilike('email', customer.email), 'Coupons') as Coupon[],
  ]);

  return (
    <>
      <PageHeader eyebrow={customer.email} title={customer.name || customer.email} />
      <div className="grid gap-6 xl:grid-cols-3">
        <section className="admin-card overflow-x-auto xl:col-span-2">
          <h2 className="border-b border-ink/10 px-4 py-3 font-medium">Orders</h2>
          <table className="admin-table">
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs hover:text-ember-600">
                      {o.number}
                    </Link>
                  </td>
                  <td className="text-xs text-ink/50">{fmtDate(o.created_at)}</td>
                  <td>
                    <Badge value={o.kind} />
                  </td>
                  <td>
                    <Badge value={o.status} />
                  </td>
                  <td className="text-right font-mono">{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length ? <Empty>No orders.</Empty> : null}
        </section>
        <div className="space-y-6">
          <section className="admin-card p-5 text-sm">
            <h2 className="font-medium">Contact</h2>
            <p className="mt-3">
              {customer.phone}
              <br />
              {customer.city}
              <br />
              Customer since {fmtDate(customer.created_at, false)}
            </p>
          </section>
          <section className="admin-card p-5 text-sm">
            <h2 className="font-medium">Codes</h2>
            <ul className="mt-3 space-y-2">
              {coupons.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span className="font-mono">{c.code}</span>
                  <span>
                    {c.percent}% · {c.active ? `until ${fmtDate(c.expires_at, false)}` : 'disabled'}
                  </span>
                </li>
              ))}
              {!coupons.length ? <li className="text-ink/50">None.</li> : null}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
