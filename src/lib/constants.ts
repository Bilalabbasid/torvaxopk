export const PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu and Kashmir',
] as const;

export const PAYMENT_LABELS: Record<string, { title: string; note: string }> = {
  safepay: { title: 'Debit / credit card', note: 'Visa, Mastercard and UnionPay via Safepay' },
  jazzcash: { title: 'JazzCash', note: 'Mobile wallet, card or voucher' },
  easypaisa: { title: 'Easypaisa', note: 'Mobile account or card' },
  cod: { title: 'Cash on delivery', note: 'Pay the courier when it arrives' },
  mock: { title: 'Test payment', note: '' },
  manual: { title: 'Manual', note: '' },
};
