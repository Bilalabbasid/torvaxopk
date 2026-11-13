import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { db } from './supabase/admin';
import { authClient } from './supabase/server';

export interface AdminUser {
  id: string;
  email: string;
}

/** The signed-in admin, or null. A Supabase user only counts if listed in admin_users. */
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: row } = await db().from('admin_users').select('user_id, email').eq('user_id', data.user.id).maybeSingle();
  return row ? { id: row.user_id, email: row.email } : null;
});

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
