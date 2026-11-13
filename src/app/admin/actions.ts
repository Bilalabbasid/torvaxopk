'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { getSettings, invalidateCatalog } from '@/lib/catalog';
import { emailBalanceRequest, emailShipped } from '@/lib/email';
import { expireStaleOrders, logEvent, onPaymentReceived } from '@/lib/orders';
import { paymentReference } from '@/lib/payments/crypto';
import { db, must } from '@/lib/supabase/admin';
import { authClient } from '@/lib/supabase/server';
import type { Order, OrderStatus } from '@/lib/types';
import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function str(form: FormData, key: string) {
  return String(form.get(key) ?? '').trim();
}

function int(form: FormData, key: string, fallback: number | null = null): number | null {
  const raw = str(form, key).replace(/[,\s]/g, '');
  if (raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function back(path: string, msg?: string, kind: 'msg' | 'error' = 'msg'): never {
  invalidateCatalog();
  revalidatePath('/', 'layout');
  redirect(msg ? `${path}${path.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(msg)}` : path);
}

async function loadOrder(id: string) {
  return must(await db().from('orders').select('*').eq('id', id).single(), 'Load order') as Order;
}

// ---------------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------------

export async function signIn(form: FormData) {
  const supabase = await authClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: str(form, 'email'), password: str(form, 'password') });
  if (error || !data.user) redirect('/admin/login?error=' + encodeURIComponent('Wrong email or password.'));
  const { data: row } = await db().from('admin_users').select('user_id').eq('user_id', data.user.id).maybeSingle();
  if (!row) {
    await supabase.auth.signOut();
    redirect('/admin/login?error=' + encodeURIComponent('This account is not an admin.'));
  }
  redirect('/admin');
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

// ---------------------------------------------------------------------------
// settings
// ---------------------------------------------------------------------------

export async function updateSettings(form: FormData) {
  await requireAdmin();
  const current = await getSettings();
  const launch = str(form, 'launch_date');
  must(
    await db()
      .from('settings')
      .update({
        launch_date: launch ? new Date(`${launch.slice(0, 16)}:00+05:00`).toISOString() : null, // form value is Pakistan time
        deposit_amount: int(form, 'deposit_amount', current.deposit_amount),
        shipping_flat: int(form, 'shipping_flat', current.shipping_flat),
        shipping_free_from: int(form, 'shipping_free_from', current.shipping_free_from),
        launch_coupon_percent: Math.min(Math.max(int(form, 'launch_coupon_percent', 12)!, 1), 100),
        launch_coupon_days: Math.max(int(form, 'launch_coupon_days', 365)!, 1),
        payment_methods: {
          safepay: form.get('pm_safepay') === 'on',
          jazzcash: form.get('pm_jazzcash') === 'on',
          easypaisa: form.get('pm_easypaisa') === 'on',
          cod: form.get('pm_cod') === 'on',
        },
        store_name: str(form, 'store_name') || current.store_name,
        store_email: str(form, 'store_email') || current.store_email,
        store_phone: str(form, 'store_phone'),
        store_whatsapp: str(form, 'store_whatsapp'),
        store_address: str(form, 'store_address'),
        delivery_time: str(form, 'delivery_time') || current.delivery_time,
        announcement: str(form, 'announcement') || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1),
    'Save settings',
  );
  back('/admin/settings', 'Settings saved.');
}

export async function setSaleMode(form: FormData) {
  await requireAdmin();
  const mode = str(form, 'mode') === 'live' ? 'live' : 'preorder';
  must(await db().from('settings').update({ sale_mode: mode, updated_at: new Date().toISOString() }).eq('id', 1), 'Switch mode');
  back(str(form, 'return') || '/admin/settings', mode === 'live' ? 'The sale is live. Launch rewards are now issued on paid orders.' : 'Back in preorder mode.');
}

// ---------------------------------------------------------------------------
// orders
// ---------------------------------------------------------------------------

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export async function updateOrderStatus(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, 'id');
  const status = str(form, 'status') as OrderStatus;
  const path = `/admin/orders/${id}`;
  if (!STATUSES.includes(status)) back(path, 'Unknown status.', 'error');
  const order = await loadOrder(id);
  if (order.status === 'cancelled') back(path, 'Cancelled orders cannot change status.', 'error');

  const carrier = str(form, 'carrier');
  const tracking = str(form, 'tracking_number');
  must(
    await db()
      .from('orders')
      .update({ status, carrier, tracking_number: tracking, updated_at: new Date().toISOString() })
      .eq('id', id),
    'Update status',
  );
  if (status !== order.status) {
    await logEvent(id, 'status', `Status changed from ${order.status} to ${status}`, admin.email);
    if (status === 'shipped') {
      const updated = await loadOrder(id);
      await emailShipped(updated, await getSettings());
    }
  }
  back(path, 'Order updated.');
}

/** Cash received (COD on delivery, or a manual bank transfer): records a payment for the open balance. */
export async function recordCashPayment(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, 'id');
  const path = `/admin/orders/${id}`;
  const order = await loadOrder(id);
  if (order.status === 'cancelled') back(path, 'Order is cancelled.', 'error');
  if (order.balance_due <= 0) back(path, 'Nothing left to pay.', 'error');

  const purpose = order.kind === 'preorder' && order.amount_paid > 0 ? 'balance' : 'full';
  const method = str(form, 'method') === 'manual' ? 'manual' : 'cod';
  const payment = must(
    await db()
      .from('payments')
      .insert({ order_id: id, reference: paymentReference(), provider: method, purpose, amount: order.balance_due })
      .select('id')
      .single(),
    'Create payment',
  ) as { id: string };
  const { error } = await db().rpc('settle_payment', {
    p_payment: payment.id,
    p_status: 'paid',
    p_provider_ref: null,
    p_raw: { recorded_by: admin.email },
    p_actor: admin.email,
  });
  if (error) back(path, error.message, 'error');
  await onPaymentReceived(id, purpose);
  back(path, `Recorded ${method === 'cod' ? 'cash on delivery' : 'manual'} payment.`);
}

