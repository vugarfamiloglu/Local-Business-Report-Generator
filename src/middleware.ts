/* Gate everything behind the lock screen. Edge runtime — Web Crypto only. */

import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export const config = {
  matcher: ['/((?!_next|favicon\\.svg|logo\\.svg|api/auth|login).*)'],
};

export async function middleware(req: NextRequest) {
  const cookie  = req.cookies.get(COOKIE_NAME)?.value;
  const payload = await verifySession(cookie);
  if (payload) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return new NextResponse(JSON.stringify({ error: 'unauthorized' }), {
      status:  401,
      headers: { 'content-type': 'application/json' },
    });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
