// Full JSON snapshot of every store table, for off-site backups and restore drills.
// Usage: npm run backup            → writes backups/<timestamp>/<table>.json
// Keep the output somewhere safe and private (it contains customer data). backups/ is git-ignored.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.startsWith('PLACEHOLDER')) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.');
  process.exit(1);
}

const TABLES = [
  'settings', 'products', 'product_variants', 'product_images', 'customers', 'coupons', 'orders',
  'order_items', 'coupon_redemptions', 'payments', 'order_events', 'inventory_movements', 'admin_users',
];

const supabase = createClient(url, key, { auth: { persistSession: false } });
const dir = join('backups', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(dir, { recursive: true });

for (const table of TABLES) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  writeFileSync(join(dir, `${table}.json`), JSON.stringify(rows, null, 2));
  console.log(`${table.padEnd(22)} ${rows.length} rows`);
}
console.log(`\nSaved to ${dir}`);
