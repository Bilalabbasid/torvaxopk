# torvaxo.pk

The Pakistan store for Torvaxo's Forward luggage series: a storefront with preorders, checkout and a full back office. Built with Next.js 16, Supabase and Tailwind 4, and priced in PKR.

The German shop (Laravel/Vue) is the design and catalogue reference. Its product photos are copied into `public/images/`.

## What it does

- **Catalogue:** Forward Cabin, Medium, Large and Set of Three, each in Black, Graphite and Glacier Blue (12 variants).
- **Preorder mode** (the default):
  - Customers see preorder prices. The Set of Three is **Rs 35,000** instead of **Rs 51,000**.
  - They pay a **deposit** (Rs 5,000 by default) online by Safepay card, JazzCash or Easypaisa.
  - From the admin you email each preorder a secure link to pay the **balance**, online or cash on delivery.
- **Live mode** (one click in Admin → Settings):
  - Regular prices apply, paid in full online or by cash on delivery.
  - Every paid order earns a personal **12% site-wide code, valid for 1 year**. The code is tied to the buyer's email, shown on the order page and emailed.
  - Preorder buyers do not get the code; the preorder price is their benefit.
- **Payments:** Safepay, JazzCash, Easypaisa and cash on delivery. With `PAYMENTS_MODE=mock` (the default), every online payment goes to a built-in approve/decline test screen, so the whole flow works before you have merchant accounts.
- **Admin** (`/admin`):
  - Dashboard: takings, preorders, outstanding balances, low stock and a launch checklist.
  - Orders: search and filters, fulfilment and tracking, recording cash received, requesting balances, cancelling with stock returned, refunds, and a timeline.
  - Products: details, colours, regular/preorder/compare-at prices and photo uploads.
  - Inventory: stock adjustments with an audit log.
  - Also: customers, discount codes, a payments log with raw gateway data, and settings.

## Setup

1. **Install:** `npm install`
2. **Database.** In the Supabase dashboard, open SQL Editor and run these files in order:
   - `supabase/migrations/0001_init.sql` (tables, functions, storage bucket)
   - `supabase/migrations/0002_hardening.sql` (concurrency fixes, indexes, dashboard figures)
   - `supabase/seed.sql` (catalogue and default settings)
3. **Environment.** Edit `.env.local`; every option is documented in `.env.example`. At minimum you need:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`: the **secret** key, from Project Settings → API Keys. It is server-only.
4. **Create an admin:**

   ```bash
   npm run admin:create -- you@example.com "a-long-password"
   ```

5. **Run:** `npm run dev`, then open http://localhost:3000. The admin is at http://localhost:3000/admin.

## Placeholders to replace before launch

| What | Where |
|---|---|
| Single-case PKR prices (Cabin 12,999/8,999, Medium 17,999/12,499, Large 25,499/17,499) | Admin → Products |
| Deposit amount, delivery fee and free-delivery threshold | Admin → Settings |
| Store address, phone and WhatsApp | Admin → Settings |
| Safepay, JazzCash and Easypaisa merchant credentials, then `PAYMENTS_MODE=live` | `.env.local` / hosting env |
| Email sending (Resend key and sender domain) | `.env.local` |
| Terms, privacy, returns and warranty text (needs legal review) | `src/content/pages.ts` |
| Product dimensions and weights (copied from the German shop) | Admin → Products |

### Gateway URLs to register in each merchant portal

- **Safepay webhook:** `https://torvaxo.pk/api/payments/safepay/webhook`
- **JazzCash return URL:** `https://torvaxo.pk/api/payments/jazzcash/return`
- **Easypaisa postback:** `https://torvaxo.pk/api/payments/easypaisa/return`
- **Easypaisa IPN:** `https://torvaxo.pk/api/payments/easypaisa/webhook`

The gateway adapters are in `src/lib/payments/`. Safepay follows its official Node SDK (v3 checkout). JazzCash (Page Redirection v1.1) and Easypaisa (Easypay plugin) follow their integration guides, because their developer portals require a login. Test each one in sandbox before going live.

## How it works

- `src/lib/pricing.ts`: pure pricing maths (preorder/live, deposit, coupon, delivery), unit tested.
- `src/lib/orders.ts`:
  - Prices the cart from the database. Browser prices are never trusted.
  - Places orders through the `create_order` SQL function, which reserves stock atomically.
  - Settles payments through `settle_payment`, which is idempotent.
  - Issues launch rewards once an order is paid.
- `src/lib/payments/`: one adapter per gateway, plus a mock. Orders become paid only after a verified callback.
- Online orders left unpaid are cancelled after 2 hours and their stock is released. Use "Clear abandoned" in Admin → Orders; it also runs on each checkout.
- The database is accessed only from the server with the secret key. Row Level Security is on, with no public policies.

## Production safeguards

| Concern | How it is handled |
|---|---|
| **Overselling** | Stock is reserved inside one database transaction (`create_order`). Each stock update takes a row lock, and a `stock >= 0` constraint aborts the whole order if the last unit is gone. Rows are locked in a fixed order, so simultaneous checkouts can't deadlock. Coupon usage limits are enforced under a lock in the same transaction. |
| **Payments** | An order is marked paid only by `settle_payment`, after the server has verified the gateway's response: Safepay through its reporter API and HMAC-SHA512 webhooks; JazzCash through `pp_SecureHash` plus its inquiry API; Easypaisa through a status lookup, because its return is unsigned. Amounts are checked against the order. Settlement is idempotent, so repeated callbacks are harmless. |
| **Security** | Row Level Security is on for every table with no public policies. The database is reached only from the server with the secret key. SQL functions are revoked from `anon` and `authenticated`. Every admin page, action and export checks the `admin_users` table. Each customer can have at most 3 unpaid online orders open per hour, which stops anyone tying up stock. Card details never touch this server. |
| **Performance** | Indexes cover order, payment, coupon and stock lookups (`0002_hardening.sql`). Dashboard totals are computed in SQL. Admin lists are paginated. Catalogue and settings reads are cached for 60 seconds and cleared immediately when the admin changes something or an order moves stock; checkout always re-reads live stock and prices. Supabase's HTTP API pools database connections itself, so the app opens none directly. |
| **SEO** | Product, shop and home pages are server-rendered with titles, descriptions, canonical URLs, Open Graph tags and Product structured data (PKR price and availability). `/sitemap.xml` and `/robots.txt` are generated. Checkout, admin and order pages are excluded from indexing. |
| **Backups** | See below. |

## Backups and recovery

1. **Supabase backups.** Use the Pro plan or higher for daily backups, and turn on **Point-in-Time Recovery** (Database → Backups) so you can restore to any minute. The free plan has no downloadable backups.
2. **Off-site copy.** `npm run backup` writes every table as JSON to `backups/<timestamp>/`. Run it daily, for example from a scheduled job, and store the output somewhere private: it contains customer data. `backups/` is git-ignored.
3. **Spreadsheets.** Admin → Settings → Data exports (or Admin → Orders → Export CSV) downloads orders, customers, payments and coupons as CSV.
4. **Restore drill.** Once a quarter, restore a backup into a scratch Supabase project, run the app against it, and check that recent orders are there.
5. **Payment providers are a second record.** Safepay, JazzCash and Easypaisa keep their own transaction history; each `payments.reference` matches the gateway's order reference.

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run admin:create` · `npm run backup`
