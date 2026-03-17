import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOGIN_PATH = '/admin/login';
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/apple-icon') ||
    pathname.startsWith('/placeholder') ||
    pathname === '/favicon.ico'
  );
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  return response;
}

function isValidSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const expectedOrigin = host ? `${forwardedProto}://${host}` : request.nextUrl.origin;
  if (origin && origin !== expectedOrigin) {
    return false;
  }

  const fetchSite = (request.headers.get('sec-fetch-site') || '').toLowerCase();
  if (fetchSite === 'cross-site') {
    return false;
  }
  return true;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const method = String(request.method || 'GET').toUpperCase();

  if (pathname.startsWith('/api')) {
    if (STATE_CHANGING_METHODS.has(method) && !isValidSameOriginRequest(request)) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }
    return addSecurityHeaders(NextResponse.next());
  }

  if (isPublicAsset(pathname) || pathname === LOGIN_PATH) {
    return addSecurityHeaders(NextResponse.next());
  }

  const token = request.cookies.get('admin-token')?.value;
  if (!token) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    const redirectTo = `${pathname}${search}`;
    if (redirectTo && redirectTo !== LOGIN_PATH) {
      loginUrl.searchParams.set('next', redirectTo);
    }
    return NextResponse.redirect(loginUrl);
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!.*\\..*).*)'],
};