export async function requestBalance(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, 'id');
  const path = `/admin/orders/${id}`;
  const order = await loadOrder(id);
  if (order.kind !== 'preorder' || order.balance_due <= 0) back(path, 'No balance to request.', 'error');
  if (order.payment_status === 'unpaid') back(path, 'The deposit has not been paid.', 'error');
  must(
    await db()
      .from('orders')
      .update({
        balance_requested_at: new Date().toISOString(),
        balance_token: order.balance_token ?? randomBytes(24).toString('base64url'),
      })
      .eq('id', id),
    'Request balance',
  );
  await emailBalanceRequest(await loadOrder(id), await getSettings());
  await logEvent(id, 'balance_requested', 'Balance payment link emailed to customer', admin.email);
  back(path, 'Balance request emailed.');
}

export async function requestAllBalances() {
  const admin = await requireAdmin();
  const orders = must(
    await db()
      .from('orders')
      .select('*')
      .eq('kind', 'preorder')
      .eq('payment_status', 'deposit_paid')
      .is('balance_requested_at', null)
      .neq('status', 'cancelled')
      .limit(500),
    'Find preorders',
  ) as Order[];
  const settings = await getSettings();
  for (const order of orders) {
    await db().from('orders').update({ balance_requested_at: new Date().toISOString() }).eq('id', order.id);
    await emailBalanceRequest(order, settings);
    await logEvent(order.id, 'balance_requested', 'Balance payment link emailed (bulk)', admin.email);
  }
  back('/admin/orders?kind=preorder', `Balance requests sent for ${orders.length} preorder(s).`);
}

export async function cancelOrder(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, 'id');
  const reason = str(form, 'reason') || 'Cancelled by admin';
  const order = await loadOrder(id);
  if (order.status === 'cancelled') back(`/admin/orders/${id}`, 'Already cancelled.', 'error');
  await db().from('payments').update({ status: 'cancelled' }).eq('order_id', id).eq('status', 'pending');
  const { error } = await db().rpc('release_order', { p_order: id, p_reason: reason, p_actor: admin.email });
  if (error) back(`/admin/orders/${id}`, error.message, 'error');
  const note = order.amount_paid > 0 ? ` ${'Rs'} ${order.amount_paid.toLocaleString('en-PK')} was paid: refund it with the provider, then mark it refunded.` : '';
  back(`/admin/orders/${id}`, `Order cancelled and stock returned.${note}`);
}

export async function markRefunded(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, 'id');
  must(await db().from('orders').update({ payment_status: 'refunded', updated_at: new Date().toISOString() }).eq('id', id), 'Refund');
  await logEvent(id, 'refunded', `Marked refunded. ${str(form, 'note')}`.trim(), admin.email);
  back(`/admin/orders/${id}`, 'Marked as refunded.');
}

