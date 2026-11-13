import { CheckoutForm } from '@/components/checkout-form';
import { paymentsAreMock } from '@/lib/payments';

export const metadata = { title: 'Checkout', robots: { index: false } };

export default function CheckoutPage() {
  return <CheckoutForm testMode={paymentsAreMock()} />;
}
