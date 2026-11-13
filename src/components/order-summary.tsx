import { money } from '@/lib/pricing';
import type { Quote } from '@/lib/orders';

export function TotalsTable({ quote }: { quote: Quote }) {
  const { totals, saleMode, coupon } = quote;
  const preorder = saleMode === 'preorder' && totals.dueLater > 0;
  return (
    <dl className="space-y-2.5 text-sm">
      <Row label="Subtotal" value={money(totals.subtotal)} />
      {totals.discount > 0 ? <Row label={`Code ${coupon?.code} (−${coupon?.percent}%)`} value={`−${money(totals.discount)}`} accent /> : null}
      <Row label="Delivery" value={totals.shipping === 0 ? 'Free' : money(totals.shipping)} />
      <div className="hairline flex justify-between border-t pt-3 text-base font-medium">
        <dt>Total</dt>
        <dd className="font-mono tabular-nums">{money(totals.total)}</dd>
      </div>
      {preorder ? (
        <div className="mt-3 space-y-2 bg-ink p-4 text-bone">
          <div className="flex justify-between font-medium">
            <dt>Deposit due today</dt>
            <dd className="font-mono tabular-nums text-ember">{money(totals.dueNow)}</dd>
          </div>
          <div className="flex justify-between text-bone/65">
            <dt>Balance when it ships</dt>
            <dd className="font-mono tabular-nums">{money(totals.dueLater)}</dd>
          </div>
        </div>
      ) : null}
      {totals.savings > 0 ? <p className="pt-1 text-ok">You save {money(totals.savings)}.</p> : null}
    </dl>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? 'text-ok' : 'text-ink/75'}`}>
      <dt>{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}
