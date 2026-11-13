'use client';

import { useEffect, useRef } from 'react';

/** A hidden signed form that posts itself to the payment gateway, with a manual fallback button. */
export function AutoSubmit({ action, fields }: { action: string; fields: Record<string, string> }) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    ref.current?.submit();
  }, []);
  return (
    <form ref={ref} method="POST" action={action} className="mt-8">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <noscript>JavaScript is off: press the button to continue.</noscript>
      <button type="submit" className="btn-outline btn-sm">
        Continue to payment
      </button>
    </form>
  );
}
