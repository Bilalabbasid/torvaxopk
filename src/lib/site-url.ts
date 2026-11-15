/**
 * The public address of the shop, for canonical links, the sitemap, structured data and payment returns.
 *
 * NEXT_PUBLIC_SITE_URL wins (set it to https://torvaxo.pk once the domain points at Vercel). Without it,
 * or when it still says localhost on a Vercel deployment, the Vercel production domain is used, so
 * search engines are never sent to localhost.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') ?? '';
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const isLocal = !explicit || /\/\/(localhost|127\.0\.0\.1)/.test(explicit);
  if (isLocal && vercel) return `https://${vercel}`;
  return explicit || 'http://localhost:3000';
}
