// Information and policy pages. PLACEHOLDER TEXT — have it reviewed for Pakistani consumer law
// (incl. provincial consumer protection acts and PECA 2016) before launch.
import { money } from '@/lib/pricing';
import type { Settings } from '@/lib/types';

export interface InfoSection {
  heading: string;
  body: string[];
}

export interface InfoPage {
  label: string;
  title: string;
  intro: string;
  sections: (s: Settings) => InfoSection[];
}

export const INFO_PAGES: Record<string, InfoPage> = {
  launch: {
    label: 'Preorder & launch',
    title: 'Preorder now. Pay less. Get rewarded at launch.',
    intro: 'How preorders, deposits and the launch-buyer reward work on torvaxo.pk.',
    sections: (s) => [
      {
        heading: 'Preorder pricing',
        body: [
          'Before the sale goes live, every Forward case can be preordered at a lower preorder price. This is not a discount or a sale: it is a price for preorders only. Once we launch, every case goes to its regular price.',
          'Preordered one by one, the three cases come to Rs 43,497 (Rs 10,499 + Rs 13,999 + Rs 18,999). Preordered as a Set of Three they are Rs 35,000, which saves Rs 8,497. After launch the set is Rs 51,000.',
          `To lock in your preorder price you pay a deposit of ${money(s.deposit_amount)} today by card, JazzCash or Easypaisa. The rest is due when your order is ready to ship.`,
        ],
      },
      {
        heading: 'Paying the balance',
        body: [
          'When your luggage is ready to dispatch we email you a secure link. Pay the balance online, or choose cash on delivery and pay the courier.',
          'Your preorder price is guaranteed. Changed your mind before dispatch? Contact us and we refund your deposit in full.',
        ],
      },
      {
        heading: `The launch-buyer reward: ${s.launch_coupon_percent}% off for a year`,
        body: [
          `Buy at the full launch price once the sale is live and we send you a personal code for ${s.launch_coupon_percent}% off everything on torvaxo.pk, valid for ${Math.round(s.launch_coupon_days / 30.4)} months.`,
          'Use it as often as you like with the email address you ordered with. It applies to the whole order, excluding delivery.',
          'The reward is for launch buyers; preorders already enjoy the lower preorder price.',
        ],
      },
    ],
  },
  shipping: {
    label: 'Delivery',
    title: 'Delivery',
    intro: 'We deliver to every province of Pakistan.',
    sections: (s) => [
      {
        heading: 'Times and costs',
        body: [
          `Orders ship within ${s.delivery_time} of payment (preorders: from the launch date).`,
          s.shipping_free_from > 0
            ? `Delivery costs ${money(s.shipping_flat)}, and is free for orders over ${money(s.shipping_free_from)}.`
            : `Delivery costs ${money(s.shipping_flat)}.`,
        ],
      },
      {
        heading: 'Cash on delivery',
        body: ['Cash on delivery is available for in-stock orders and for preorder balances. Please keep the exact amount ready for the courier.'],
      },
      { heading: 'Tracking', body: ['You receive a tracking number by email as soon as your parcel leaves our warehouse.'] },
    ],
  },
  returns: {
    label: 'Returns',
    title: 'Returns',
    intro: 'Not right? Send it back.',
    sections: (s) => [
      {
        heading: '7-day returns',
        body: [
          'Unused items in their original packaging can be returned within 7 days of delivery for a full refund of the item price.',
          `Start a return by emailing ${s.store_email} or messaging us on WhatsApp at ${s.store_whatsapp} with your order number.`,
        ],
      },
      {
        heading: 'Refunds',
        body: ['Card, JazzCash and Easypaisa payments are refunded to the original method. Cash on delivery orders are refunded by bank transfer or mobile wallet.'],
      },
    ],
  },
  warranty: {
    label: 'Warranty',
    title: 'Warranty',
    intro: 'Built to last, and backed for it.',
    sections: () => [
      {
        heading: 'What is covered',
        body: [
          'PLACEHOLDER: shell, handle, zips and lock are covered against manufacturing defects for 2 years from delivery.',
          'Wheels are detachable and replaceable; replacement wheels will be sold separately.',
        ],
      },
      { heading: 'Not covered', body: ['Normal wear, scuffs, airline damage and misuse.'] },
    ],
  },
  privacy: {
    label: 'Privacy',
    title: 'Privacy policy',
    intro: 'What we collect and why. PLACEHOLDER — legal review required.',
    sections: (s) => [
      {
        heading: 'Data we collect',
        body: [
          'Your name, email, phone number and delivery address, to process and deliver your order.',
          'Card and wallet details are entered on the payment provider’s page (Safepay, JazzCash or Easypaisa). We never see or store them.',
        ],
      },
      {
        heading: 'Who we share it with',
        body: ['Our courier partner (for delivery), our payment providers (for payment), and our email provider (for order emails). We do not sell your data.'],
      },
      { heading: 'Contact', body: [`Questions or deletion requests: ${s.store_email}.`] },
    ],
  },
  terms: {
    label: 'Terms',
    title: 'Terms of sale',
    intro: 'PLACEHOLDER terms of sale — legal review required before launch.',
    sections: (s) => [
      { heading: 'Seller', body: [`${s.store_name}, ${s.store_address}.`] },
      {
        heading: 'Prices',
        body: ['All prices are in Pakistani rupees and include applicable taxes. Delivery is shown separately at checkout.'],
      },
      {
        heading: 'Preorders',
        body: [
          'A preorder is a binding order at the preorder price, secured with a deposit. The balance is due before or on delivery. If we cannot fulfil a preorder, the deposit is refunded in full.',
        ],
      },
      {
        heading: 'Coupons',
        body: ['Coupons cannot be exchanged for cash. Personal codes are tied to the email address they were issued to.'],
      },
    ],
  },
  contact: {
    label: 'Contact',
    title: 'Contact',
    intro: 'We are here to help.',
    sections: (s) => [
      {
        heading: 'Get in touch',
        body: [`Email: ${s.store_email}`, `Phone: ${s.store_phone}`, `WhatsApp: ${s.store_whatsapp}`, `Address: ${s.store_address}`],
      },
    ],
  },
};
