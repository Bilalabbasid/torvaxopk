import Link from 'next/link';
import { AdminNav } from '@/components/admin/nav';
import { Logo } from '@/components/brand';
import { requireAdmin } from '@/lib/admin-auth';
import { getSettings } from '@/lib/catalog';
import { paymentsAreMock } from '@/lib/payments';
import { signOut } from '../actions';

export const metadata = { title: { default: 'Admin', template: '%s · Admin · Torvaxo PK' }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const admin = await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="min-h-svh bg-bone-200/40 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="flex flex-col bg-ink text-bone lg:sticky lg:top-0 lg:h-svh">
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/admin" aria-label="Dashboard">
            <Logo className="h-3.5 w-auto text-bone" />
          </Link>
          <span className="label text-[9px] text-steel">PK</span>
        </div>
        <div className="px-5 pb-4">
          <span
            className={`label inline-flex items-center gap-2 px-2 py-1 text-[10px] ${
              settings.sale_mode === 'live' ? 'bg-ok/20 text-[#7fe0ad]' : 'bg-ember/20 text-ember'
            }`}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {settings.sale_mode === 'live' ? 'Sale live' : 'Preorder mode'}
          </span>
          {paymentsAreMock() ? <span className="label ml-2 bg-warn/30 px-2 py-1 text-[10px] text-[#ffcf85]">Test payments</span> : null}
        </div>
        <AdminNav />
        <div className="mt-auto border-t border-bone/10 px-5 py-4 text-xs text-bone/50">
          <p className="truncate">{admin.email}</p>
          <div className="mt-2 flex gap-4">
            <Link href="/" className="hover:text-bone" target="_blank">
              View store ↗
            </Link>
            <form action={signOut}>
              <button className="hover:text-bone">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 px-5 py-8 sm:px-8 lg:px-10">{children}</div>
    </div>
  );
}
