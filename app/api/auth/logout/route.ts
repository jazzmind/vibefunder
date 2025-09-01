import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
);

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header or cookie
    let token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      const cookieToken = request.cookies.get('session')?.value;
      if (cookieToken) {
        token = cookieToken;
      }
    }

    if (token) {
      try {
        // Verify and decode token
        const { payload } = await jwtVerify(token, secret);
        const userId = payload.sub as string;

        // Delete session from database
        await prisma.session.deleteMany({
          where: {
            userId: userId,
            token: token
          }
        });
      } catch (jwtError) {
        // Token might be invalid/expired, but we still want to clear the cookie
        console.warn('Invalid token during logout:', jwtError);
      }
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear session cookie
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, we should still clear the cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    return response;
  }
}