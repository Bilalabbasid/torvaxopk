import { afterEach, describe, expect, it, vi } from 'vitest';
import { siteUrl } from '../site-url';

afterEach(() => vi.unstubAllEnvs());

describe('siteUrl', () => {
  it('uses NEXT_PUBLIC_SITE_URL when it is a real address', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://torvaxo.pk/');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'torvaxo.vercel.app');
    expect(siteUrl()).toBe('https://torvaxo.pk');
  });

  it('never sends search engines to localhost on Vercel', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'torvaxo.vercel.app');
    expect(siteUrl()).toBe('https://torvaxo.vercel.app');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    expect(siteUrl()).toBe('https://torvaxo.vercel.app');
  });

  it('falls back to localhost in local development', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
    expect(siteUrl()).toBe('http://localhost:3000');
  });
});
