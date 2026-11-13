-- torvaxo.pk — initial schema
-- All money columns are whole Pakistani rupees (PKR, integer).
-- The app talks to the database only from the server with the service-role key.
-- RLS is enabled on every table with no public policies, so the anon key can read nothing.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Settings (single row)
-- ---------------------------------------------------------------------------
create table public.settings (
  id                    int primary key default 1 check (id = 1),
  sale_mode             text not null default 'preorder' check (sale_mode in ('preorder', 'live')),
  launch_date           timestamptz,
  deposit_amount        int not null default 5000 check (deposit_amount >= 0),
  shipping_flat         int not null default 500 check (shipping_flat >= 0),
  shipping_free_from    int not null default 15000 check (shipping_free_from >= 0),
  launch_coupon_percent int not null default 12 check (launch_coupon_percent between 1 and 100),
  launch_coupon_days    int not null default 365 check (launch_coupon_days > 0),
  payment_methods       jsonb not null default '{"safepay": true, "jazzcash": true, "easypaisa": true, "cod": true}',
  store_name            text not null default 'Torvaxo Pakistan',
  store_email           text not null default 'hello@torvaxo.pk',
  store_phone           text not null default '+92 300 0000000',
  store_whatsapp        text not null default '+92 300 0000000',
  store_address         text not null default 'PLACEHOLDER — Street, City, Pakistan',
  delivery_time         text not null default '3–5 working days',
  announcement          text,
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  size_label  text not null default '',
  tagline     text not null default '',
  description text not null default '',
  specs       jsonb not null default '[]',
  features    jsonb not null default '[]',
  status      text not null default 'draft' check (status in ('active', 'draft', 'archived')),
  is_set      boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.product_variants (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references public.products (id) on delete cascade,
  sku                 text not null unique,
  color_name          text not null,
  color_hex           text not null default '#141416',
  price               int not null check (price >= 0),
  preorder_price      int check (preorder_price >= 0),
  compare_at          int check (compare_at >= 0),
  stock               int not null default 0 check (stock >= 0),
  low_stock_threshold int not null default 5,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now()
);
create index on public.product_variants (product_id);

create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  url        text not null,
  alt        text not null default '',
  is_listing boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.product_images (product_id);

-- ---------------------------------------------------------------------------
-- Customers, coupons, orders
-- ---------------------------------------------------------------------------
create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  name       text not null default '',
  phone      text not null default '',
  city       text not null default '',
  created_at timestamptz not null default now()
);
create unique index customers_email_key on public.customers (lower(email));

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  number           text not null unique,
  customer_id      uuid references public.customers (id) on delete set null,
  email            text not null,
  name             text not null,
  phone            text not null,
  address_line1    text not null,
  address_line2    text not null default '',
  city             text not null,
  province         text not null,
  postal_code      text not null default '',
  customer_note    text not null default '',
  kind             text not null check (kind in ('preorder', 'standard')),
  sale_mode        text not null check (sale_mode in ('preorder', 'live')),
  status           text not null default 'pending'
                   check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status   text not null default 'unpaid'
                   check (payment_status in ('unpaid', 'deposit_paid', 'paid', 'refunded')),
  payment_method   text not null check (payment_method in ('safepay', 'jazzcash', 'easypaisa', 'cod')),
  subtotal         int not null check (subtotal >= 0),
  discount         int not null default 0 check (discount >= 0),
  shipping         int not null default 0 check (shipping >= 0),
  total            int not null check (total >= 0),
  deposit_amount   int not null default 0 check (deposit_amount >= 0),
  amount_paid      int not null default 0 check (amount_paid >= 0),
  balance_due      int generated always as (greatest(total - amount_paid, 0)) stored,
  balance_token    text unique,
  balance_requested_at timestamptz,
  balance_method   text check (balance_method in ('safepay', 'jazzcash', 'easypaisa', 'cod')),
  coupon_id        uuid,
  coupon_code      text,
  carrier          text not null default '',
  tracking_number  text not null default '',
  internal_note    text not null default '',
  stock_released   boolean not null default false,
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.orders (created_at desc);
create index on public.orders (lower(email));
create index on public.orders (status);

