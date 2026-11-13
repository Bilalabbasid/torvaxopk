import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, supabaseConfigured } from '../env';

let client: SupabaseClient | null = null;

/** Service-role client. Server only: bypasses RLS. Never import from a client component. */
export function db(): SupabaseClient {
  if (!supabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (see .env.example).',
    );
  }
  client ??= createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Throw on a Supabase error, return data otherwise. */
export function must<T>(result: { data: T | null; error: { message: string } | null }, context: string): T {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data as T;
}