export async function saveOrderNote(form: FormData) {
  await requireAdmin();
  const id = str(form, 'id');
  must(await db().from('orders').update({ internal_note: str(form, 'internal_note') }).eq('id', id), 'Save note');
  back(`/admin/orders/${id}`, 'Note saved.');
}

export async function expireStale() {
  await requireAdmin();
  const n = await expireStaleOrders(120);
  back('/admin/orders', `${n} abandoned order(s) cancelled.`);
}

// ---------------------------------------------------------------------------
// products
// ---------------------------------------------------------------------------

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseSpecs(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf(':');
      return i > 0 ? { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() } : { label: line, value: '' };
    });
}

export async function saveProduct(form: FormData) {
  await requireAdmin();
  const id = str(form, 'id');
  const name = str(form, 'name');
  if (!name) back(id ? `/admin/products/${id}` : '/admin/products/new', 'Name is required.', 'error');
  const row = {
    name,
    slug: slugify(str(form, 'slug') || name),
    size_label: str(form, 'size_label'),
    tagline: str(form, 'tagline'),
    description: str(form, 'description'),
    specs: parseSpecs(str(form, 'specs')),
    features: str(form, 'features').split('\n').map((s) => s.trim()).filter(Boolean),
    status: ['active', 'draft', 'archived'].includes(str(form, 'status')) ? str(form, 'status') : 'draft',
    is_set: form.get('is_set') === 'on',
    sort_order: int(form, 'sort_order', 0),
    updated_at: new Date().toISOString(),
  };
  if (id) {
    const { error } = await db().from('products').update(row).eq('id', id);
    if (error) back(`/admin/products/${id}`, error.message.includes('duplicate') ? 'That URL slug is taken.' : error.message, 'error');
    back(`/admin/products/${id}`, 'Product saved.');
  }
  const { data, error } = await db().from('products').insert(row).select('id').single();
  if (error) back('/admin/products/new', error.message.includes('duplicate') ? 'That URL slug is taken.' : error.message, 'error');
  back(`/admin/products/${data!.id}`, 'Product created. Add colours and photos below.');
}

export async function saveVariant(form: FormData) {
  const admin = await requireAdmin();
  const productId = str(form, 'product_id');
  const id = str(form, 'id');
  const path = `/admin/products/${productId}`;
  const price = int(form, 'price');
  if (price == null || price < 0) back(path, 'Price is required.', 'error');
  const row = {
    product_id: productId,
    sku: str(form, 'sku').toUpperCase(),
    color_name: str(form, 'color_name'),
    color_hex: /^#[0-9a-f]{6}$/i.test(str(form, 'color_hex')) ? str(form, 'color_hex') : '#141416',
    price,
    preorder_price: int(form, 'preorder_price'),
    compare_at: int(form, 'compare_at'),
    low_stock_threshold: int(form, 'low_stock_threshold', 5),
    sort_order: int(form, 'sort_order', 0),
  };
  if (!row.sku || !row.color_name) back(path, 'SKU and colour name are required.', 'error');
  if (id) {
    const { error } = await db().from('product_variants').update(row).eq('id', id);
    if (error) back(path, error.message.includes('duplicate') ? 'That SKU is already used.' : error.message, 'error');
    back(path, 'Variant saved.');
  }
  const { data, error } = await db().from('product_variants').insert({ ...row, stock: 0 }).select('id').single();
  if (error) back(path, error.message.includes('duplicate') ? 'That SKU is already used.' : error.message, 'error');
  const stock = int(form, 'stock', 0)!;
  if (stock > 0) {
    await db().rpc('adjust_stock', { p_variant: data!.id, p_delta: stock, p_reason: 'initial', p_order: null, p_note: 'Initial stock', p_actor: admin.email });
  }
  back(path, 'Variant added.');
}

export async function deleteVariant(form: FormData) {
  await requireAdmin();
  const productId = str(form, 'product_id');
  must(await db().from('product_variants').delete().eq('id', str(form, 'id')), 'Delete variant');
  back(`/admin/products/${productId}`, 'Variant removed.');
}

