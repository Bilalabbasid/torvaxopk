// Buying guides for high-volume questions people in Pakistan search before buying luggage.
// Targets from Semrush, Pakistan database (Nov 2026). Airline rules change: the copy names common
// figures and always tells readers to check their own airline and ticket.

export interface GuideSection {
  heading: string;
  body: string[];
  /** Optional table: first row is the header. */
  table?: string[][];
}

export interface Guide {
  slug: string;
  nav: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  keywords: string[];
  sections: GuideSection[];
  faqs: { q: string; a: string }[];
  /** Collection to send readers to at the end. */
  cta: { label: string; href: string };
}

export const GUIDES: Guide[] = [
  {
    slug: 'suitcase-sizes',
    nav: 'Suitcase size guide',
    title: 'Suitcase Sizes & Cabin Luggage Dimensions (Size Chart)',
    description:
      'Suitcase size chart in inches, centimetres and litres: 20" cabin, 24" medium and 28" large. Hand carry dimensions, weights and which size to buy for your trip.',
    h1: 'Suitcase sizes and cabin luggage dimensions',
    intro:
      'Suitcases are sold by height in inches: 20 inch for hand carry, 24 inch for a week, 28 inch for long trips. Here is what each size means in centimetres, litres and days of travel, and what to check before you fly.',
    keywords: ['suitcase sizes', 'suitcase dimensions', 'luggage bag size chart', 'luggage bag size', 'cabin size luggage dimensions', 'hand carry luggage size', 'carry on luggage size'],
    sections: [
      {
        heading: 'Suitcase size chart',
        body: ['Measurements of the Torvaxo Forward series, including wheels and handle.'],
        table: [
          ['Size', 'Dimensions', 'Volume', 'Weight', 'Best for'],
          ['Cabin, 20 inch', '55 × 37 × 21 cm', '38 L', '2.9 kg', 'Hand carry, 1–3 days'],
          ['Medium, 24 inch', '66 × 44 × 26 cm', '68 L', '3.7 kg', 'Check-in, 4–7 days'],
          ['Large, 28 inch', '76 × 50 × 30 cm', '102 L', '4.5 kg', 'Check-in, 8 days and longer'],
        ],
      },
      {
        heading: 'Cabin size luggage dimensions',
        body: [
          'Many airlines allow a hand carry bag of about 55 × 40 × 20 cm, and many set a weight limit of around 7 kg. Some budget fares allow only a small personal bag, and some routes allow more.',
          'Limits change and differ by airline, route and fare, so always check your own ticket before you pack. A 20 inch cabin case like the Forward Cabin (55 × 37 × 21 cm) is built around the common size.',
        ],
      },
      {
        heading: 'Which size should I buy?',
        body: [
          'Travelling light for a weekend or a business trip: a 20 inch cabin case, so you skip the baggage belt.',
          'A week away, or one checked bag for two people on a short trip: a 24 inch medium case.',
          'Two weeks or more, family travel, or flights home with gifts: a 28 inch large case. Check-in allowances are usually set by weight, so a lighter case leaves more for your things.',
          'If you travel in different ways through the year, a set of three covers every trip and nests into one case for storage.',
        ],
      },
      {
        heading: 'How to measure a suitcase',
        body: [
          'Measure height from the floor to the top of the handle (pushed in), width at the widest point, and depth including wheels and any front pocket. Airlines measure the whole case, not the shell alone.',
        ],
      },
    ],
    faqs: [
      { q: 'What size is a 20 inch suitcase in cm?', a: 'About 55 cm tall. The Forward Cabin is 55 × 37 × 21 cm including wheels and handle.' },
      { q: 'What size is a 24 inch suitcase in cm?', a: 'About 66 cm tall. The Forward Medium is 66 × 44 × 26 cm and holds 68 litres.' },
      { q: 'What size is a 28 inch suitcase in cm?', a: 'About 76 cm tall. The Forward Large is 76 × 50 × 30 cm and holds 102 litres.' },
      { q: 'What is the hand carry luggage size?', a: 'Many airlines allow about 55 × 40 × 20 cm and around 7 kg, but it depends on your airline and fare. Check your ticket before you fly.' },
    ],
    cta: { label: 'Shop suitcases', href: '/collections/suitcases' },
  },
  {
    slug: 'tsa-lock',
    nav: 'TSA lock guide',
    title: 'What Is a TSA Lock? How It Works on Luggage',
    description:
      'What a TSA lock is, why it matters on flights to and through the USA, and how a built-in TSA combination lock keeps your suitcase zips closed.',
    h1: 'What is a TSA lock?',
    intro:
      'A TSA lock is a luggage lock that US airport security can open with a master key, so they can inspect a checked bag without cutting the lock off. You can recognise it by the red diamond mark.',
    keywords: ['tsa lock', 'tsa luggage locks', 'tsa approved lock'],
    sections: [
      {
        heading: 'Why a TSA lock?',
        body: [
          'Checked bags on flights to, from or through the USA can be opened for inspection. With an ordinary lock, security may have to break it. A TSA lock opens with their master key and locks again afterwards.',
          'Elsewhere it works like any combination lock: your bag stays closed with your own code.',
        ],
      },
      {
        heading: 'A lock built into the frame',
        body: [
          'On Torvaxo Forward cases the TSA combination lock is built into the shell, and both zip pullers dock straight into it. There is nothing to attach or lose, and the zips cannot be pulled open without the code.',
          'Set your own code when the case arrives, following the instruction card in the case, and keep a note of it somewhere other than the suitcase.',
        ],
      },
    ],
    faqs: [
      { q: 'Do I need a TSA lock for flights from Pakistan?', a: 'It matters most on routes to, from or through the USA. On other routes it simply works as a combination lock.' },
      { q: 'Do Torvaxo suitcases have a TSA lock?', a: 'Yes. Every Forward case has a TSA combination lock built into the frame.' },
    ],
    cta: { label: 'Shop suitcases with a TSA lock', href: '/collections/suitcases' },
  },
  {
    slug: 'umrah-luggage',
    nav: 'Umrah luggage guide',
    title: 'Umrah Bags & Luggage: What to Take (Checklist)',
    description:
      'Which bags to take for Umrah: a check-in suitcase, a hand carry case and a sling bag for documents. Sizes, packing tips and a simple checklist.',
    h1: 'Umrah bags and luggage',
    intro:
      'For Umrah you move between the airport, the hotel and the Haram several times, so light, easy-rolling bags matter. Most pilgrims travel with one check-in suitcase, one hand carry bag and a small sling bag for documents.',
    keywords: ['umrah bags', 'luggage for umrah', 'hajj luggage'],
    sections: [
      {
        heading: 'The three bags',
        body: [
          'Check-in suitcase: a 24 inch medium case suits most 10–15 day trips. Choose a 28 inch large case if you are bringing back Zamzam water, dates or gifts, within your airline\'s weight allowance.',
          'Hand carry: a 20 inch cabin case for ihram, medicines, a change of clothes and anything you need on arrival.',
          'Sling bag: worn across the body, it keeps passport, visa, cards and phone in front of you in crowds.',
        ],
      },
      {
        heading: 'Packing checklist',
        body: [
          'Documents: passport, visa, tickets, hotel details, copies on your phone.',
          'Ihram and clothing: two sets of ihram, comfortable footwear, light clothes.',
          'Personal: unscented toiletries, medicines, a small towel, a reusable bottle.',
          'Leave room and weight for what you bring back, and check your airline\'s rules for Zamzam water.',
        ],
      },
    ],
    faqs: [
      { q: 'What size suitcase is best for Umrah?', a: 'A 24 inch medium case for most trips, plus a 20 inch cabin case as hand carry. A 28 inch large case if you plan to bring back a lot.' },
      { q: 'Which bag is best for documents during Umrah?', a: 'A cross-body sling bag, so your passport and phone stay in front of you. The Pivot Lock adds a combination lock.' },
    ],
    cta: { label: 'Shop luggage sets', href: '/collections/luggage-sets' },
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
