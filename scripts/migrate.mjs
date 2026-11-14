import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

// Connection details come from the environment only (.env.local via `npm run db:migrate`).
const host = process.env.SUPABASE_DB_HOST;
const port = parseInt(process.env.SUPABASE_DB_PORT || '5432', 10);
const user = process.env.SUPABASE_DB_USER;
const password = process.env.SUPABASE_DB_PASSWORD;
const database = process.env.SUPABASE_DB_NAME || 'postgres';

if (!host || !user || !password) {
  console.error('Set SUPABASE_DB_HOST, SUPABASE_DB_USER and SUPABASE_DB_PASSWORD in .env.local first.');
  process.exit(1);
}

console.log(`Connecting to ${host}:${port} as ${user}...`);

const client = new Client({
  host,
  port,
  user,
  password,
  database,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected successfully to Supabase Postgres!');

  // With file arguments, run only those (e.g. a new migration on an existing database):
  //   node --env-file=.env.local scripts/migrate.mjs supabase/migrations/0003_catalogue_lines.sql
  const files = process.argv.slice(2).length
    ? process.argv.slice(2)
    : ['supabase/migrations/0001_init.sql', 'supabase/migrations/0002_hardening.sql', 'supabase/migrations/0003_catalogue_lines.sql', 'supabase/seed.sql'];

  for (const file of files) {
    console.log(`\nExecuting ${file}...`);
    const sql = fs.readFileSync(path.resolve(file), 'utf8');
    await client.query(sql);
    console.log(`✓ Completed ${file}`);
  }

  console.log('\nAll migrations and seeds applied successfully!');
  await client.end();
}

run().catch(async (err) => {
  console.error('\nMigration failed:', err);
  try {
    await client.end();
  } catch {}
  process.exit(1);
});

