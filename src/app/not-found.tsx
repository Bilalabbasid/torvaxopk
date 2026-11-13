import Link from 'next/link';
import { Chevrons } from '@/components/brand';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="container-x flex min-h-[70vh] flex-col items-start justify-center py-24">
        <Chevrons count={5} className="h-10 w-auto text-ember" />
        <p className="label mt-10 text-steel-600">Error 404</p>
        <h1 className="display mt-4 text-6xl sm:text-8xl">Wrong gate.</h1>
        <p className="mt-6 max-w-md text-lg text-ink/70">This page does not exist, or it has moved on without us.</p>
        <Link href="/" className="btn-primary mt-9 h-14 px-8">
          Back to the start <Chevrons count={1} className="h-3 w-auto text-ember" />
        </Link>
      </section>
    </main>
  );
}
