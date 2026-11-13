-- torvaxo.pk — launch catalogue (the Forward series) and default settings.
-- PKR prices: Set of Three is confirmed (51,000 / preorder 35,000).
-- Cabin, Medium and Large prices are PLACEHOLDERS — change them in Admin → Products.
-- Dimensions, weights and volumes are carried over from the German shop and are also placeholders.

insert into public.settings (id) values (1) on conflict (id) do nothing;

do $$
declare
  v_product uuid;
  v_variant uuid;
  p record;
  c record;
  v_sort int;
  v_specs jsonb;
  v_features jsonb := '[
    "Ribbed hardshell that shrugs off knocks and scuffs",
    "Integrated TSA combination lock",
    "Detachable 360° double spinner wheels",
    "Zipped divider with mesh pocket and compression straps",
    "Two-stage aluminium telescopic handle"
  ]';
begin
  if exists (select 1 from public.products) then
    raise notice 'Catalogue already seeded, skipping.';
    return;
  end if;

  for p in
    select * from (values
      (0, 'forward-cabin', 'Forward Cabin', 'CAB', 'cabin', 'Cabin', false,
       'Carry-on sized. Overhead-bin ready.',
       'The one that never leaves your side. Forward Cabin is sized for the overhead bin and built for the sprint to the gate: a ribbed hardshell, silent double spinners and a lock you never have to think about.',
       12999, 8999, null::int, '20 inch', '55 × 37 × 21 cm', '2.9 kg', '38 L', 'Weekends and 1–3 day trips', 42, 28, 17),
      (1, 'forward-medium', 'Forward Medium', 'MED', 'medium', 'Medium', false,
       'The week-away workhorse.',
       'Room for a full week without the bulk. Forward Medium checks in light, rolls straight and keeps everything where you packed it with a zipped divider and compression straps.',
       17999, 12499, null, '24 inch', '66 × 44 × 26 cm', '3.7 kg', '68 L', 'Trips of 4–7 days', 35, 22, 6),
      (2, 'forward-large', 'Forward Large', 'LRG', 'large', 'Large', false,
       'Maximum volume. Zero drama.',
       'For the long haul and the heavy packers. Forward Large swallows two weeks of gear and still glides on four detachable double spinners.',
       25499, 17499, null, '28 inch', '76 × 50 × 30 cm', '4.5 kg', '102 L', 'Trips of 8 days and longer', 26, 14, 9),
      (3, 'forward-set-of-three', 'Forward Set of Three', 'SET', 'set', 'Set of 3', true,
       'Cabin, Medium and Large. One matched set.',
       'Every trip covered. The complete Forward line in one colour, nesting inside each other for storage and priced well below buying the three pieces separately.',
       51000, 35000, 56497, null, null, null, null, null, 12, 8, 6)
    ) as t(pos, slug, name, sku, image, size_label, is_set, tagline, description, price, preorder_price, compare_at,
           inches, dims, weight, volume, fit, stock_black, stock_graphite, stock_glacier)
  loop
    if p.is_set then
      v_specs := '[
        {"label": "Includes", "value": "Cabin (20 inch), Medium (24 inch) and Large (28 inch)"},
        {"label": "Total volume", "value": "208 L"},
        {"label": "Storage", "value": "Nests into the Large case"},
        {"label": "Lock", "value": "TSA combination lock on each case"},
        {"label": "Wheels", "value": "Detachable 360° double spinners"}
      ]';
    else
      v_specs := jsonb_build_array(
        jsonb_build_object('label', 'Size', 'value', p.inches),
        jsonb_build_object('label', 'Dimensions', 'value', p.dims),
        jsonb_build_object('label', 'Weight', 'value', p.weight),
        jsonb_build_object('label', 'Volume', 'value', p.volume),
        jsonb_build_object('label', 'Best for', 'value', p.fit),
        jsonb_build_object('label', 'Lock', 'value', 'TSA combination lock'),
        jsonb_build_object('label', 'Wheels', 'value', 'Detachable 360° double spinners')
      );
    end if;

    insert into public.products (slug, name, size_label, tagline, description, specs, features, status, is_set, sort_order)
    values (p.slug, p.name, p.size_label, p.tagline, p.description, v_specs, v_features, 'active', p.is_set, p.pos)
    returning id into v_product;

    v_sort := 0;
    for c in
      select * from (values
        (0, 'black', 'Black', '#141416', 'BLK'),
        (1, 'graphite', 'Graphite', '#3B3C3F', 'GRA'),
        (2, 'glacier', 'Glacier Blue', '#A9C6DE', 'GLC')
      ) as t(pos, key, label, hex, code)
    loop
      insert into public.product_variants (product_id, sku, color_name, color_hex, price, preorder_price, compare_at, stock, sort_order)
      values (v_product, 'TX-FWD-' || p.sku || '-' || c.code, c.label, c.hex, p.price, p.preorder_price, p.compare_at, 0, c.pos)
      returning id into v_variant;

      perform public.adjust_stock(
        v_variant,
        case c.key when 'black' then p.stock_black when 'graphite' then p.stock_graphite else p.stock_glacier end,
        'initial', null, 'Seed stock', 'seed'
      );

      insert into public.product_images (product_id, variant_id, url, alt, is_listing, sort_order)
      values (v_product, v_variant, '/images/products/forward-' || p.image || '-' || c.key || '.jpg',
              p.name || ' in ' || c.label, p.is_set, c.pos);

      if not p.is_set then
        insert into public.product_images (product_id, variant_id, url, alt, is_listing, sort_order)
        values (v_product, v_variant, '/images/products/forward-' || p.image || '-' || c.key || '-scale.jpg',
                p.name || ' in ' || c.label || ', shown to scale', true, 0);
        insert into public.product_images (product_id, variant_id, url, alt, is_listing, sort_order)
        values (v_product, v_variant, '/images/products/forward-set-' || c.key || '.jpg',
                'The Forward series in ' || c.label, false, 10 + c.pos);
      end if;
    end loop;

    insert into public.product_images (product_id, url, alt, sort_order) values
      (v_product, '/images/products/detail-lock.jpg', 'TSA combination lock', 50),
      (v_product, '/images/products/detail-wheels.jpg', 'Detachable spinner wheel', 51),
      (v_product, '/images/products/detail-interior.jpg', 'Organised interior', 52);
  end loop;
end $$;