create table public.coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text not null,
  percent         int not null check (percent between 1 and 100),
  email           text,                       -- when set, only this customer can redeem
  source          text not null default 'manual' check (source in ('manual', 'launch_reward')),
  starts_at       timestamptz not null default now(),
  expires_at      timestamptz,
  max_uses        int check (max_uses > 0),   -- null = unlimited
  uses            int not null default 0,
  active          boolean not null default true,
  issued_order_id uuid references public.orders (id) on delete set null,
  note            text not null default '',
  created_at      timestamptz not null default now()
);
create unique index coupons_code_key on public.coupons (upper(code));
create unique index coupons_issued_order_key on public.coupons (issued_order_id) where issued_order_id is not null;

alter table public.orders
  add constraint orders_coupon_fk foreign key (coupon_id) references public.coupons (id) on delete set null;

create table public.coupon_redemptions (
  id         uuid primary key default gen_random_uuid(),
  coupon_id  uuid not null references public.coupons (id) on delete cascade,
  order_id   uuid not null references public.orders (id) on delete cascade,
  amount     int not null,
  created_at timestamptz not null default now(),
  unique (order_id)
);

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  variant_id    uuid references public.product_variants (id) on delete set null,
  product_name  text not null,
  variant_label text not null,
  sku           text not null,
  image_url     text not null default '',
  unit_price    int not null,
  regular_price int not null,
  quantity      int not null check (quantity > 0),
  line_total    int not null
);
create index on public.order_items (order_id);

create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  reference    text not null unique,          -- short id sent to the gateway (max 20 chars)
  provider     text not null check (provider in ('safepay', 'jazzcash', 'easypaisa', 'cod', 'mock', 'manual')),
  purpose      text not null check (purpose in ('deposit', 'balance', 'full')),
  amount       int not null check (amount >= 0),
  status       text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  provider_ref text,
  raw          jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.payments (order_id);

create table public.order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  type       text not null,
  message    text not null,
  actor      text not null default 'system',
  created_at timestamptz not null default now()
);
create index on public.order_events (order_id, created_at);

create table public.inventory_movements (
  id         uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  delta      int not null,
  reason     text not null check (reason in ('initial', 'order', 'order_released', 'restock', 'correction', 'damaged', 'return')),
  order_id   uuid references public.orders (id) on delete set null,
  note       text not null default '',
  actor      text not null default 'system',
  stock_after int not null,
  created_at timestamptz not null default now()
);
create index on public.inventory_movements (variant_id, created_at desc);

create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row level security: on, with no policies (server uses the service-role key)
-- ---------------------------------------------------------------------------
alter table public.settings            enable row level security;
alter table public.products            enable row level security;
alter table public.product_variants    enable row level security;
alter table public.product_images      enable row level security;
alter table public.customers           enable row level security;
alter table public.orders              enable row level security;
alter table public.coupons             enable row level security;
alter table public.coupon_redemptions  enable row level security;
alter table public.order_items         enable row level security;
alter table public.payments            enable row level security;
alter table public.order_events        enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.admin_users         enable row level security;

-- ---------------------------------------------------------------------------
-- Functions (called through supabase.rpc from the server)
-- ---------------------------------------------------------------------------