export async function uploadImage(form: FormData) {
  await requireAdmin();
  const productId = str(form, 'product_id');
  const path = `/admin/products/${productId}`;
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) back(path, 'Choose an image.', 'error');
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) back(path, 'Use a JPG, PNG, WebP or AVIF image.', 'error');
  if (file.size > 8 * 1024 * 1024) back(path, 'Images must be under 8 MB.', 'error');

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const key = `${productId}/${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;
  const storage = db().storage.from('product-images');
  const { error } = await storage.upload(key, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) back(path, `Upload failed: ${error.message}`, 'error');
  const url = storage.getPublicUrl(key).data.publicUrl;
  must(
    await db()
      .from('product_images')
      .insert({
        product_id: productId,
        variant_id: str(form, 'variant_id') || null,
        url,
        alt: str(form, 'alt'),
        is_listing: form.get('is_listing') === 'on',
        sort_order: int(form, 'sort_order', 0),
      }),
    'Save image',
  );
  back(path, 'Photo uploaded.');
}

export async function updateImage(form: FormData) {
  await requireAdmin();
  const productId = str(form, 'product_id');
  must(
    await db()
      .from('product_images')
      .update({
        alt: str(form, 'alt'),
        variant_id: str(form, 'variant_id') || null,
        is_listing: form.get('is_listing') === 'on',
        sort_order: int(form, 'sort_order', 0),
      })
      .eq('id', str(form, 'id')),
    'Update image',
  );
  back(`/admin/products/${productId}`, 'Photo updated.');
}

export async function deleteImage(form: FormData) {
  await requireAdmin();
  const productId = str(form, 'product_id');
  const image = must(await db().from('product_images').select('url').eq('id', str(form, 'id')).single(), 'Load image') as { url: string };
  const marker = '/product-images/';
  if (image.url.includes(marker)) {
    await db().storage.from('product-images').remove([image.url.split(marker)[1]]);
  }
  must(await db().from('product_images').delete().eq('id', str(form, 'id')), 'Delete image');
  back(`/admin/products/${productId}`, 'Photo removed.');
}

// ---------------------------------------------------------------------------
// inventory
// ---------------------------------------------------------------------------

export async function adjustStock(form: FormData) {
  const admin = await requireAdmin();
  const delta = int(form, 'delta', 0)!;
  const ret = str(form, 'return') || '/admin/inventory';
  if (!delta) back(ret, 'Enter a quantity to add or remove.', 'error');
  const reason = ['restock', 'correction', 'damaged', 'return'].includes(str(form, 'reason')) ? str(form, 'reason') : 'correction';
  const { error } = await db().rpc('adjust_stock', {
    p_variant: str(form, 'variant_id'),
    p_delta: delta,
    p_reason: reason,
    p_order: null,
    p_note: str(form, 'note'),
    p_actor: admin.email,
  });
  if (error) back(ret, error.message.includes('INSUFFICIENT') ? 'Stock cannot go below zero.' : error.message, 'error');
  back(ret, `Stock ${delta > 0 ? 'added' : 'removed'}.`);
}

// ---------------------------------------------------------------------------
// discounts
// ---------------------------------------------------------------------------

export async function createCoupon(form: FormData) {
  await requireAdmin();
  const code = str(form, 'code').toUpperCase().replace(/\s+/g, '');
  const percent = int(form, 'percent');
  if (!/^[A-Z0-9-]{3,40}$/.test(code)) back('/admin/discounts', 'Codes use letters, numbers and dashes (3–40).', 'error');
  if (!percent || percent < 1 || percent > 100) back('/admin/discounts', 'Percent must be 1–100.', 'error');
  const expires = str(form, 'expires_at');
  const starts = str(form, 'starts_at');
  const { error } = await db()
    .from('coupons')
    .insert({
      code,
      percent,
      email: str(form, 'email').toLowerCase() || null,
      source: 'manual',
      starts_at: starts ? new Date(starts).toISOString() : new Date().toISOString(),
      expires_at: expires ? new Date(expires).toISOString() : null,
      max_uses: int(form, 'max_uses'),
      note: str(form, 'note'),
    });
  if (error) back('/admin/discounts', error.message.includes('duplicate') ? 'That code already exists.' : error.message, 'error');
  back('/admin/discounts', `Code ${code} created.`);
}

export async function toggleCoupon(form: FormData) {
  await requireAdmin();
  must(await db().from('coupons').update({ active: str(form, 'active') === 'true' }).eq('id', str(form, 'id')), 'Toggle coupon');
  back(str(form, 'return') || '/admin/discounts', 'Code updated.');
}
