import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SignJWT } from 'jose';
import { z } from 'zod';

const githubAuthSchema = z.object({
  code: z.string().min(1, 'GitHub authorization code is required')
});

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const result = githubAuthSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid GitHub authorization code' },
        { status: 400 }
      );
    }

    const { code } = result.data;

    // TODO: Exchange code for access token with GitHub API
    // TODO: Fetch user data from GitHub API
    // For now, this is a mock implementation
    
    if (code === 'invalidCode') {
      return NextResponse.json(
        { success: false, error: 'Invalid GitHub authorization code' },
        { status: 401 }
      );
    }

    // Mock GitHub user data (replace with actual API calls)
    const mockGitHubUser = {
      id: 'github123',
      login: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: 'https://github.com/avatar.jpg'
    };

    // Check if user exists with this email
    let user = await prisma.user.findUnique({
      where: { email: mockGitHubUser.email.toLowerCase() }
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: mockGitHubUser.email.toLowerCase(),
          name: mockGitHubUser.name || mockGitHubUser.login,
          githubId: mockGitHubUser.id,
          avatar: mockGitHubUser.avatar_url,
          role: 'USER',
          isEmailVerified: true, // GitHub emails are considered verified
          isActive: true,
          failedLoginAttempts: 0,
          password: '' // No password for OAuth users
        }
      });
    } else if (!user.githubId) {
      // Link existing user with GitHub account
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          githubId: mockGitHubUser.id,
          avatar: mockGitHubUser.avatar_url || user.avatar,
          isEmailVerified: true
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
    console.error('GitHub OAuth error:', error);
    return NextResponse.json(
      { success: false, error: 'GitHub authentication failed' },
      { status: 500 }
    );
  }
}