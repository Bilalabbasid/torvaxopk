// The torvaxo.pk catalogue, matching the German shop's line-up (gr8abbasi/torvaxo, CatalogSeeder).
//
// Run with:  npm run db:catalogue
//
// Add-only and safe to run again: it creates products, colours and photos that are missing and never
// changes the price, stock or text of anything that already exists (edit those in Admin → Products).
//
// Prices are whole PKR. `price` is the regular (after launch) price, `preorder` the preorder price.
// Forward Cabin/Medium/Large and the Set of Three keep the prices already in the database. The other
// prices follow the same ratio to the German euro prices (about Rs 280 per euro after launch, about
// 72% of that on preorder), rounded to ...99, and can be changed in the back office.

import pg from 'pg';

const COLOURS = {
  black: ['Black', '#141416', 'BLK'],
  graphite: ['Graphite', '#3B3C3F', 'GRA'],
  navy: ['Midnight Navy', '#1B2748', 'NVY'],
  glacier: ['Glacier Blue', '#A9C6DE', 'GLC'],
  olive: ['Olive Green', '#7D8B4B', 'OLV'],
  lightgrey: ['Light Grey', '#C6C5C1', 'LGY'],
};

const CASE_COLOURS = ['black', 'graphite', 'navy', 'glacier', 'olive'];
// The Ember line of the Signature mark needs a dark ground.
const SIGNATURE_COLOURS = ['black', 'graphite', 'navy'];

const CASE_FEATURES = [
  'Ribbed hardshell that shrugs off knocks and scuffs',
  'Integrated TSA combination lock',
  'Detachable 360° double spinner wheels',
  'Zipped divider with mesh pocket and compression straps',
  'Two-stage aluminium telescopic handle',
];
const SIGNATURE_FEATURE = 'Signature X on the front: tone-on-tone chevrons with one thin line of Ember';
const ZIP_TAG = ['zip-tag-design.svg', 'Signature zip tag, design'];
const DETAILS = [
  ['detail-lock.jpg', 'TSA combination lock'],
  ['detail-wheels.jpg', 'Detachable spinner wheel'],
  ['detail-interior.jpg', 'Organised interior'],
];

const caseSpecs = (inches, size, weight, volume, fit) => [
  { label: 'Size', value: inches },
  { label: 'Dimensions', value: size },
  { label: 'Weight', value: weight },
  { label: 'Volume', value: volume },
  { label: 'Best for', value: fit },
  { label: 'Lock', value: 'TSA combination lock' },
  { label: 'Wheels', value: 'Detachable 360° double spinners' },
];

const CASES = {
  cabin: ['Cabin', 'CAB', 14499, 10499, caseSpecs('20 inch', '55 × 37 × 21 cm', '2.9 kg', '38 L', 'Weekends and 1–3 day trips'), 'Carry-on sized. Overhead-bin ready.',
    'The one that never leaves your side. Forward Cabin is sized for the overhead bin and built for the sprint to the gate: a ribbed hardshell, silent double spinners and a lock you never have to think about.'],
  medium: ['Medium', 'MED', 19499, 13999, caseSpecs('24 inch', '66 × 44 × 26 cm', '3.7 kg', '68 L', 'Trips of 4–7 days'), 'The week-away workhorse.',
    'Room for a full week without the bulk. Forward Medium checks in light, rolls straight and keeps everything where you packed it with a zipped divider and compression straps.'],
  large: ['Large', 'LRG', 26999, 18999, caseSpecs('28 inch', '76 × 50 × 30 cm', '4.5 kg', '102 L', 'Trips of 8 days and longer'), 'Maximum volume. Zero drama.',
    'For the long haul and the heavy packers. Forward Large swallows two weeks of gear and still glides on four detachable double spinners.'],
};

// Signature cases: the German shop charges €20 more; here Rs 5,500 more after launch, Rs 4,000 on preorder.
const SIGNATURE_EXTRA = { price: 5500, preorder: 4000 };
// Signature bags: €10 more in Germany; here Rs 2,500 more after launch, Rs 2,000 on preorder.
const BAG_SIGNATURE_EXTRA = { price: 2500, preorder: 2000 };

