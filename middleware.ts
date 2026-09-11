import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE, verifySession } from '@/lib/auth';

/**
 * The request form is public -- case workers and households use it without an
 * account. Everything a volunteer sees sits behind the shared passcode.
 */
export async function middleware(req: NextRequest) {
  const ok = await verifySession(
    req.cookies.get(SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET ?? '',
  );
  if (ok) return NextResponse.next();

  const url = new URL('/login', req.url);
  url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/queue/:path*', '/reports/:path*'],
};
