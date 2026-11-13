import type { NextConfig } from 'next';

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
  } catch {
    return '';
  }
})();

const nextConfig: NextConfig = {
  // Every storefront page reads live stock, prices and the preorder/live switch from the database,
  // so pages render per request (no Cache Components).
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  images: {
    remotePatterns: supabaseHost ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }] : [],
  },
  experimental: {
    serverActions: { bodySizeLimit: '8mb' }, // product photo uploads from the admin
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