// [slug, name, sku, category, price, preorder, colours, tagline, description, features]   (German € in brackets)
const BAGS = [
  ['pivot-hydro', 'Pivot Hydro', 'PVH', 'slings', 8499, 5999, ['black', 'lightgrey'], 'The sling with room for your bottle.', // €29.99
    'A compact cross-body sling with a quilted side pocket that keeps a bottle upright and within reach.',
    ['Side pocket that holds a bottle', 'Top grab handle', 'Cross-body strap', 'Reflective stripe on the front']],
  ['pivot-lock', 'Pivot Lock', 'PVL', 'slings', 9999, 6999, ['black', 'lightgrey'], 'Locked across your chest.', // €34.99
    'A slim cross-body sling with a combination lock on the side and a flap over the front pocket.',
    ['Combination lock on the side', 'Flap-covered front pocket', 'Cross-body strap', 'Reflective stripe on the front']],
  ['pivot-duo', 'Pivot Duo', 'PVD', 'slings', 9999, 6999, ['black', 'lightgrey', 'navy'], 'Two tones. One strap.', // €34.99
    'A structured cross-body sling with a tan side panel that sets it apart from every other black bag.',
    ['Two-tone build with a tan side panel', 'Top grab handle', 'Cross-body strap', 'Reflective stripe on the front']],
  ['pivot-weave', 'Pivot Weave', 'PVW', 'slings', 10999, 7999, ['graphite', 'black', 'lightgrey'], 'Woven front. Tan edge.', // €39.99
    'The Duo shape with a woven-texture front panel: the dressier sling of the line.',
    ['Woven-texture front panel', 'Tan side panel', 'Top grab handle', 'Cross-body strap']],
  ['vector-daypack', 'Vector Daypack', 'VCD', 'backpacks', 10999, 7999, ['black', 'lightgrey'], 'The everyday pack.', // €39.99
    'A clean, rounded daypack with a front zip pocket: the one you grab without thinking.',
    ['Front zip pocket', 'Padded shoulder straps', 'Top handle', 'Reflective stripe on the front']],
  ['vector-flap', 'Vector Flap', 'VCF', 'backpacks', 12499, 8999, ['lightgrey', 'black'], 'Flap down. Ready to go.', // €44.99
    'A flap-top backpack closed by two snap buttons, with a pocket on each side and a vertical zip on the front.',
    ['Flap closure with two snap buttons', 'Two side pockets', 'Vertical zip pocket on the front', 'Top handle']],
  ['vector-utility', 'Vector Utility', 'VCU', 'backpacks', 13999, 9999, ['lightgrey', 'black'], 'Buckled down for the long day.', // €49.99
    'The most pocketed pack of the line, with two buckle straps across the front.',
    ['Two buckle straps on the front', 'Front and side pockets', 'Padded shoulder straps', 'Top handle']],
  ['relay-travel', 'Relay Travel Pack', 'RLT', 'work', 16999, 11999, ['black', 'lightgrey'], 'Packs like a case. Carries like a pack.', // €59.99
    'A boxy travel and laptop pack with side compression straps, built to go under the seat or over the shoulder.',
    ['Boxy, case-like shape', 'Side compression straps', 'Front zip pockets', 'Top handle']],
  ['haul-duffel', 'Haul Duffel', 'HAL', 'duffels', 9999, 6999, ['black', 'lightgrey'], 'Throw it in. Carry it out.', // €34.99
    'A soft duffel for the gym, the weekend, or everything that would not fit in the case.',
    ['Wide twin-zip opening', 'Front zip pocket', 'Carry handles with wrap', 'Shoulder strap']],
];

