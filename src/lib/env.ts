import 'server-only';

function read(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function isPlaceholder(value: string) {
  return !value || value.startsWith('PLACEHOLDER') || value.includes('your-');
}

export const env = {
  siteUrl: (read('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000').replace(/\/$/, ''),
  supabaseUrl: read('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: read('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || read('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceKey: read('SUPABASE_SERVICE_ROLE_KEY'),

  /** 'mock' runs every online payment through the built-in test screen. 'live' uses the real gateways. */
  paymentsMode: (read('PAYMENTS_MODE') || 'mock') as 'mock' | 'live',
  /** Signs internal tokens (mock payments). Any long random string. */
  appSecret: read('APP_SECRET') || 'dev-only-secret-change-me',

  safepay: {
    environment: (read('SAFEPAY_ENVIRONMENT') || 'sandbox') as 'sandbox' | 'production',
    apiKey: read('SAFEPAY_API_KEY'),
    secretKey: read('SAFEPAY_SECRET_KEY'),
    webhookSecret: read('SAFEPAY_WEBHOOK_SECRET'),
  },
  jazzcash: {
    environment: (read('JAZZCASH_ENVIRONMENT') || 'sandbox') as 'sandbox' | 'production',
    merchantId: read('JAZZCASH_MERCHANT_ID'),
    password: read('JAZZCASH_PASSWORD'),
    integritySalt: read('JAZZCASH_INTEGRITY_SALT'),
  },
  easypaisa: {
    environment: (read('EASYPAISA_ENVIRONMENT') || 'sandbox') as 'sandbox' | 'production',
    storeId: read('EASYPAISA_STORE_ID'),
    hashKey: read('EASYPAISA_HASH_KEY'),
  },

  resendApiKey: read('RESEND_API_KEY'),
  emailFrom: read('EMAIL_FROM') || 'Torvaxo Pakistan <orders@torvaxo.pk>',
  adminNotifyEmail: read('ADMIN_NOTIFY_EMAIL'),
};

export function supabaseConfigured() {
  return !isPlaceholder(env.supabaseUrl) && !isPlaceholder(env.supabaseServiceKey);
}

export function gatewayConfigured(method: 'safepay' | 'jazzcash' | 'easypaisa') {
  switch (method) {
    case 'safepay':
      return !isPlaceholder(env.safepay.apiKey) && !isPlaceholder(env.safepay.secretKey);
    case 'jazzcash':
      return !isPlaceholder(env.jazzcash.merchantId) && !isPlaceholder(env.jazzcash.integritySalt);
    case 'easypaisa':
      return !isPlaceholder(env.easypaisa.storeId) && !isPlaceholder(env.easypaisa.hashKey);
  }
}
