import { Flash, PageHeader } from '@/components/admin/ui';
import { getSettings } from '@/lib/catalog';
import { PAYMENT_LABELS } from '@/lib/constants';
import { money } from '@/lib/pricing';
import { setSaleMode, updateSettings } from '../../actions';

export const metadata = { title: 'Settings' };

function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

export default async function SettingsPage(props: PageProps<'/admin/settings'>) {
  const sp = await props.searchParams;
  const s = await getSettings();
  const live = s.sale_mode === 'live';

  return (
    <>
      <PageHeader title="Settings" />
      <Flash msg={sp.msg} error={sp.error} />

      <section className={`mb-6 p-6 ${live ? 'bg-ok/10' : 'bg-ink text-bone'}`}>
        <p className={`label ${live ? 'text-ok' : 'text-ember'}`}>Sale mode</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight">{live ? 'The sale is live.' : 'Preorder mode.'}</h2>
        <p className={`mt-2 max-w-2xl text-sm ${live ? 'text-ink/70' : 'text-bone/70'}`}>
          {live
            ? `Customers pay regular prices in full (online or cash on delivery). Every paid order earns a ${s.launch_coupon_percent}% code valid for ${s.launch_coupon_days} days.`
            : `Customers see preorder prices and pay a ${money(s.deposit_amount)} deposit online; you collect the balance later from each order. Going live switches the store to regular prices and starts issuing launch rewards. Existing preorders keep their prices.`}
        </p>
        <form action={setSaleMode} className="mt-5">
          <input type="hidden" name="mode" value={live ? 'preorder' : 'live'} />
          <button className={live ? 'btn-outline btn-sm' : 'btn-ember btn-sm'}>{live ? 'Switch back to preorder mode' : 'Go live: start the sale'}</button>
        </form>
      </section>

      <form action={updateSettings} className="space-y-6">
        <section className="admin-card grid gap-4 p-5 md:grid-cols-3">
          <h2 className="font-medium md:col-span-3">Preorder & launch</h2>
          <Field label="Launch date (Pakistan time, informational)" name="launch_date" type="datetime-local" defaultValue={toLocalInput(s.launch_date)} />
          <Field label="Preorder deposit (Rs, per order)" name="deposit_amount" defaultValue={s.deposit_amount} />
          <Field label="Launch reward % off" name="launch_coupon_percent" defaultValue={s.launch_coupon_percent} />
          <Field label="Launch reward valid for (days)" name="launch_coupon_days" defaultValue={s.launch_coupon_days} />
          <Field label="Announcement bar (blank = automatic)" name="announcement" defaultValue={s.announcement ?? ''} wide />
        </section>

        <section className="admin-card grid gap-4 p-5 md:grid-cols-3">
          <h2 className="font-medium md:col-span-3">Delivery</h2>
          <Field label="Flat delivery fee (Rs)" name="shipping_flat" defaultValue={s.shipping_flat} />
          <Field label="Free delivery from (Rs, 0 = never)" name="shipping_free_from" defaultValue={s.shipping_free_from} />
          <Field label="Delivery time text" name="delivery_time" defaultValue={s.delivery_time} />
        </section>

        <section className="admin-card p-5">
          <h2 className="font-medium">Payment methods</h2>
          <p className="mt-1 text-xs text-ink/50">Gateway credentials live in environment variables. Cash on delivery is never offered for preorder deposits.</p>
          <div className="mt-4 flex flex-wrap gap-6">
            {(['safepay', 'jazzcash', 'easypaisa', 'cod'] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`pm_${m}`} defaultChecked={s.payment_methods?.[m] !== false} className="accent-ink" />
                {PAYMENT_LABELS[m].title}
              </label>
            ))}
          </div>
        </section>

        <section className="admin-card grid gap-4 p-5 md:grid-cols-3">
          <h2 className="font-medium md:col-span-3">Store details (shown in footer, emails and policy pages)</h2>
          <Field label="Store name" name="store_name" defaultValue={s.store_name} />
          <Field label="Email" name="store_email" defaultValue={s.store_email} />
          <Field label="Phone" name="store_phone" defaultValue={s.store_phone} />
          <Field label="WhatsApp" name="store_whatsapp" defaultValue={s.store_whatsapp} />
          <Field label="Address" name="store_address" defaultValue={s.store_address} wide />
        </section>

        <button className="btn-primary">Save settings</button>
      </form>

      <section className="admin-card mt-6 p-5">
        <h2 className="font-medium">Data exports</h2>
        <p className="mt-1 text-xs text-ink/50">
          CSV snapshots for accounting and off-site copies. For full backups see “Backups” in the README (Supabase backups +{' '}
          <code>npm run backup</code>).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {['orders', 'customers', 'payments', 'coupons'].map((k) => (
            <a key={k} href={`/admin/export/${k}.csv`} className="btn-outline btn-sm capitalize">
              {k}.csv
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

function Field({ label, name, defaultValue, type = 'text', wide }: { label: string; name: string; defaultValue: string | number; type?: string; wide?: boolean }) {
  return (
    <label className={`block ${wide ? 'md:col-span-2' : ''}`}>
      <span className="field-label">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} className="input h-10 text-sm" />
    </label>
  );
}
