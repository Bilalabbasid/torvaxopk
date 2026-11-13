export type SaleMode = 'preorder' | 'live';
export type PaymentMethod = 'safepay' | 'jazzcash' | 'easypaisa' | 'cod';
export type OnlineMethod = Exclude<PaymentMethod, 'cod'>;
export type OrderKind = 'preorder' | 'standard';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'paid' | 'refunded';
export type PaymentPurpose = 'deposit' | 'balance' | 'full';
export type PaymentRowStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

export interface Settings {
  sale_mode: SaleMode;
  launch_date: string | null;
  deposit_amount: number;
  shipping_flat: number;
  shipping_free_from: number;
  launch_coupon_percent: number;
  launch_coupon_days: number;
  payment_methods: Record<PaymentMethod, boolean>;
  store_name: string;
  store_email: string;
  store_phone: string;
  store_whatsapp: string;
  store_address: string;
  delivery_time: string;
  announcement: string | null;
  updated_at: string;
}

export interface Spec {
  label: string;
  value: string;
}

export interface Variant {
  id: string;
  product_id: string;
  sku: string;
  color_name: string;
  color_hex: string;
  price: number;
  preorder_price: number | null;
  compare_at: number | null;
  stock: number;
  low_stock_threshold: number;
  sort_order: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  url: string;
  alt: string;
  is_listing: boolean;
  sort_order: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  size_label: string;
  tagline: string;
  description: string;
  specs: Spec[];
  features: string[];
  status: 'active' | 'draft' | 'archived';
  is_set: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  product_variants: Variant[];
  product_images: ProductImage[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  variant_id: string | null;
  product_name: string;
  variant_label: string;
  sku: string;
  image_url: string;
  unit_price: number;
  regular_price: number;
  quantity: number;
  line_total: number;
}

export interface Payment {
  id: string;
  order_id: string;
  reference: string;
  provider: PaymentMethod | 'mock' | 'manual';
  purpose: PaymentPurpose;
  amount: number;
  status: PaymentRowStatus;
  provider_ref: string | null;
  raw: unknown;
  created_at: string;
  updated_at: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  type: string;
  message: string;
  actor: string;
  created_at: string;
}

export interface Order {
  id: string;
  number: string;
  customer_id: string | null;
  email: string;
  name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  province: string;
  postal_code: string;
  customer_note: string;
  kind: OrderKind;
  sale_mode: SaleMode;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  deposit_amount: number;
  amount_paid: number;
  balance_due: number;
  balance_token: string | null;
  balance_requested_at: string | null;
  balance_method: PaymentMethod | null;
  coupon_id: string | null;
  coupon_code: string | null;
  carrier: string;
  tracking_number: string;
  internal_note: string;
  stock_released: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface Coupon {
  id: string;
  code: string;
  percent: number;
  email: string | null;
  source: 'manual' | 'launch_reward';
  starts_at: string;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  active: boolean;
  issued_order_id: string | null;
  note: string;
  created_at: string;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string;
  city: string;
  created_at: string;
}

export interface CartLine {
  variantId: string;
  quantity: number;
  /** Sets only: a colour per case (Cabin, Medium, Large) when the customer mixes colours. */
  mix?: string[];
}
