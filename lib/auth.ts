import { JWTPayload, SignJWT, jwtVerify } from 'jose';
import { prisma } from './db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Use HMAC with a shared secret for simplicity and better compatibility
const jwtSecret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-very-long-secret-key-change-this-in-production'
);

const alg = 'HS256'; // HMAC SHA-256 is widely supported and simpler

export interface SessionPayload {
  id: string;
  userId: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

export async function createSession(payload: SessionPayload) {
  return await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(jwtSecret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function createOtpCode(userId: string): Promise<string> {
  // Invalidate existing codes
  await prisma.otpCode.updateMany({
    where: { userId, used: false },
    data: { used: true }
  });

  // Create new code
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.otpCode.create({
    data: {
      userId,
      code,
      expiresAt
    }
  });

  return code;
}

export async function verifyOtpCode(userId: string, code: string): Promise<boolean> {
  const otpCode = await prisma.otpCode.findFirst({
    where: {
      userId,
      code,
      used: false,
      expiresAt: { gt: new Date() }
    }
  });

  if (!otpCode) return false;

  // Mark as used
  await prisma.otpCode.update({
    where: { id: otpCode.id },
    data: { used: true }
  });

  return true;
}

export async function findOrCreateUser(email: string): Promise<{ id: string; name: string | null; roles: string[] }> {
  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, roles: true }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: email.split('@')[0],
        roles: []
      },
      select: { id: true, name: true, roles: true }
    });
  }

  return user;
}

export async function getUserPasskeys(userId: string) {
  return await prisma.passkey.findMany({
    where: { userId },
    orderBy: { lastUsed: 'desc' }
  });
}

export async function createPasskey(userId: string, credentialId: string, publicKey: string, name?: string) {
  return await prisma.passkey.create({
    data: {
      userId,
      credentialId,
      publicKey,
      name,
      counter: 0
    }
  });
}

export async function getPasskeyByCredentialId(credentialId: string) {
  return await prisma.passkey.findUnique({
    where: { credentialId },
    include: { user: true }
  });
}

export async function updatePasskeyCounter(credentialId: string, counter: number) {
  return await prisma.passkey.update({
    where: { credentialId },
    data: { 
      counter,
      lastUsed: new Date()
    }
  });
}

export async function auth(): Promise<{ user: SessionPayload } | null> {
  try {
    // LOCAL_API bypass for testing (similar to ProposalHub approach)
    if (process.env.LOCAL_API === 'true') {
      console.log('[LOCAL_API] Bypassing authentication for localhost testing');
      
      // Find or create a real test user from the database to use
      try {
        let testUser = await prisma.user.findFirst({
          where: { 
            OR: [
              { email: { contains: 'test' } },
              { email: { contains: 'simple-campaign-test' } },
              { email: 'localhost@test.com' }
            ]
          },
          select: { id: true, email: true, roles: true },
          orderBy: { createdAt: 'desc' } // Get the most recent test user
        });
        
        // If no test user exists, create one
        if (!testUser) {
          console.log('[LOCAL_API] Creating default test user for local development');
          testUser = await prisma.user.create({
            data: {
              email: 'localhost@test.com',
              name: 'Local Test User',
              roles: ['user', 'admin']
            },
            select: { id: true, email: true, roles: true }
          });
        }
        
        console.log('[LOCAL_API] Using test user:', testUser.id);
        return {
          user: {
            id: testUser.id,
            userId: testUser.id,
            email: testUser.email,
            roles: testUser.roles || ['user', 'admin'],
            iat: Date.now(),
            exp: Date.now() + 7 * 24 * 60 * 60 * 1000
          } as SessionPayload
        };
      } catch (dbError) {
        console.error('[LOCAL_API] Database error:', dbError);
        // Return null if database is not available
        return null;
      }
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return null;
    }

    const payload = await verifySession(sessionToken);
    if (!payload) {
      return null;
    }

    return { user: payload };
  } catch (error) {
    return null;
  }
}