import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getPasskeyByCredentialId, updatePasskeyCounter, createSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const challenge = cookieStore.get('passkeyAuthChallenge')?.value;
    
    if (!challenge) {
      return NextResponse.json({ error: 'No challenge found' }, { status: 400 });
    }

    const body = await request.json();
    const { credential } = body;

    // Find passkey
    // The credential.id from the browser might be in different format
    // Let's try multiple approaches to find the right credential
    console.log('Raw credential.id from browser:', credential.id);
    console.log('Raw credential.rawId type:', typeof credential.rawId);
    
    let credentialId = credential.id;
    let passkey = await getPasskeyByCredentialId(credentialId);
    
    if (!passkey) {
      // Try converting from raw credential ID if available
      if (credential.rawId) {
        // credential.rawId is an ArrayBuffer, convert to base64url
        const rawIdBase64url = Buffer.from(credential.rawId).toString('base64url');
        console.log('Trying rawId as base64url:', rawIdBase64url);
        passkey = await getPasskeyByCredentialId(rawIdBase64url);
        if (passkey) {
          credentialId = rawIdBase64url;
        }
      }
    }
    
    if (!passkey) {
      // Try different encodings of credential.id
      try {
        // Maybe credential.id is base64 and we need base64url
        const asBase64url = credential.id.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        console.log('Trying as base64url conversion:', asBase64url);
        passkey = await getPasskeyByCredentialId(asBase64url);
        if (passkey) {
          credentialId = asBase64url;
        }
      } catch (e) {
        console.log('Base64url conversion failed:', e);
      }
    }

    console.log('Final credentialId being used:', credentialId);
    console.log('Found passkey:', passkey ? 'YES' : 'NO');

    if (!passkey) {
      // Debug: check all passkeys in database
      const { prisma } = await import('@/lib/db');
      const allPasskeys = await prisma.passkey.findMany({
        select: { credentialId: true, user: { select: { email: true } } }
      });
      console.log('All passkeys in DB:', allPasskeys);
      
      return NextResponse.json({ 
        error: 'Passkey not found', 
        debug: { 
          browserCredentialId: credential.id,
          browserRawId: credential.rawId ? '[ArrayBuffer]' : null,
          lookingFor: credentialId,
          found: allPasskeys.map(p => p.credentialId) 
        } 
      }, { status: 400 });
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: process.env.EXPECTED_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.RP_ID || 'localhost',
      authenticator: {
        credentialID: passkey.credentialId,
        credentialPublicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64')),
        counter: passkey.counter,
      },
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Passkey authentication failed' },
        { status: 400 }
      );
    }

    // Update counter
    await updatePasskeyCounter(passkey.credentialId, verification.authenticationInfo.newCounter);

    // Create session
    const sessionToken = await createSession({
      id: passkey.user.id,
      userId: passkey.user.id,
      email: passkey.user.email,
      roles: passkey.user.roles
    });

    // Set cookie
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    // Clear challenge
    cookieStore.delete('passkeyAuthChallenge');

    return NextResponse.json({ 
      success: true,
      user: {
        id: passkey.user.id,
        email: passkey.user.email,
        name: passkey.user.name,
        roles: passkey.user.roles
      }
    });
  } catch (error) {
    console.error('Passkey authenticate error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate' },
      { status: 500 }
    );
  }
}