import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const options = await generateAuthenticationOptions({
      rpID: process.env.RP_ID || 'localhost',
      timeout: 60000,
      userVerification: 'preferred',
    });

    // Store challenge for verification
    const cookieStore = await cookies();
    cookieStore.set('passkeyAuthChallenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5 // 5 minutes
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error('Passkey auth options error:', error);
    return NextResponse.json(
      { error: 'Failed to generate options' },
      { status: 500 }
    );
  }
}