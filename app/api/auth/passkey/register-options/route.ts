import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { verifySession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const options = await generateRegistrationOptions({
      rpName: 'VibeFunder',
      rpID: process.env.RP_ID || 'localhost',
      userID: new TextEncoder().encode(session.userId),
      userName: session.email,
      userDisplayName: session.email,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: [], // TODO: Add existing credentials
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });

    // Store challenge in session for verification
    cookieStore.set('passkeyChallenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5 // 5 minutes
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error('Passkey register options error:', error);
    return NextResponse.json(
      { error: 'Failed to generate options' },
      { status: 500 }
    );
  }
}