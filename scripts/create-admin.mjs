// Create (or promote) a back-office user.
// Usage: npm run admin:create -- you@example.com "a-strong-password"
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
import { createClient } from '@supabase/supabase-js';

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 10) {
  console.error('Usage: npm run admin:create -- <email> <password (10+ chars)>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || url.startsWith('PLACEHOLDER')) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

let userId;
const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
if (created.error) {
  if (!/already|registered|exists/i.test(created.error.message)) {
    console.error(created.error.message);
    process.exit(1);
  }
  // Existing user: find them and reset the password.
  for (let page = 1; !userId && page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
    if (data.users.length < 200) break;
  }
  if (!userId) throw new Error('User exists but could not be found.');
  await supabase.auth.admin.updateUserById(userId, { password });
} else {
  userId = created.data.user.id;
}

const { error } = await supabase.from('admin_users').upsert({ user_id: userId, email: email.toLowerCase() });
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Admin ready: ${email}. Sign in at /admin/login`);
