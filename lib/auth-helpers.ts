import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
);

/**
 * Get user ID from request headers or JWT token
 * In test mode, accepts x-test-user-id header for easier testing
 */
export async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  // Test mode: Accept test headers when running tests
  if (process.env.NODE_ENV === 'test' || process.env.LOCAL_API === 'true') {
    const testUserId = request.headers.get('x-test-user-id');
    if (testUserId) {
      return testUserId;
    }
  }

  let token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    const cookieToken = request.cookies.get('session')?.value;
    if (cookieToken) {
      token = cookieToken;
    }
  }

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub as string;
    return userId;
  } catch {
    return null;
  }
}

/**
 * Get user email from request headers (for test mode)
 */
export function getTestUserEmail(request: NextRequest): string | null {
  if (process.env.NODE_ENV === 'test' || process.env.LOCAL_API === 'true') {
    return request.headers.get('x-test-user-email');
  }
  return null;
}