import { redirect } from 'next/navigation';
import { Logo } from '@/components/brand';
import { getAdmin } from '@/lib/admin-auth';
import { signIn } from '../actions';

export const metadata = { title: 'Admin sign in', robots: { index: false } };

export default async function AdminLogin(props: PageProps<'/admin/login'>) {
  const { error } = await props.searchParams;
  if (await getAdmin().catch(() => null)) redirect('/admin');

  return (
    <main className="grid min-h-svh place-items-center bg-ink p-6">
      <form action={signIn} className="w-full max-w-sm bg-bone p-8">
        <Logo className="h-4 w-auto" />
        <p className="label mt-8 text-steel-600">Back office · torvaxo.pk</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Sign in</h1>
        {error ? <p className="mt-4 border border-bad/30 bg-bad/5 px-3 py-2 text-sm text-bad">{String(error)}</p> : null}
        <label className="mt-6 block">
          <span className="field-label">Email</span>
          <input className="input" name="email" type="email" autoComplete="username" required />
        </label>
        <label className="mt-4 block">
          <span className="field-label">Password</span>
          <input className="input" name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="btn-primary mt-6 w-full">Sign in</button>
      </form>
    </main>
  );
}
