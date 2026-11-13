'use client';

import { Logo } from '@/components/brand';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const notConfigured = error.message?.includes('Supabase is not configured');
  return (
    <main className="grid min-h-svh place-items-center bg-paper p-6">
      <div className="max-w-md text-center">
        <Logo className="mx-auto h-5 w-auto" />
        <h1 className="mt-10 text-3xl font-medium tracking-tight">Something went wrong.</h1>
        <p className="mt-3 text-ink/70">
          {notConfigured
            ? 'The store database is not connected yet. Add the Supabase keys to .env.local (see README) and restart.'
            : 'Please try again in a moment.'}
        </p>
        <button className="btn-primary mt-8" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
