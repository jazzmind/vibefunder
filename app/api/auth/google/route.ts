import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SignJWT } from 'jose';
import { z } from 'zod';

const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required')
});

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const result = googleAuthSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid Google ID token' },
        { status: 400 }
      );
    }

    const { idToken } = result.data;

    // TODO: Verify Google ID token with Google's API
    // For now, this is a mock implementation
    // In production, you would verify the token with Google's token verification endpoint
    
    // Mock Google user data (replace with actual verification)
    const mockGoogleUser = {
      sub: 'google123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      email_verified: true
    };

    // Check if user exists with this email
    let user = await prisma.user.findUnique({
      where: { email: mockGoogleUser.email.toLowerCase() }
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: mockGoogleUser.email.toLowerCase(),
          name: mockGoogleUser.name,
          googleId: mockGoogleUser.sub,
          avatar: mockGoogleUser.picture,
          role: 'USER',
          isEmailVerified: mockGoogleUser.email_verified,
          isActive: true,
          failedLoginAttempts: 0,
          password: '' // No password for OAuth users
        }
      });
    } else if (!user.googleId) {
      // Link existing user with Google account
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: mockGoogleUser.sub,
          avatar: mockGoogleUser.picture || user.avatar,
          isEmailVerified: true // Google emails are verified
        }
      });
    }

    // Create JWT token
    const token = await new SignJWT({ 
      sub: user.id,
      email: user.email,
      role: user.role 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .setIssuedAt()
      .sign(secret);

    // Create session record
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: sessionExpiresAt,
        ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      }
    });

    // Set secure HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.json(
      { success: false, error: 'Google authentication failed' },
      { status: 401 }
    );
  }
}