// More 3-piece sets, each its own design, in Black: Rs 15,000 above the Forward Set of Three
// (Rs 51,000 after launch, Rs 35,000 on preorder).
const SET_EXTRA = 15000;
const SET_FEATURES = ['Integrated TSA combination lock', '360° double spinner wheels with Ember rims', 'Aluminium telescopic handle', 'Brushed-metal name plate'];
// [slug, name, sku, tagline, description, design feature]
const SETS = [
  ['prism-set', 'Prism Set of Three', 'PRS', 'Cut like a gem. Built like a case.',
    'A faceted hardshell that catches the light from every angle, crossed by a brushed-metal band. Cabin, Medium and Large in one set.',
    'Faceted hardshell with a brushed-metal band'],
  ['aegis-set', 'Aegis Set of Three', 'AEG', 'Armoured at every corner.',
    'Raised corner guards, a carbon-textured shell and the Torvaxo chevrons in Ember on a metal plate. The set built for rough handling.',
    'Raised corner guards and carbon-textured shell'],
  ['onyx-set', 'Onyx Set of Three', 'ONX', 'A honeycomb that hides the scuffs.',
    'A fine honeycomb texture over the whole shell keeps scratches out of sight, finished with a brushed-metal name band.',
    'Honeycomb-textured hardshell'],
  ['meridian-set', 'Meridian Set of Three', 'MRD', 'Two finishes. One clean line.',
    'Textured above, smooth below, split by a diagonal line of Ember. The most graphic set of the range.',
    'Two-tone shell split by a diagonal Ember line'],
  ['stratos-set', 'Stratos Set of Three', 'STR', 'A sharp fold down the front.',
    'A smooth matte shell with a diagonal crease down the front and a full-width brushed-metal band.',
    'Smooth matte shell with a diagonal crease'],
];

