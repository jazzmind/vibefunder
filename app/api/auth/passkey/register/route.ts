import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { verifySession, createPasskey } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const challenge = cookieStore.get('passkeyChallenge')?.value;
    
    if (!sessionToken || !challenge) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { credential, name } = body;

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: process.env.EXPECTED_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.RP_ID || 'localhost',
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'Passkey registration failed' },
        { status: 400 }
      );
    }

    // Save passkey
    const credentialId = Buffer.from(verification.registrationInfo.credentialID).toString('base64url');
    console.log('Storing credentialId:', credentialId);
    
    await createPasskey(
      session.userId,
      credentialId,
      Buffer.from(verification.registrationInfo.credentialPublicKey).toString('base64'),
      name || `Passkey ${new Date().toLocaleDateString()}`
    );

    // Clear challenge
    cookieStore.delete('passkeyChallenge');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Passkey register error:', error);
    return NextResponse.json(
      { error: 'Failed to register passkey' },
      { status: 500 }
    );
  }
}