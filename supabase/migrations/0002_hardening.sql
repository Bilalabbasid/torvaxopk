-- torvaxo.pk — hardening: concurrency, indexes, dashboard aggregates.
-- Safe to run after 0001_init.sql (idempotent).

-- ---------------------------------------------------------------------------
-- Indexes for lookups the app does on every webhook / admin page
-- ---------------------------------------------------------------------------
create index if not exists payments_provider_ref_idx on public.payments (provider_ref) where provider_ref is not null;
create index if not exists payments_status_created_idx on public.payments (status, created_at desc);
create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_kind_status_idx on public.orders (kind, status, created_at desc);
create index if not exists orders_pending_idx on public.orders (created_at) where status = 'pending';
create index if not exists order_items_variant_idx on public.order_items (variant_id);
create index if not exists coupons_email_idx on public.coupons (lower(email)) where email is not null;
create index if not exists coupons_source_created_idx on public.coupons (source, created_at desc);
create index if not exists inventory_movements_order_idx on public.inventory_movements (order_id) where order_id is not null;
create index if not exists customers_created_idx on public.customers (created_at desc);

-- ---------------------------------------------------------------------------
-- create_order v2
--  * locks stock rows in a fixed order (variant id) so concurrent checkouts can't deadlock
--  * locks the coupon row and enforces max_uses / active / expiry inside the transaction
-- Overselling protection: each stock UPDATE takes a row lock and the stock >= 0 check
-- aborts the whole transaction, so two buyers of the last unit cannot both succeed.
-- ---------------------------------------------------------------------------
create or replace function public.create_order(p_order jsonb, p_items jsonb, p_payment jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
  v_order uuid;
  v_item jsonb;
  v_payment uuid;
  v_coupon uuid := nullif(p_order->>'coupon_id', '')::uuid;
  v_c coupons%rowtype;
begin
  if v_coupon is not null then
    select * into v_c from coupons where id = v_coupon for update;
    if not found or not v_c.active
       or v_c.starts_at > now()
       or (v_c.expires_at is not null and v_c.expires_at <= now())
       or (v_c.max_uses is not null and v_c.uses >= v_c.max_uses) then
      raise exception 'COUPON_UNAVAILABLE';
    end if;
  end if;

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

  for v_item in
    select value from jsonb_array_elements(p_items) order by value->>'variant_id'
  loop
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

-- Stock comes back in the same fixed order when an order is released.
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
  for v_row in
    select variant_id, quantity from order_items where order_id = p_order and variant_id is not null order by variant_id
  loop
    perform adjust_stock(v_row.variant_id, v_row.quantity, 'order_released', p_order, p_reason, p_actor);
  end loop;
  update coupons c set uses = greatest(c.uses - 1, 0)
    from coupon_redemptions r where r.order_id = p_order and r.coupon_id = c.id;
  delete from coupon_redemptions where order_id = p_order;
  update orders set stock_released = true, status = 'cancelled', updated_at = now() where id = p_order;
  insert into order_events (order_id, type, message, actor) values (p_order, 'cancelled', p_reason, p_actor);
end $$;

-- ---------------------------------------------------------------------------
-- Dashboard figures computed in the database (no full-table downloads)
-- ---------------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'collected',        (select coalesce(sum(amount), 0) from payments where status = 'paid'),
    'deposits',         (select coalesce(sum(amount), 0) from payments where status = 'paid' and purpose = 'deposit'),
    'preorders',        (select count(*) from orders where kind = 'preorder' and status <> 'cancelled' and payment_status <> 'unpaid'),
    'outstanding',      (select coalesce(sum(balance_due), 0) from orders where kind = 'preorder' and status <> 'cancelled' and payment_status <> 'unpaid'),
    'cod_due',          (select coalesce(sum(balance_due), 0) from orders where kind = 'standard' and payment_method = 'cod' and status <> 'cancelled'),
    'to_ship',          (select count(*) from orders where status in ('confirmed', 'processing')),
    'today_count',      (select count(*) from orders where status <> 'cancelled'
                           and (created_at at time zone 'Asia/Karachi')::date = (now() at time zone 'Asia/Karachi')::date),
    'today_value',      (select coalesce(sum(total), 0) from orders where status <> 'cancelled'
                           and (created_at at time zone 'Asia/Karachi')::date = (now() at time zone 'Asia/Karachi')::date),
    'rewards',          (select count(*) from coupons where source = 'launch_reward'),
    'low_stock',        (select count(*) from product_variants where stock <= low_stock_threshold)
  );
$$;

-- Abuse guard: how many unpaid online orders this email or phone opened recently.
create or replace function public.recent_unpaid_orders(p_email text, p_phone text, p_minutes int default 60)
returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from orders
   where status = 'pending' and amount_paid = 0
     and created_at > now() - make_interval(mins => p_minutes)
     and (lower(email) = lower(p_email) or phone = p_phone);
$$;

revoke all on function public.create_order(jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.release_order(uuid, text, text) from public, anon, authenticated;
revoke all on function public.dashboard_stats() from public, anon, authenticated;
revoke all on function public.recent_unpaid_orders(text, text, int) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb, jsonb) to service_role;
grant execute on function public.release_order(uuid, text, text) to service_role;
grant execute on function public.dashboard_stats() to service_role;
grant execute on function public.recent_unpaid_orders(text, text, int) to service_role;
