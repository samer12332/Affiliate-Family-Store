import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOGIN_PATH = '/admin/login';

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

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicAsset(pathname) || pathname === LOGIN_PATH) {
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\..*).*)'],
};