function catalogue() {
  const products = [];
  let pos = 0;

  for (const [key, [label, sku, price, preorder, specs, tagline, description]] of Object.entries(CASES)) {
    products.push({
      slug: `forward-${key}`, name: `Forward ${label}`, sku: `FWD-${sku}`, series: 'Forward', category: 'luggage', size_label: label,
      tagline, description, specs, features: CASE_FEATURES, price, preorder, colours: CASE_COLOURS, sort: pos++,
      photos: (c, name) => [
        [`forward-${key}-${c}-scale.jpg`, `Forward ${label} in ${name}, shown to scale`, true],
        [`forward-${key}-${c}.jpg`, `Forward ${label} in ${name}`, false],
        [`forward-set-${c}.jpg`, `The Forward series in ${name}`, false],
      ],
      shared: DETAILS,
    });
  }

  products.push({
    slug: 'forward-set-of-three', name: 'Forward Set of Three', sku: 'FWD-SET', series: 'Forward', category: 'luggage', size_label: 'Set of 3', is_set: true,
    tagline: 'Cabin, Medium and Large. One matched set.',
    description: 'Every trip covered. The complete Forward line in one colour, nesting inside each other for storage and priced well below buying the three pieces separately.',
    specs: [
      { label: 'Includes', value: 'Cabin (20 inch), Medium (24 inch) and Large (28 inch)' },
      { label: 'Total volume', value: '208 L' },
      { label: 'Storage', value: 'Nests into the Large case' },
      { label: 'Lock', value: 'TSA combination lock on each case' },
      { label: 'Wheels', value: 'Detachable 360° double spinners' },
    ],
    features: CASE_FEATURES, price: 51000, preorder: 35000, compare_at: 60997, colours: CASE_COLOURS, sort: pos++,
    photos: (c, name) => [[`forward-set-${c}.jpg`, `Forward Set of Three in ${name}`, true]],
    shared: DETAILS,
  });

  for (const [slug, name, sku, tagline, description, design] of SETS) {
    products.push({
      slug, name, sku, series: name.replace(' Set of Three', ''), category: 'luggage', size_label: 'Set of 3', is_set: true, tagline, description,
      specs: [
        { label: 'Includes', value: 'Cabin (20 inch), Medium (24 inch) and Large (28 inch)' },
        { label: 'Lock', value: 'TSA combination lock on each case' },
        { label: 'Wheels', value: '360° double spinners' },
      ],
      features: [design, ...SET_FEATURES], price: 51000 + SET_EXTRA, preorder: 35000 + SET_EXTRA, colours: ['black'], sort: pos++,
      photos: (c, colour) => [[`${slug}-${c}.jpg`, `${name} in ${colour}`, true]],
    });
  }

  for (const [key, [label, sku, price, preorder, specs]] of Object.entries(CASES)) {
    products.push({
      slug: `forward-${key}-signature`, name: `Forward ${label} Signature`, sku: `FWS-${sku}`, series: 'Forward Signature', category: 'luggage',
      edition: 'signature', size_label: label, tagline: 'The X on the outside.',
      description: `Forward ${label}, marked. The Torvaxo X sits on the front shell: chevrons in the colour of the case, traced by a single thin line of Ember. Same lock, same replaceable wheels, unmistakably yours on the carousel.`,
      specs, features: [SIGNATURE_FEATURE, ...CASE_FEATURES], price: price + SIGNATURE_EXTRA.price, preorder: preorder + SIGNATURE_EXTRA.preorder,
      colours: SIGNATURE_COLOURS, sort: pos++,
      photos: (c, name) => [
        [`forward-signature-${key}-${c}-scale.jpg`, `Forward ${label} Signature in ${name}, shown to scale`, true],
        [`forward-signature-${key}-${c}.jpg`, `Forward ${label} Signature in ${name}`, false],
      ],
      shared: [...DETAILS, ZIP_TAG],
    });
  }

  for (const [slug, name, sku, category, price, preorder, colours, tagline, description, features] of BAGS) {
    products.push({
      slug, name, sku, series: name, category, size_label: 'Classic', tagline, description, features, price, preorder, colours, sort: pos++,
      photos: (c, colour) => [[`${slug}-${c}.jpg`, `${name} in ${colour}`, true]],
    });
    products.push({
      slug: `${slug}-signature`, name: `${name} Signature`, sku: `${sku}-SIG`, series: name, category, edition: 'signature', size_label: 'Signature',
      tagline: 'The X on the outside.',
      description: `${description} The Signature edition carries the Torvaxo X on the front: tone-on-tone chevrons, traced by a single thin line of Ember.`,
      features: [SIGNATURE_FEATURE, ...features.filter((f) => !f.includes('Reflective'))],
      price: price + BAG_SIGNATURE_EXTRA.price, preorder: preorder + BAG_SIGNATURE_EXTRA.preorder, colours, sort: pos++,
      photos: (c, colour) => [[`${slug}-signature-${c}.jpg`, `${name} Signature in ${colour}`, true]],
      shared: [ZIP_TAG],
    });
  }

  const wheel = () => [['spinner-wheel-black.jpg', 'Forward spinner wheel', true]];
  products.push({
    slug: 'forward-spinner-wheel', name: 'Forward Spinner Wheel', sku: 'PRT-WHL-1', series: 'Forward Wheels', category: 'parts', size_label: 'Single',
    tagline: 'One wheel. A few seconds.',
    description: 'A single replacement double spinner for Forward cases. Take off the worn wheel, fit the new one, keep travelling.',
    features: ['360° double spinner', 'Detachable: no workshop, no waiting', 'For Forward cases'],
    price: 1999, preorder: 1499, colours: ['black'], sort: pos++, photos: wheel, shared: [['detail-wheels.jpg', 'Detachable spinner wheel']], // €6.99
  });
  products.push({
    slug: 'forward-spinner-wheels-set-of-4', name: 'Forward Spinner Wheels, Set of 4', sku: 'PRT-WHL-4', series: 'Forward Wheels', category: 'parts',
    size_label: 'Set of 4', tagline: 'A fresh set for the whole case.',
    description: 'Four replacement double spinners: a complete new set of wheels for one Forward case.',
    features: ['Four 360° double spinners', 'Detachable: no workshop, no waiting', 'For Forward cases'],
    price: 5499, preorder: 3999, compare_at: 7996, colours: ['black'], sort: pos++, photos: wheel, // €19.99 (4 singles: Rs 7,996)
    shared: [['detail-wheels.jpg', 'Detachable spinner wheel']],
  });

  return products;
}

