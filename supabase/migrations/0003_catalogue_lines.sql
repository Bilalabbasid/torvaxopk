-- Product lines, as in the German shop: every product belongs to a series (the products that are
-- options of one another), a category (luggage, bags, parts) and an edition (standard or signature).
-- Existing products are the Forward cases, so the defaults describe them.

alter table public.products
  add column if not exists series   text not null default 'Forward',
  add column if not exists category text not null default 'luggage',
  add column if not exists edition  text not null default 'standard';

alter table public.products drop constraint if exists products_category_check;
alter table public.products
  add constraint products_category_check check (category in ('luggage', 'backpacks', 'work', 'slings', 'duffels', 'parts'));

alter table public.products drop constraint if exists products_edition_check;
alter table public.products
  add constraint products_edition_check check (edition in ('standard', 'signature'));

create index if not exists products_series_idx on public.products (series);
