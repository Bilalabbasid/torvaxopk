import Link from 'next/link';
import { Empty, PageHeader, Pager, fmtDate, pageRange } from '@/components/admin/ui';
import { money } from '@/lib/pricing';
import { db, must } from '@/lib/supabase/admin';
import type { Customer } from '@/lib/types';

export const metadata = { title: 'Customers' };

export default async function CustomersPage(props: PageProps<'/admin/customers'>) {
  const sp = await props.searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim().replace(/[%,()]/g, '') : '';
  const { page, from, to } = pageRange(sp.page);
  let query = db()
    .from('customers')
    .select('*, orders(total, amount_paid, status, created_at)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (q) query = query.or(`email.ilike.%${q}%,name.ilike.%${q}%,phone.ilike.%${q}%,city.ilike.%${q}%`);
  const result = await query;
  const customers = must(result, 'Customers') as (Customer & {
    orders: { total: number; amount_paid: number; status: string; created_at: string }[];
  })[];
  const total = result.count ?? customers.length;

  return (
    <>
      <PageHeader title="Customers" eyebrow={`${total} customers`} />
      <form className="mb-4 flex gap-2" action="/admin/customers">
        <input name="q" defaultValue={q} placeholder="Name, email, phone, city" className="input h-9 w-72 text-sm" />
        <button className="btn-primary btn-sm">Search</button>
      </form>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>City</th>
              <th className="!text-right">Orders</th>
              <th className="!text-right">Paid</th>
              <th>Last order</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const valid = c.orders.filter((o) => o.status !== 'cancelled');
              const last = c.orders.map((o) => o.created_at).sort().at(-1);
              return (
                <tr key={c.id} className="hover:bg-bone/50">
                  <td>
                    <Link href={`/admin/customers/${c.id}`} className="font-medium hover:text-ember-600">
                      {c.name || c.email}
                    </Link>
                    <p className="text-xs text-ink/50">{c.email}</p>
                  </td>
                  <td className="text-sm">{c.phone}</td>
                  <td className="text-sm">{c.city}</td>
                  <td className="text-right font-mono">{valid.length}</td>
                  <td className="text-right font-mono tabular-nums">{money(valid.reduce((s, o) => s + o.amount_paid, 0))}</td>
                  <td className="text-xs text-ink/50">{fmtDate(last, false)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!customers.length ? <Empty>No customers yet.</Empty> : null}
      </div>
      <Pager path="/admin/customers" params={{ q }} page={page} total={total} />
    </>
  );
}