// Starting stock for new colours, like the German seeder: 12 to 31, fixed per SKU.
function stockFor(sku) {
  let h = 0;
  for (const ch of sku) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 12 + (h % 20);
}

async function main() {
  const { DATABASE_URL, SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD } = process.env;
  if (!DATABASE_URL && !(SUPABASE_DB_HOST && SUPABASE_DB_USER && SUPABASE_DB_PASSWORD)) {
    console.error('Set SUPABASE_DB_HOST, SUPABASE_DB_USER and SUPABASE_DB_PASSWORD in .env.local first.');
    process.exit(1);
  }
  const client = new pg.Client(
    DATABASE_URL
      ? { connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } }
      : {
          host: SUPABASE_DB_HOST,
          port: Number(SUPABASE_DB_PORT || 5432),
          user: SUPABASE_DB_USER,
          password: SUPABASE_DB_PASSWORD,
          database: 'postgres',
          ssl: { rejectUnauthorized: false },
        },
  );
  await client.connect();
  const added = { products: 0, colours: 0, photos: 0 };
  try {
    await client.query('begin');
    for (const p of catalogue()) {
      let row = (await client.query('select id from products where slug = $1', [p.slug])).rows[0];
      if (!row) {
        row = (
          await client.query(
            `insert into products (slug, name, series, category, edition, size_label, tagline, description, specs, features, status, is_set, sort_order)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, $12) returning id`,
            [p.slug, p.name, p.series, p.category, p.edition ?? 'standard', p.size_label, p.tagline, p.description,
              JSON.stringify(p.specs ?? []), JSON.stringify(p.features), Boolean(p.is_set), p.sort],
          )
        ).rows[0];
        added.products++;
      } else {
        // Existing products only get their line details; text, prices and stock are left alone.
        await client.query('update products set series = $2, category = $3, edition = $4, sort_order = $5 where id = $1', [
          row.id, p.series, p.category, p.edition ?? 'standard', p.sort,
        ]);
      }

      for (const [order, key] of p.colours.entries()) {
        const [colour, hex, code] = COLOURS[key];
        const sku = `TX-${p.sku}-${code}`;
        let variant = (await client.query('select id from product_variants where sku = $1', [sku])).rows[0];
        if (!variant) {
          variant = (
            await client.query(
              `insert into product_variants (product_id, sku, color_name, color_hex, price, preorder_price, compare_at, stock, sort_order)
               values ($1, $2, $3, $4, $5, $6, $7, 0, $8) returning id`,
              [row.id, sku, colour, hex, p.price, p.preorder, p.compare_at ?? null, order],
            )
          ).rows[0];
          await client.query(`select adjust_stock($1, $2, 'initial', null, 'Catalogue sync', 'seed')`, [variant.id, stockFor(sku)]);
          added.colours++;
        }
        for (const [i, [file, alt, isListing]] of p.photos(key, colour).entries()) {
          const url = `/images/products/${file}`;
          const exists = await client.query('select 1 from product_images where product_id = $1 and variant_id = $2 and url = $3', [row.id, variant.id, url]);
          if (!exists.rowCount) {
            await client.query(
              'insert into product_images (product_id, variant_id, url, alt, is_listing, sort_order) values ($1, $2, $3, $4, $5, $6)',
              [row.id, variant.id, url, alt, isListing, isListing ? 0 : order * 10 + i + 1],
            );
            added.photos++;
          }
        }
      }

      for (const [i, [file, alt]] of (p.shared ?? []).entries()) {
        const url = `/images/products/${file}`;
        const exists = await client.query('select 1 from product_images where product_id = $1 and variant_id is null and url = $2', [row.id, url]);
        if (!exists.rowCount) {
          await client.query('insert into product_images (product_id, url, alt, sort_order) values ($1, $2, $3, $4)', [row.id, url, alt, 100 + i]);
          added.photos++;
        }
      }
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
  console.log(`Catalogue synced: ${added.products} products, ${added.colours} colours and ${added.photos} photos added.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
