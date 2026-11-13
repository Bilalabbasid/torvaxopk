import pg from 'pg';

const { Client } = pg;
const client = new Client({
  host: process.env.SUPABASE_DB_HOST,
  port: parseInt(process.env.SUPABASE_DB_PORT || '5432', 10),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connected to DB.');

  // Update individual products: Cabin (+1500), Medium (+1500), Large (+1500)
  // Base preorder: Cabin 8999 -> 10499, Medium 12499 -> 13999, Large 17499 -> 18999
  // Base regular: Cabin 12999 -> 14499, Medium 17999 -> 19499, Large 25499 -> 26999
  await client.query(`
    UPDATE product_variants
    SET 
      price = price + 1500,
      preorder_price = preorder_price + 1500
    WHERE product_id IN (
      SELECT id FROM products WHERE slug IN ('forward-cabin', 'forward-medium', 'forward-large')
    );
  `);

  // Set of 3 is 35k (35000) preorder, and update compare_at to new sum of regular prices (14499+19499+26999 = 60997)
  await client.query(`
    UPDATE product_variants
    SET 
      preorder_price = 35000,
      compare_at = 60997
    WHERE product_id IN (
      SELECT id FROM products WHERE slug = 'forward-set-of-three'
    );
  `);

  const res = await client.query(`
    SELECT p.name, p.slug, v.sku, v.color_name, v.price, v.preorder_price, v.compare_at 
    FROM product_variants v 
    JOIN products p ON v.product_id = p.id 
    ORDER BY p.slug, v.sku;
  `);

  console.table(res.rows);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