-- Adjust stock with an audit row. Raises if stock would go negative.
create or replace function public.adjust_stock(
  p_variant uuid, p_delta int, p_reason text, p_order uuid default null, p_note text default '', p_actor text default 'system'
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_stock int;
begin
  update product_variants set stock = stock + p_delta where id = p_variant returning stock into v_stock;
  if not found then
    raise exception 'VARIANT_NOT_FOUND';
  end if;
  if v_stock < 0 then
    raise exception 'INSUFFICIENT_STOCK:%', (select sku from product_variants where id = p_variant);
  end if;
  insert into inventory_movements (variant_id, delta, reason, order_id, note, actor, stock_after)
  values (p_variant, p_delta, p_reason, p_order, coalesce(p_note, ''), coalesce(p_actor, 'system'), v_stock);
  return v_stock;
end $$;

-- Create an order, its items and its first payment in one transaction, reserving stock.
-- p_order: order columns; p_items: [{variant_id, product_name, variant_label, sku, image_url, unit_price, regular_price, quantity}]
-- p_payment: {reference, provider, purpose, amount} or null (cash on delivery for the full amount)
create or replace function public.create_order(p_order jsonb, p_items jsonb, p_payment jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
  v_order uuid;
  v_item jsonb;
  v_payment uuid;
  v_coupon uuid := nullif(p_order->>'coupon_id', '')::uuid;
begin
  insert into customers (email, name, phone, city)
  values (lower(p_order->>'email'), p_order->>'name', p_order->>'phone', p_order->>'city')
  on conflict (lower(email)) do update
    set name = excluded.name, phone = excluded.phone, city = excluded.city
  returning id into v_customer;

  insert into orders (
    number, customer_id, email, name, phone, address_line1, address_line2, city, province, postal_code,
    customer_note, kind, sale_mode, status, payment_status, payment_method, subtotal, discount, shipping, total,
    deposit_amount, coupon_id, coupon_code, balance_token
  ) values (
    p_order->>'number', v_customer, lower(p_order->>'email'), p_order->>'name', p_order->>'phone',
    p_order->>'address_line1', coalesce(p_order->>'address_line2', ''), p_order->>'city', p_order->>'province',
    coalesce(p_order->>'postal_code', ''), coalesce(p_order->>'customer_note', ''),
    p_order->>'kind', p_order->>'sale_mode', p_order->>'status', 'unpaid', p_order->>'payment_method',
    (p_order->>'subtotal')::int, (p_order->>'discount')::int, (p_order->>'shipping')::int, (p_order->>'total')::int,
    coalesce((p_order->>'deposit_amount')::int, 0), v_coupon, nullif(p_order->>'coupon_code', ''),
    nullif(p_order->>'balance_token', '')
  ) returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into order_items (order_id, variant_id, product_name, variant_label, sku, image_url, unit_price, regular_price, quantity, line_total)
    values (
      v_order, (v_item->>'variant_id')::uuid, v_item->>'product_name', v_item->>'variant_label', v_item->>'sku',
      coalesce(v_item->>'image_url', ''), (v_item->>'unit_price')::int, (v_item->>'regular_price')::int,
      (v_item->>'quantity')::int, (v_item->>'unit_price')::int * (v_item->>'quantity')::int
    );
    perform adjust_stock((v_item->>'variant_id')::uuid, -((v_item->>'quantity')::int), 'order', v_order, '', 'checkout');
  end loop;

  if v_coupon is not null then
    update coupons set uses = uses + 1 where id = v_coupon;
    insert into coupon_redemptions (coupon_id, order_id, amount) values (v_coupon, v_order, (p_order->>'discount')::int);
  end if;

  if p_payment is not null then
    insert into payments (order_id, reference, provider, purpose, amount)
    values (v_order, p_payment->>'reference', p_payment->>'provider', p_payment->>'purpose', (p_payment->>'amount')::int)
    returning id into v_payment;
  end if;

  insert into order_events (order_id, type, message, actor)
  values (v_order, 'created', 'Order placed (' || (p_order->>'kind') || ', ' || (p_order->>'payment_method') || ')', 'customer');

  return jsonb_build_object('order_id', v_order, 'payment_id', v_payment);
end $$;

-- Put an order's stock back and undo its coupon use (cancelled or failed orders). Idempotent.
create or replace function public.release_order(p_order uuid, p_reason text, p_actor text default 'system')
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_row record;
  v_released boolean;
begin
  select stock_released into v_released from orders where id = p_order for update;
  if v_released is null or v_released then
    return;
  end if;
  for v_row in select variant_id, quantity from order_items where order_id = p_order and variant_id is not null loop
    perform adjust_stock(v_row.variant_id, v_row.quantity, 'order_released', p_order, p_reason, p_actor);
  end loop;
  update coupons c set uses = greatest(c.uses - 1, 0)
    from coupon_redemptions r where r.order_id = p_order and r.coupon_id = c.id;
  delete from coupon_redemptions where order_id = p_order;
  update orders set stock_released = true, status = 'cancelled', updated_at = now() where id = p_order;
  insert into order_events (order_id, type, message, actor) values (p_order, 'cancelled', p_reason, p_actor);
end $$;

-- Settle a payment (from a verified gateway callback, or an admin marking cash received). Idempotent.
-- Returns {order_id, status, changed, order_payment_status}.
create or replace function public.settle_payment(
  p_payment uuid, p_status text, p_provider_ref text default null, p_raw jsonb default null, p_actor text default 'gateway'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_pay payments%rowtype;
  v_order orders%rowtype;
  v_paid int;
begin
  if p_status not in ('paid', 'failed', 'cancelled') then
    raise exception 'BAD_STATUS';
  end if;

  select * into v_pay from payments where id = p_payment for update;
  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  select * into v_order from orders where id = v_pay.order_id for update;

  if v_pay.status <> 'pending' then
    return jsonb_build_object('order_id', v_pay.order_id, 'status', v_pay.status, 'changed', false,
                              'order_payment_status', v_order.payment_status);
  end if;

  update payments set status = p_status, provider_ref = coalesce(p_provider_ref, provider_ref),
         raw = coalesce(p_raw, raw), updated_at = now()
   where id = p_payment;

  if p_status = 'paid' then
    v_paid := v_order.amount_paid + v_pay.amount;
    update orders set
      amount_paid = v_paid,
      payment_status = case when v_paid >= total then 'paid' when v_paid > 0 then 'deposit_paid' else payment_status end,
      status = case when status = 'pending' then 'confirmed' else status end,
      paid_at = case when v_paid >= total then now() else paid_at end,
      updated_at = now()
    where id = v_order.id
    returning * into v_order;

    insert into order_events (order_id, type, message, actor)
    values (v_order.id, 'payment', initcap(v_pay.purpose) || ' of PKR ' || v_pay.amount || ' received via ' || v_pay.provider, p_actor);
  else
    insert into order_events (order_id, type, message, actor)
    values (v_order.id, 'payment_failed', initcap(v_pay.purpose) || ' payment via ' || v_pay.provider || ' ' || p_status, p_actor);
    -- The first payment failed: cancel the order and release its stock so the customer can try again.
    if v_pay.purpose in ('deposit', 'full') and v_order.amount_paid = 0 and v_order.status = 'pending' then
      perform release_order(v_order.id, 'Payment ' || p_status, p_actor);
    end if;
  end if;

  select * into v_order from orders where id = v_pay.order_id;
  return jsonb_build_object('order_id', v_order.id, 'status', p_status, 'changed', true,
                            'order_payment_status', v_order.payment_status);
end $$;

-- Lock these functions down to the service role.
revoke all on function public.adjust_stock(uuid, int, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.create_order(jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.release_order(uuid, text, text) from public, anon, authenticated;
revoke all on function public.settle_payment(uuid, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.adjust_stock(uuid, int, text, uuid, text, text) to service_role;
grant execute on function public.create_order(jsonb, jsonb, jsonb) to service_role;
grant execute on function public.release_order(uuid, text, text) to service_role;
grant execute on function public.settle_payment(uuid, text, text, jsonb, text) to service_role;

-- ---------------------------------------------------------------------------
-- Storage bucket for product photos uploaded from the back office (public read)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
