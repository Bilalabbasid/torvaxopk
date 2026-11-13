import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

// Read config from environment or fallback to detected pooler
const host = process.env.SUPABASE_DB_HOST || 'aws-0-ap-northeast-1.pooler.supabase.com';
const port = parseInt(process.env.SUPABASE_DB_PORT || '5432', 10);
const user = process.env.SUPABASE_DB_USER || 'postgres.ltvlssjubyjeoftwsgsr';
const password = process.env.SUPABASE_DB_PASSWORD || 'bE61WAIfgLgteMWR';
const database = process.env.SUPABASE_DB_NAME || 'postgres';

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

  const files = [
    'supabase/migrations/0001_init.sql',
    'supabase/migrations/0002_hardening.sql',
    'supabase/seed.sql',
  ];

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

