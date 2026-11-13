'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { startBalanceAction } from '@/app/actions';
import { PAYMENT_LABELS } from '@/lib/constants';
import { money } from '@/lib/pricing';
import type { PaymentMethod } from '@/lib/types';

export function BalancePay({ token, methods, amount }: { token: string; methods: PaymentMethod[]; amount: number }) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pay() {
    if (!method) return;
    start(async () => {
      const result = await startBalanceAction(token, method);
      if (!result.ok) return setError(result.error);
      if (result.next.startsWith('/pay/')) window.location.assign(result.next);
      else router.push(result.next);
    });
  }

  return (
    <div className="mt-10">
      <p className="label mb-4 text-steel-600">How would you like to pay?</p>
      <div className="space-y-2">
        {methods.map((m) => (
          <label key={m} className={`flex cursor-pointer items-center gap-4 border px-4 py-4 ${method === m ? 'border-ink bg-white' : 'border-ink/15'}`}>
            <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} className="accent-ink" />
            <span>
              <span className="block font-medium">{PAYMENT_LABELS[m].title}</span>
              <span className="block text-sm text-ink/60">{PAYMENT_LABELS[m].note}</span>
            </span>
          </label>
        ))}
      </div>
      {error ? <p className="mt-4 text-sm text-bad">{error}</p> : null}
      <button className="btn-primary mt-6 w-full" onClick={pay} disabled={!method || pending}>
        {pending ? 'One moment…' : method === 'cod' ? 'Confirm cash on delivery' : `Pay ${money(amount)}`}
      </button>
    </div>
  );
}
