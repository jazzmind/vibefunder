import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findOrCreateUser, verifyOtpCode, createSession } from '@/lib/auth';
import { cookies } from 'next/headers';

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = verifyOtpSchema.parse(body);

    // Find user
    const user = await findOrCreateUser(email.toLowerCase());
    
    // Verify OTP code
    const isValid = await verifyOtpCode(user.id, code);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    // Create session
    const sessionToken = await createSession({
      id: user.id,
      userId: user.id,
      email: email.toLowerCase(),
      roles: user.roles
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: email.toLowerCase(),
        name: user.name,
        roles: user.roles
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}