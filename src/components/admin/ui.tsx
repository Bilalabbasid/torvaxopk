import Link from 'next/link';
import type { ReactNode } from 'react';

export function PageHeader({ title, eyebrow, actions }: { title: string; eyebrow?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="label text-steel-600">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-medium tracking-tight">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Flash({ msg, error }: { msg?: string | string[]; error?: string | string[] }) {
  if (error) {
    return <p className="mb-6 border border-bad/30 bg-bad/5 px-4 py-3 text-sm text-bad" role="alert">{String(error)}</p>;
  }
  if (msg) {
    return <p className="mb-6 border border-ok/30 bg-ok/5 px-4 py-3 text-sm text-ok" role="status">{String(msg)}</p>;
  }
  return null;
}

const TONES: Record<string, string> = {
  pending: 'bg-warn/10 text-warn',
  unpaid: 'bg-warn/10 text-warn',
  confirmed: 'bg-ink/10 text-ink',
  processing: 'bg-ink/10 text-ink',
  deposit_paid: 'bg-ember/15 text-ember-600',
  preorder: 'bg-ember/15 text-ember-600',
  shipped: 'bg-ok/10 text-ok',
  delivered: 'bg-ok/15 text-ok',
  paid: 'bg-ok/15 text-ok',
  active: 'bg-ok/15 text-ok',
  live: 'bg-ok/15 text-ok',
  cancelled: 'bg-bad/10 text-bad',
  failed: 'bg-bad/10 text-bad',
  refunded: 'bg-steel/20 text-steel-600',
  draft: 'bg-steel/20 text-steel-600',
  archived: 'bg-steel/20 text-steel-600',
  standard: 'bg-ink/5 text-ink/70',
};

export function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 font-mono text-[11px] tracking-wide uppercase ${TONES[value] ?? 'bg-ink/5 text-ink/70'}`}>
      {value.replace('_', ' ')}
    </span>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <div className="admin-card h-full p-5">
      <p className="label text-steel-600">{label}</p>
      <p className="mt-3 font-mono text-2xl tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink/50">{hint}</p> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}

export function fmtDate(iso: string | null | undefined, withTime = true) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export const PAGE_SIZE = 50;

/** Reads ?page= and returns the Supabase range for it. */
export function pageRange(raw: unknown) {
  const page = Math.max(1, Math.floor(Number(raw)) || 1);
  return { page, from: (page - 1) * PAGE_SIZE, to: page * PAGE_SIZE - 1 };
}

/** Newer/older links that keep the other query params. */
export function Pager({ path, params, page, total }: { path: string; params: Record<string, string>; page: number; total: number }) {
  if (total <= PAGE_SIZE) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    q.set('page', String(p));
    return `${path}?${q}`;
  };
  return (
    <div className="mt-4 flex justify-between text-sm">
      {page > 1 ? <Link href={href(page - 1)}>← Newer</Link> : <span />}
      <span className="text-ink/50">
        Page {page} of {Math.ceil(total / PAGE_SIZE)} · {total} total
      </span>
      {page * PAGE_SIZE < total ? <Link href={href(page + 1)}>Older →</Link> : <span />}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-ink/50">{children}</p>;
}
