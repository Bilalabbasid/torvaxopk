import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Keeps the admin's Supabase session fresh and bounces signed-out visitors to the login page.
// The admin_users check happens on the server in every admin page and action (requireAdmin).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.startsWith('PLACEHOLDER')) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const isLogin = request.nextUrl.pathname === '/admin/login';
  if (!data.user && !isLogin) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
