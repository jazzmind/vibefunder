import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Check if LOCAL_API is enabled and request is from localhost to localhost
  if (process.env.LOCAL_API === 'true') {
    const url = new URL(request.url);
    const isLocalhost = (url.hostname === 'localhost' || url.hostname === '127.0.0.1') && 
                       (request.headers.get('host')?.includes('localhost') || 
                        request.headers.get('host')?.includes('127.0.0.1'));
    
    if (isLocalhost && url.pathname.startsWith('/api/')) {
      console.log(`[LOCAL_API] Bypassing auth for localhost API request: ${request.method} ${url.pathname}`);
      return NextResponse.next(); // Skip middleware auth for localhost API requests
    }
  }
  const { pathname, search } = request.nextUrl;
  // Debug logging
  console.log(`[MIDDLEWARE] Request: ${request.method} ${pathname}, hasSession: ${request.cookies.has('session')}`);
  
  // Always allow API and signin routes
  if (pathname.startsWith('/api/') || pathname.startsWith('/signin')) {
    console.log(`[MIDDLEWARE] Allowing API/signin route: ${pathname}`);
    return NextResponse.next();
  }
  
  // Define public routes that don't require authentication
  const publicRoutes = ['/', '/campaigns', '/services', '/waitlist'];
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // Allow static assets and public directories
  const isStaticAsset = pathname.startsWith('/public/') || 
                       pathname.startsWith('/images/') ||
                       pathname.startsWith('/_next/') ||
                       pathname.includes('.') // Files with extensions (images, css, js, etc.);
  
  if (isPublicRoute) {
    console.log(`[MIDDLEWARE] Allowing public route: ${pathname}`);
    return NextResponse.next();
  }
  
  if (isStaticAsset) {
    console.log(`[MIDDLEWARE] Allowing static asset: ${pathname}`);
    return NextResponse.next();
  }
  
  // Require session cookie for all other routes
  const hasSession = request.cookies.has('session');
  if (!hasSession) {
    console.log(`[MIDDLEWARE] Redirecting to signin for protected route: ${pathname}`);
    const redirectUrl = new URL('/signin', request.url);
    if (pathname && pathname !== '/signin') {
      // Preserve original target
      redirectUrl.searchParams.set('redirect_to', pathname + (search || ''));
    }
    return NextResponse.redirect(redirectUrl);
  }

  // For all other requests, proceed with normal flow
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};