import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOGIN_PATH = '/admin/login';
const MARKETER_REGISTER_PATH = '/register-marketer';
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ALLOWED_INLINE_SCRIPT_HASHES = [
  "'sha256-OBTN3RiyCV4Bq7dFqZ5a2pAXjnCcCYeTJMO2I/LYKeo='",
  "'sha256-jmMfAqYM9Q+qBFPN3sBNSUPhFNaYXOCi4VjHmjlwBak='",
  "'sha256-tB+I6MJWu9JpjUZ9Ak5D86sLz+DQdQXKOYf6V1U4SfE='",
  "'sha256-5Aln0h5eK7yRC6JdXC8YKIPycRwNk7Xzhuo+UTD3WIU='",
  "'sha256-0jehuMSZMVl5UFN83FAi7dJBdKypslLTW/Sw49Gh4/Q='",
  "'sha256-+40T5d+tKSaNOZ+wB+6mMmRzMtcuxFXOTqXZQB6Q0jM='",
];

function createNonce() {
  return crypto.randomUUID();
}

function buildContentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${ALLOWED_INLINE_SCRIPT_HASHES.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'trusted-types nextjs nextjs#bundler',
  ].join('; ');
}

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

function addSecurityHeaders(response: NextResponse, csp: string) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Content-Security-Policy', csp);
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
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  if (pathname.startsWith('/api')) {
    if (STATE_CHANGING_METHODS.has(method) && !isValidSameOriginRequest(request)) {
      return addSecurityHeaders(NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 }), csp);
    }
    return addSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), csp);
  }

  if (isPublicAsset(pathname) || pathname === LOGIN_PATH || pathname === MARKETER_REGISTER_PATH) {
    return addSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), csp);
  }

  const token = request.cookies.get('admin-token')?.value;
  if (!token) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    const redirectTo = `${pathname}${search}`;
    if (redirectTo && redirectTo !== LOGIN_PATH) {
      loginUrl.searchParams.set('next', redirectTo);
    }
    return addSecurityHeaders(NextResponse.redirect(loginUrl), csp);
  }

  return addSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), csp);
}

export const config = {
  matcher: ['/((?!.*\\..*).*)'],
};

