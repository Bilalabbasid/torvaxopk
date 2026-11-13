import Link from 'next/link';
import { Badge, Empty, Flash, PageHeader, Pager, fmtDate, pageRange } from '@/components/admin/ui';
import { getSettings } from '@/lib/catalog';
import { db, must } from '@/lib/supabase/admin';
import type { Coupon } from '@/lib/types';
import { createCoupon, toggleCoupon } from '../../actions';

export const metadata = { title: 'Discounts' };

function isExpired(iso: string | null) {
  return Boolean(iso && new Date(iso) < new Date());
}

export default async function DiscountsPage(props: PageProps<'/admin/discounts'>) {
  const sp = await props.searchParams;
  const source = sp.source === 'launch_reward' || sp.source === 'manual' ? sp.source : '';
  const settings = await getSettings();
  const { page, from, to } = pageRange(sp.page);
  let query = db().from('coupons').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
  if (source) query = query.eq('source', source);
  const result = await query;
  const coupons = must(result, 'Coupons') as Coupon[];
  const total = result.count ?? coupons.length;

  return (
    <>
      <PageHeader title="Discounts" eyebrow={`Launch reward: ${settings.launch_coupon_percent}% for ${settings.launch_coupon_days} days`} />
      <Flash msg={sp.msg} error={sp.error} />

      <section className="admin-card mb-6 p-5">
        <h2 className="font-medium">Create a code</h2>
        <form action={createCoupon} className="mt-4 grid grid-cols-2 items-end gap-3 md:grid-cols-4 xl:grid-cols-7">
          <label className="block">
            <span className="field-label">Code</span>
            <input name="code" required placeholder="EID15" className="input h-10 font-mono text-sm uppercase" />
          </label>
          <label className="block">
            <span className="field-label">% off</span>
            <input name="percent" required inputMode="numeric" placeholder="10" className="input h-10 text-sm" />
          </label>
          <label className="block">
            <span className="field-label">Starts</span>
            <input name="starts_at" type="date" className="input h-10 text-sm" />
          </label>
          <label className="block">
            <span className="field-label">Expires</span>
            <input name="expires_at" type="date" className="input h-10 text-sm" />
          </label>
          <label className="block">
            <span className="field-label">Max uses</span>
            <input name="max_uses" inputMode="numeric" placeholder="∞" className="input h-10 text-sm" />
          </label>
          <label className="block">
            <span className="field-label">Only for email</span>
            <input name="email" type="email" placeholder="optional" className="input h-10 text-sm" />
          </label>
          <button className="btn-primary btn-sm h-10">Create</button>
        </form>
      </section>

      <div className="mb-3 flex gap-1">
        {[
          ['', 'All'],
          ['launch_reward', 'Launch rewards'],
          ['manual', 'Manual'],
        ].map(([v, label]) => (
          <Link key={v} href={v ? `/admin/discounts?source=${v}` : '/admin/discounts'} className={`btn-sm btn ${source === v ? 'bg-ink text-bone' : 'border border-ink/15 bg-white'}`}>
            {label}
          </Link>
        ))}
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>% off</th>
              <th>For</th>
              <th>Valid</th>
              <th className="!text-right">Uses</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const expired = isExpired(c.expires_at);
              return (
                <tr key={c.id}>
                  <td className="font-mono text-sm">{c.code}</td>
                  <td className="text-xs">{c.source === 'launch_reward' ? 'Launch reward' : 'Manual'}</td>
                  <td className="font-mono">{c.percent}%</td>
                  <td className="text-xs">
                    {c.email ?? 'Everyone'}
                    {c.issued_order_id ? (
                      <Link href={`/admin/orders/${c.issued_order_id}`} className="block text-ink/50 hover:text-ember-600">
                        from order →
                      </Link>
                    ) : null}
                  </td>
                  <td className="text-xs text-ink/60">
                    {fmtDate(c.starts_at, false)} – {c.expires_at ? fmtDate(c.expires_at, false) : 'no end'}
                  </td>
                  <td className="text-right font-mono">
                    {c.uses}
                    {c.max_uses ? ` / ${c.max_uses}` : ''}
                  </td>
                  <td>
                    <Badge value={!c.active ? 'archived' : expired ? 'cancelled' : 'active'} />
                  </td>
                  <td>
                    <form action={toggleCoupon}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="active" value={String(!c.active)} />
                      <input type="hidden" name="return" value={source ? `/admin/discounts?source=${source}` : '/admin/discounts'} />
                      <button className="text-xs text-ink/60 hover:text-ink">{c.active ? 'Disable' : 'Enable'}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!coupons.length ? <Empty>No codes yet. Launch rewards appear here automatically once the sale is live.</Empty> : null}
      </div>
      <Pager path="/admin/discounts" params={{ source }} page={page} total={total} />
    </>
  );
}
