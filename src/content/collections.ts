// Landing pages for the searches people in Pakistan make before buying luggage.
// Keyword targets and monthly volumes are from Semrush, Pakistan database (Nov 2026); they decide the
// title, heading and intro of each page. Prices in the copy are filled in from the live catalogue.

import type { Product } from '@/lib/types';

export interface Faq {
  q: string;
  /** {from} is replaced with the lowest current price on the page. */
  a: string;
}

export interface Collection {
  slug: string;
  /** <title>, kept under ~60 characters with the main keyword first. */
  title: string;
  /** Meta description, ~150 characters. {from} is replaced with the lowest price. */
  description: string;
  eyebrow: string;
  h1: string;
  intro: string[];
  /** Main keywords this page targets (for reference; not rendered). */
  keywords: string[];
  filter: (p: Product) => boolean;
  faqs: Faq[];
  /** Shown in the footer and the shop page's "Popular" row. */
  nav: string;
}

const BAG_CATEGORIES = ['backpacks', 'work', 'slings', 'duffels'];

export const COLLECTIONS: Collection[] = [
  {
    slug: 'suitcases',
    nav: 'Suitcases',
    title: 'Suitcase Price in Pakistan: Hardshell Trolley Bags',
    description:
      'Hardshell suitcases and trolley bags from Torvaxo, a German brand. Cabin 20", Medium 24" and Large 28" from {from}. TSA lock, spinner wheels, delivery across Pakistan.',
    eyebrow: 'Suitcases & trolley bags',
    h1: 'Suitcases and trolley bags',
    intro: [
      'Torvaxo is a German luggage brand. The Forward series is a ribbed hardshell suitcase built to EU quality standards, in three sizes: Cabin (20 inch), Medium (24 inch) and Large (28 inch). Every case has a TSA combination lock built into the frame and four 360° double spinner wheels that detach, so a worn wheel is a quick swap rather than a new suitcase.',
      'Prices start from {from} on preorder, with delivery across Pakistan, cash on delivery for the balance, a 2-year warranty and 7-day returns.',
    ],
    keywords: ['suitcase', 'suitcase price in pakistan', 'luggage bag price in pakistan', 'trolley bags', 'trolley bag price in pakistan', 'luggage bags', 'luggage pakistan'],
    filter: (p) => p.category === 'luggage' && !p.is_set,
    faqs: [
      { q: 'What is the suitcase price in Pakistan?', a: 'Torvaxo Forward suitcases start from {from} on preorder for the 20 inch Cabin. Medium (24 inch) and Large (28 inch) cost more, and the Set of Three costs less than buying the three sizes one by one.' },
      { q: 'Which suitcase size should I buy?', a: 'Cabin (20 inch, 38 L) is for hand carry and trips of 1–3 days. Medium (24 inch, 68 L) suits a week away. Large (28 inch, 102 L) is for trips of 8 days or more and family travel.' },
      { q: 'Do the suitcases have a TSA lock?', a: 'Yes. Every Forward case has a TSA combination lock built into the frame, with both zip pullers docking into it.' },
      { q: 'Can I replace the wheels?', a: 'Yes. All four 360° double spinner wheels detach. Replacement wheels are sold separately, single or as a set of four.' },
    ],
  },
  {
    slug: 'luggage-sets',
    nav: 'Luggage sets',
    title: 'Luggage Set Price in Pakistan: 3-Piece Suitcase Set',
    description:
      '3-piece hardshell suitcase sets from Torvaxo: Cabin 20", Medium 24" and Large 28" from {from}. Six designs, TSA lock, spinner wheels. Delivery across Pakistan.',
    eyebrow: 'Luggage sets',
    h1: 'Luggage sets',
    intro: [
      'Every Torvaxo set is three hardshell suitcases: Cabin (20 inch), Medium (24 inch) and Large (28 inch), each with a TSA combination lock and 360° spinner wheels.',
      'The Forward Set of Three comes in five colours, and you can give each case its own. Prism, Aegis, Onyx, Meridian and Stratos are bolder designs in Black. Sets start from {from} on preorder.',
    ],
    keywords: ['suitcase set price in pakistan', 'suitcase set', 'luggage set', 'luggage set price in pakistan', '3 piece luggage set'],
    filter: (p) => p.category === 'luggage' && p.is_set,
    faqs: [
      { q: 'What is the price of a 3-piece luggage set in Pakistan?', a: 'Torvaxo sets start from {from} on preorder with the Forward Set of Three, for a Cabin, a Medium and a Large hardshell suitcase. The designer sets (Prism, Aegis, Onyx, Meridian and Stratos) cost Rs 15,000 more.' },
      { q: 'Can I choose a different colour for each suitcase in the set?', a: 'On the Forward Set of Three, yes. Pick one colour for all three, or choose the colour of the Cabin, Medium and Large case separately. The price stays the same. The designer sets come in Black.' },
      { q: 'How do the three suitcases store at home?', a: 'The Forward cases nest: the Cabin fits inside the Medium, and the Medium inside the Large, so the set takes the space of one case.' },
    ],
  },
  {
    slug: 'cabin-bags',
    nav: 'Cabin bags',
    title: 'Cabin Bag & Hand Carry Luggage in Pakistan',
    description:
      'Hand carry luggage that fits the overhead bin: the Torvaxo Forward Cabin 20" hardshell trolley, 55 × 37 × 21 cm, from {from}. TSA lock, spinner wheels.',
    eyebrow: 'Hand carry',
    h1: 'Cabin bags and hand carry luggage',
    intro: [
      'The Forward Cabin is a 20 inch hardshell trolley bag sized for the overhead bin: 55 × 37 × 21 cm and 2.9 kg, with 38 litres inside. It rolls on four detachable 360° spinners and locks with a TSA combination lock.',
      'Hand carry allowances differ by airline and fare, so always check yours before you fly. Our suitcase size guide lists the common limits.',
    ],
    keywords: ['hand carry travel bag', 'hand carry luggage', 'cabin bag', 'carry on travel bags', 'cabin size luggage dimensions', 'hand carry luggage size'],
    filter: (p) => p.category === 'luggage' && p.size_label === 'Cabin',
    faqs: [
      { q: 'What size is a cabin bag?', a: 'The Forward Cabin measures 55 × 37 × 21 cm including wheels and handle. Many airlines allow hand carry around 55 × 40 × 20 cm and 7 kg, but limits vary, so check your airline before travelling.' },
      { q: 'How much does the Forward Cabin weigh?', a: 'It weighs 2.9 kg empty, leaving most of a typical hand carry allowance for your things.' },
      { q: 'How much is a cabin trolley bag?', a: 'The Forward Cabin starts from {from} on preorder.' },
    ],
  },
  {
    slug: 'travel-bags',
    nav: 'Travel bags',
    title: 'Travel Bags in Pakistan: Backpacks, Duffels & Slings',
    description:
      'Travel bags for men and women from Torvaxo, a German brand: backpacks, laptop packs, duffels and sling bags from {from}. Classic or Signature edition.',
    eyebrow: 'Travel bags',
    h1: 'Travel bags',
    intro: [
      'Everything that travels with the case: everyday and laptop backpacks, a travel pack that carries like a pack and packs like a case, a duffel for the gym or the weekend, and cross-body sling bags.',
      'Most bags come in Black and Light Grey, each as Classic or as Signature with the Torvaxo X on the front. Prices start from {from} on preorder.',
    ],
    keywords: ['travel bag', 'travel bag for men', 'travel bag price in pakistan', 'travel bags pakistan', 'traveling bags', 'bags for travelling'],
    filter: (p) => BAG_CATEGORIES.includes(p.category),
    faqs: [
      { q: 'What is the travel bag price in Pakistan?', a: 'Torvaxo travel bags start from {from} on preorder. The Signature edition of each bag costs a little more.' },
      { q: 'Which travel bag is best for men?', a: 'For flights, the Relay Travel Pack: a boxy pack with side compression straps that goes under the seat. For the gym or a weekend, the Haul Duffel. For daily use, a Vector backpack or a Pivot sling.' },
      { q: 'What is the Signature edition?', a: 'The same bag with the Torvaxo X on the front: tone-on-tone chevrons traced by one thin orange line.' },
    ],
  },
  {
    slug: 'backpacks',
    nav: 'Backpacks',
    title: 'Backpacks in Pakistan: Laptop & Travel Backpacks',
    description:
      'Backpacks for men and women from Torvaxo: everyday daypacks, flap and utility packs and a laptop travel pack from {from}. Black or Light Grey.',
    eyebrow: 'Backpacks',
    h1: 'Backpacks',
    intro: [
      'Three Vector backpacks and the Relay Travel Pack. The Vector Daypack is the clean everyday pack, the Flap closes with two snap buttons, and the Utility has the most pockets with two buckle straps across the front. The Relay is a boxy laptop and travel pack with compression straps.',
      'Black or Light Grey, Classic or Signature, from {from} on preorder.',
    ],
    keywords: ['backpack', 'backpacks for men', 'laptop backpack', 'travel backpack', 'backpack price in pakistan', 'backpacks for women', 'laptop backpack pakistan'],
    filter: (p) => p.category === 'backpacks' || p.category === 'work',
    faqs: [
      { q: 'What is the backpack price in Pakistan?', a: 'Torvaxo backpacks start from {from} on preorder.' },
      { q: 'Which backpack fits a laptop?', a: 'The Relay Travel Pack is built as a travel and laptop pack. The Vector backpacks carry everyday essentials.' },
    ],
  },
  {
    slug: 'duffel-bags',
    nav: 'Duffel bags',
    title: 'Duffel Bag Price in Pakistan: Travel & Gym Duffle',
    description:
      'The Torvaxo Haul Duffel: a soft travel and gym duffle bag with a wide twin-zip opening and shoulder strap, from {from}. Delivery across Pakistan.',
    eyebrow: 'Duffel bags',
    h1: 'Duffel bags',
    intro: [
      'The Haul Duffel is a soft duffle bag for the gym, the weekend, or everything that would not fit in the case. A wide twin-zip opening, a front zip pocket, carry handles with a wrap and a shoulder strap.',
      'In Black or Light Grey, Classic or Signature, from {from} on preorder.',
    ],
    keywords: ['duffel bag', 'duffle bag', 'travel duffel bags', 'gym duffle bag'],
    filter: (p) => p.category === 'duffels',
    faqs: [
      { q: 'Duffel or duffle bag: is there a difference?', a: 'No, they are two spellings of the same bag: a soft, open-top holdall with handles and a shoulder strap.' },
      { q: 'What is the duffel bag price?', a: 'The Torvaxo Haul Duffel starts from {from} on preorder.' },
    ],
  },
  {
    slug: 'sling-bags',
    nav: 'Sling bags',
    title: 'Sling Bags for Men & Women in Pakistan',
    description:
      'Cross-body sling bags from Torvaxo: Pivot Hydro with a bottle pocket, Pivot Lock with a combination lock, Pivot Duo and Pivot Weave, from {from}.',
    eyebrow: 'Sling bags',
    h1: 'Sling bags',
    intro: [
      'Four cross-body slings for travel days and city days. The Pivot Hydro holds a bottle upright, the Pivot Lock locks with a combination on the side, the Pivot Duo has a tan side panel, and the Pivot Weave adds a woven front.',
      'Classic or Signature, from {from} on preorder.',
    ],
    keywords: ['sling bag', 'sling bag for men', 'sling bag for ladies', 'sling bags for women', 'travel crossbody bag'],
    filter: (p) => p.category === 'slings',
    faqs: [
      { q: 'What is a sling bag?', a: 'A compact bag worn across the body on one strap, so your phone, wallet and passport stay in front of you and within reach.' },
      { q: 'Which sling bag has a lock?', a: 'The Pivot Lock has a combination lock on the side and a flap over the front pocket.' },
    ],
  },
  {
    slug: 'luggage-wheels',
    nav: 'Luggage wheels',
    title: 'Suitcase Wheels Replacement in Pakistan',
    description:
      'Replacement spinner wheels for Torvaxo Forward suitcases, single or as a set of four, from {from}. Detachable: swap a worn wheel in seconds.',
    eyebrow: 'Wheels and parts',
    h1: 'Replacement suitcase wheels',
    intro: [
      'Every Forward suitcase rolls on four detachable 360° double spinner wheels. When one wears out, take it off and fit a new one: no workshop, no waiting.',
      'Buy a single wheel or a set of four, from {from}.',
    ],
    keywords: ['trolley bag wheels', 'luggage wheels', 'suitcase wheels', 'luggage wheels replacement'],
    filter: (p) => p.category === 'parts',
    faqs: [
      { q: 'Do the wheels fit other brands?', a: 'They are made for Torvaxo Forward cases. Other suitcases use different fittings.' },
    ],
  },
];

export function getCollection(slug: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}
