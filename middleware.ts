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