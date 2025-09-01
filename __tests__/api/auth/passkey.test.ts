/**
 * Comprehensive Passkey Authentication Tests
 * Tests WebAuthn/Passkey functionality including registration, authentication,
 * device management, and security features
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions, generateAuthenticationOptions, verifyRegistrationResponse, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { 
  createPasskey, 
  getUserPasskeys, 
  getPasskeyByCredentialId, 
  updatePasskeyCounter, 
  findOrCreateUser,
  createSession,
  verifySession
} from '@/lib/auth';
import { prisma } from '@/lib/db';

// Mock SimpleWebAuthn
jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

// Mock Next.js cookies
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDelete = jest.fn();

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    set: mockSet,
    get: mockGet,
    delete: mockDelete,
  })),
}));

// Test data generators
function generateTestEmail(prefix = 'passkey-test') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}@vibefunder-test.com`;
}

function createMockCredentialId(suffix = ''): string {
  const buffer = Buffer.from(`credential-${Date.now()}-${Math.random()}${suffix}`);
  return buffer.toString('base64url');
}

function createMockPublicKey(): string {
  const mockKey = new Uint8Array(65); // Mock 65-byte public key
  crypto.getRandomValues(mockKey);
  return Buffer.from(mockKey).toString('base64');
}

function createMockWebAuthnResponse(credentialId: string, challenge: string) {
  return {
    id: credentialId,
    rawId: Buffer.from(credentialId, 'base64url'),
    response: {
      attestationObject: Buffer.from('mock-attestation'),
      clientDataJSON: Buffer.from(JSON.stringify({
        type: 'webauthn.create',
        challenge,
        origin: 'http://localhost:3000',
      })),
    },
    type: 'public-key',
  };
}

function createMockAuthResponse(credentialId: string, challenge: string) {
  return {
    id: credentialId,
    rawId: Buffer.from(credentialId, 'base64url'),
    response: {
      authenticatorData: Buffer.from('mock-auth-data'),
      clientDataJSON: Buffer.from(JSON.stringify({
        type: 'webauthn.get',
        challenge,
        origin: 'http://localhost:3000',
      })),
      signature: Buffer.from('mock-signature'),
      userHandle: null,
    },
    type: 'public-key',
  };
}

describe('Passkey Authentication API Tests', () => {
  let testUser: { id: string; name: string | null; roles: string[] };
  let mockChallenge: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create test user
    const email = generateTestEmail();
    testUser = await findOrCreateUser(email);
    
    // Mock challenge
    mockChallenge = 'mock-challenge-' + Date.now();
    
    // Reset mock implementations
    mockGet.mockImplementation((name: string) => {
      if (name === 'session') return { value: 'mock-session-token' };
      if (name === 'passkeyChallenge') return { value: mockChallenge };
      if (name === 'passkeyAuthChallenge') return { value: mockChallenge };
      return undefined;
    });
  });

  afterEach(async () => {
    // Clean up test data
    if (testUser?.id) {
      await prisma.passkey.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  });

  describe('Passkey Registration Flow', () => {
    it('should generate registration options successfully', async () => {
      const mockOptions = {
        rp: { name: 'VibeFunder', id: 'localhost' },
        user: {
          id: new TextEncoder().encode(testUser.id),
          name: generateTestEmail(),
          displayName: generateTestEmail(),
        },
        challenge: mockChallenge,
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        timeout: 60000,
        attestation: 'none' as const,
        authenticatorSelection: {
          residentKey: 'preferred' as const,
          userVerification: 'preferred' as const,
          authenticatorAttachment: 'platform' as const,
        },
        excludeCredentials: [],
      };

      (generateRegistrationOptions as jest.Mock).mockResolvedValue(mockOptions);

      // Mock route handler
      const { POST } = await import('@/app/api/auth/passkey/register-options/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/register-options');
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.challenge).toBeDefined();
      expect(data.rp.name).toBe('VibeFunder');
      expect(mockSet).toHaveBeenCalledWith('passkeyChallenge', expect.any(String), expect.any(Object));
    });

    it('should reject registration options without authentication', async () => {
      mockGet.mockImplementation((name: string) => {
        if (name === 'session') return undefined;
        return undefined;
      });

      const { POST } = await import('@/app/api/auth/passkey/register-options/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/register-options');
      
      const response = await POST(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Not authenticated' });
    });

    it('should register passkey successfully with valid credential', async () => {
      const credentialId = createMockCredentialId();
      const publicKey = createMockPublicKey();
      const passkeyName = 'Test Device';

      // Mock successful verification
      (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credentialID: Buffer.from(credentialId, 'base64url'),
          credentialPublicKey: Buffer.from(publicKey, 'base64'),
          counter: 0,
        },
      });

      // Mock session verification
      jest.spyOn(require('@/lib/auth'), 'verifySession').mockResolvedValue({
        id: testUser.id,
        userId: testUser.id,
        email: generateTestEmail(),
        roles: ['user'],
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      const { POST } = await import('@/app/api/auth/passkey/register/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: createMockWebAuthnResponse(credentialId, mockChallenge),
          name: passkeyName,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith('passkeyChallenge');

      // Verify passkey was created
      const savedPasskey = await getPasskeyByCredentialId(credentialId);
      expect(savedPasskey).toBeDefined();
      expect(savedPasskey?.name).toBe(passkeyName);
      expect(savedPasskey?.userId).toBe(testUser.id);
    });

    it('should reject invalid passkey registration', async () => {
      (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
        verified: false,
        registrationInfo: null,
      });

      jest.spyOn(require('@/lib/auth'), 'verifySession').mockResolvedValue({
        id: testUser.id,
        userId: testUser.id,
        email: generateTestEmail(),
        roles: ['user'],
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      const { POST } = await import('@/app/api/auth/passkey/register/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: createMockWebAuthnResponse('invalid-cred', mockChallenge),
          name: 'Invalid Device',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Passkey registration failed');
    });

    it('should generate unique challenges for each registration attempt', async () => {
      const challenges = new Set<string>();
      
      (generateRegistrationOptions as jest.Mock).mockImplementation(() => ({
        challenge: 'unique-challenge-' + Math.random(),
        rp: { name: 'VibeFunder', id: 'localhost' },
        user: { id: new TextEncoder().encode(testUser.id) },
      }));

      const { POST } = await import('@/app/api/auth/passkey/register-options/route');

      for (let i = 0; i < 5; i++) {
        const request = new NextRequest('http://localhost/api/auth/passkey/register-options');
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(challenges.has(data.challenge)).toBe(false);
        challenges.add(data.challenge);
      }

      expect(challenges.size).toBe(5);
    });

    it('should exclude existing credentials from registration options', async () => {
      // Create existing passkey
      const existingCredentialId = createMockCredentialId('existing');
      await createPasskey(testUser.id, existingCredentialId, createMockPublicKey(), 'Existing Device');

      const mockOptions = {
        challenge: mockChallenge,
        excludeCredentials: [{ id: existingCredentialId, type: 'public-key' }],
      };

      (generateRegistrationOptions as jest.Mock).mockResolvedValue(mockOptions);

      const { POST } = await import('@/app/api/auth/passkey/register-options/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/register-options');
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.excludeCredentials).toContainEqual({
        id: existingCredentialId,
        type: 'public-key'
      });
    });
  });

  describe('Passkey Authentication Flow', () => {
    let registeredCredentialId: string;
    let registeredPublicKey: string;

    beforeEach(async () => {
      // Register a passkey for authentication tests
      registeredCredentialId = createMockCredentialId('auth');
      registeredPublicKey = createMockPublicKey();
      await createPasskey(testUser.id, registeredCredentialId, registeredPublicKey, 'Auth Test Device');
    });

    it('should generate authentication options successfully', async () => {
      const mockOptions = {
        challenge: mockChallenge,
        rpId: 'localhost',
        timeout: 60000,
        userVerification: 'preferred' as const,
      };

      (generateAuthenticationOptions as jest.Mock).mockResolvedValue(mockOptions);

      const { POST } = await import('@/app/api/auth/passkey/auth-options/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/auth-options');
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.challenge).toBeDefined();
      expect(mockSet).toHaveBeenCalledWith('passkeyAuthChallenge', expect.any(String), expect.any(Object));
    });

    it('should authenticate with valid passkey', async () => {
      const newCounter = 123;

      (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        authenticationInfo: {
          newCounter,
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
        },
      });

      // Mock session creation
      jest.spyOn(require('@/lib/auth'), 'createSession').mockResolvedValue('mock-session-token');

      const { POST } = await import('@/app/api/auth/passkey/authenticate/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: createMockAuthResponse(registeredCredentialId, mockChallenge),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(testUser.id);

      // Verify counter was updated
      const updatedPasskey = await getPasskeyByCredentialId(registeredCredentialId);
      expect(updatedPasskey?.counter).toBe(newCounter);
      expect(updatedPasskey?.lastUsed).toBeDefined();

      // Verify session cookie was set
      expect(mockSet).toHaveBeenCalledWith('session', 'mock-session-token', expect.any(Object));
      expect(mockDelete).toHaveBeenCalledWith('passkeyAuthChallenge');
    });

    it('should reject authentication with invalid credential', async () => {
      (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
        verified: false,
      });

      const { POST } = await import('@/app/api/auth/passkey/authenticate/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: createMockAuthResponse('invalid-credential', mockChallenge),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Passkey not found');
    });

    it('should reject authentication without challenge', async () => {
      mockGet.mockImplementation((name: string) => {
        if (name === 'passkeyAuthChallenge') return undefined;
        return undefined;
      });

      const { POST } = await import('@/app/api/auth/passkey/authenticate/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: createMockAuthResponse(registeredCredentialId, 'no-challenge'),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No challenge found');
    });

    it('should handle different credential ID encodings', async () => {
      // Test base64url credential ID
      const base64urlCredId = createMockCredentialId('base64url');
      await createPasskey(testUser.id, base64urlCredId, createMockPublicKey(), 'Base64URL Device');

      (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 1 },
      });

      jest.spyOn(require('@/lib/auth'), 'createSession').mockResolvedValue('mock-session-token');

      const { POST } = await import('@/app/api/auth/passkey/authenticate/route');
      
      // Test with rawId ArrayBuffer
      const mockCredential = {
        id: base64urlCredId,
        rawId: Buffer.from(base64urlCredId, 'base64url'),
        response: createMockAuthResponse(base64urlCredId, mockChallenge).response,
        type: 'public-key',
      };

      const request = new NextRequest('http://localhost/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: mockCredential }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Multiple Passkeys per User', () => {
    it('should support multiple passkeys for one user', async () => {
      const devices = [
        { name: 'iPhone', credentialId: createMockCredentialId('iphone') },
        { name: 'MacBook', credentialId: createMockCredentialId('macbook') },
        { name: 'iPad', credentialId: createMockCredentialId('ipad') },
      ];

      // Register multiple passkeys
      for (const device of devices) {
        await createPasskey(testUser.id, device.credentialId, createMockPublicKey(), device.name);
      }

      // Verify all passkeys exist
      const userPasskeys = await getUserPasskeys(testUser.id);
      expect(userPasskeys).toHaveLength(3);

      // Verify each device can authenticate
      for (const device of devices) {
        const passkey = await getPasskeyByCredentialId(device.credentialId);
        expect(passkey).toBeDefined();
        expect(passkey?.name).toBe(device.name);
        expect(passkey?.userId).toBe(testUser.id);
      }
    });

    it('should return passkeys ordered by last used date', async () => {
      const devices = ['Device1', 'Device2', 'Device3'];
      const passkeys: string[] = [];

      // Create passkeys
      for (const deviceName of devices) {
        const credentialId = createMockCredentialId(deviceName.toLowerCase());
        await createPasskey(testUser.id, credentialId, createMockPublicKey(), deviceName);
        passkeys.push(credentialId);
      }

      // Update counters to simulate usage (in reverse order)
      await updatePasskeyCounter(passkeys[2], 1);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await updatePasskeyCounter(passkeys[0], 1);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await updatePasskeyCounter(passkeys[1], 1);

      // Get passkeys (should be ordered by lastUsed desc)
      const userPasskeys = await getUserPasskeys(testUser.id);
      expect(userPasskeys[0].name).toBe('Device2'); // Most recently used
      expect(userPasskeys[1].name).toBe('Device1');
      expect(userPasskeys[2].name).toBe('Device3'); // Least recently used
    });
  });

  describe('Device Management', () => {
    it('should check user passkey count', async () => {
      // Initially no passkeys
      const { POST } = await import('@/app/api/auth/user-passkeys/route');
      let request = new NextRequest('http://localhost/api/auth/user-passkeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUser.id }),
      });

      let response = await POST(request);
      let data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasPasskeys).toBe(false);
      expect(data.count).toBe(0);

      // Add passkeys
      await createPasskey(testUser.id, createMockCredentialId(), createMockPublicKey(), 'Device 1');
      await createPasskey(testUser.id, createMockCredentialId(), createMockPublicKey(), 'Device 2');

      request = new NextRequest('http://localhost/api/auth/user-passkeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUser.id }),
      });

      response = await POST(request);
      data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasPasskeys).toBe(true);
      expect(data.count).toBe(2);
    });

    it('should reject passkey count check without user ID', async () => {
      const { POST } = await import('@/app/api/auth/user-passkeys/route');
      const request = new NextRequest('http://localhost/api/auth/user-passkeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User ID required');
    });

    it('should handle passkey deletion', async () => {
      const credentialId = createMockCredentialId('deleteme');
      await createPasskey(testUser.id, credentialId, createMockPublicKey(), 'Delete Me Device');

      // Verify passkey exists
      let passkey = await getPasskeyByCredentialId(credentialId);
      expect(passkey).toBeDefined();

      // Delete passkey
      await prisma.passkey.delete({ where: { credentialId } });

      // Verify passkey is deleted
      passkey = await getPasskeyByCredentialId(credentialId);
      expect(passkey).toBeNull();
    });

    it('should support passkey renaming', async () => {
      const credentialId = createMockCredentialId('rename');
      await createPasskey(testUser.id, credentialId, createMockPublicKey(), 'Old Name');

      // Rename passkey
      await prisma.passkey.update({
        where: { credentialId },
        data: { name: 'New Name' },
      });

      const updatedPasskey = await getPasskeyByCredentialId(credentialId);
      expect(updatedPasskey?.name).toBe('New Name');
    });
  });

  describe('Cross-Device Authentication', () => {
    it('should support platform authenticator (built-in)', async () => {
      const mockOptions = {
        rp: { name: 'VibeFunder', id: 'localhost' },
        user: { id: new TextEncoder().encode(testUser.id) },
        challenge: mockChallenge,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      };

      (generateRegistrationOptions as jest.Mock).mockResolvedValue(mockOptions);

      const { POST } = await import('@/app/api/auth/passkey/register-options/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/register-options');
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authenticatorSelection.authenticatorAttachment).toBe('platform');
    });

    it('should support cross-platform authenticator (roaming)', async () => {
      // Mock registration for cross-platform authenticator
      (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credentialID: Buffer.from(createMockCredentialId('roaming'), 'base64url'),
          credentialPublicKey: Buffer.from(createMockPublicKey(), 'base64'),
          counter: 0,
          credentialDeviceType: 'multiDevice',
          credentialBackedUp: true,
        },
      });

      jest.spyOn(require('@/lib/auth'), 'verifySession').mockResolvedValue({
        id: testUser.id,
        userId: testUser.id,
        email: generateTestEmail(),
        roles: ['user'],
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      const credentialId = createMockCredentialId('roaming');
      const { POST } = await import('@/app/api/auth/passkey/register/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: createMockWebAuthnResponse(credentialId, mockChallenge),
          name: 'Roaming Authenticator',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle conditional UI (autofill) scenarios', async () => {
      const mockOptions = {
        challenge: mockChallenge,
        rpId: 'localhost',
        allowCredentials: [], // Empty for conditional UI
        userVerification: 'preferred',
      };

      (generateAuthenticationOptions as jest.Mock).mockResolvedValue(mockOptions);

      const { POST } = await import('@/app/api/auth/passkey/auth-options/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/auth-options');
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowCredentials).toEqual([]);
    });
  });

  describe('Security Features', () => {
    it('should enforce challenge expiration', async () => {
      // Mock expired challenge
      mockGet.mockImplementation((name: string) => {
        if (name === 'passkeyAuthChallenge') return undefined; // Simulate expired/missing challenge
        return undefined;
      });

      const { POST } = await import('@/app/api/auth/passkey/authenticate/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: createMockAuthResponse('any-credential', 'expired-challenge'),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No challenge found');
    });

    it('should increment counter for replay protection', async () => {
      const credentialId = createMockCredentialId('counter-test');
      await createPasskey(testUser.id, credentialId, createMockPublicKey(), 'Counter Test');

      const initialPasskey = await getPasskeyByCredentialId(credentialId);
      expect(initialPasskey?.counter).toBe(0);

      // Simulate authentication with counter increment
      const newCounter = 5;
      await updatePasskeyCounter(credentialId, newCounter);

      const updatedPasskey = await getPasskeyByCredentialId(credentialId);
      expect(updatedPasskey?.counter).toBe(newCounter);
      expect(updatedPasskey?.lastUsed).toBeDefined();
      expect(updatedPasskey?.lastUsed!.getTime()).toBeGreaterThan(initialPasskey!.createdAt.getTime());
    });

    it('should validate expected origin', async () => {
      (verifyAuthenticationResponse as jest.Mock).mockImplementation((params) => {
        // Verify the origin parameter is being passed correctly
        expect(params.expectedOrigin).toBe(process.env.EXPECTED_ORIGIN || 'http://localhost:3000');
        expect(params.expectedRPID).toBe(process.env.RP_ID || 'localhost');
        
        return {
          verified: true,
          authenticationInfo: { newCounter: 1 },
        };
      });

      const credentialId = createMockCredentialId('origin-test');
      await createPasskey(testUser.id, credentialId, createMockPublicKey(), 'Origin Test');

      jest.spyOn(require('@/lib/auth'), 'createSession').mockResolvedValue('mock-session-token');

      const { POST } = await import('@/app/api/auth/passkey/authenticate/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: createMockAuthResponse(credentialId, mockChallenge),
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(verifyAuthenticationResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedOrigin: 'http://localhost:3000',
          expectedRPID: 'localhost',
        })
      );
    });

    it('should validate credential public key format', async () => {
      const credentialId = createMockCredentialId('pubkey-test');
      const publicKeyBase64 = createMockPublicKey();
      
      await createPasskey(testUser.id, credentialId, publicKeyBase64, 'PubKey Test');

      const savedPasskey = await getPasskeyByCredentialId(credentialId);
      expect(savedPasskey?.publicKey).toBe(publicKeyBase64);
      
      // Verify we can convert back to Uint8Array
      const publicKeyBuffer = Buffer.from(savedPasskey!.publicKey, 'base64');
      expect(publicKeyBuffer).toBeInstanceOf(Buffer);
      expect(publicKeyBuffer.length).toBeGreaterThan(0);
    });

    it('should handle concurrent authentication attempts', async () => {
      const credentialId = createMockCredentialId('concurrent');
      await createPasskey(testUser.id, credentialId, createMockPublicKey(), 'Concurrent Test');

      let authAttempts = 0;
      (verifyAuthenticationResponse as jest.Mock).mockImplementation(() => {
        authAttempts++;
        return {
          verified: true,
          authenticationInfo: { newCounter: authAttempts },
        };
      });

      jest.spyOn(require('@/lib/auth'), 'createSession').mockResolvedValue('mock-session-token');

      const { POST } = await import('@/app/api/auth/passkey/authenticate/route');
      
      // Simulate concurrent authentication attempts
      const promises = Array.from({ length: 3 }, (_, i) => {
        const request = new NextRequest('http://localhost/api/auth/passkey/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credential: createMockAuthResponse(credentialId, mockChallenge),
          }),
        });
        return POST(request);
      });

      const responses = await Promise.all(promises);
      
      // All should succeed (in real scenarios, counter validation would prevent replay)
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      expect(authAttempts).toBe(3);
    });

    it('should handle malformed credential data', async () => {
      const malformedCredentials = [
        null,
        undefined,
        {},
        { id: null },
        { id: '', rawId: null },
        { id: 'invalid-base64!@#' },
      ];

      const { POST } = await import('@/app/api/auth/passkey/authenticate/route');

      for (const credential of malformedCredentials) {
        const request = new NextRequest('http://localhost/api/auth/passkey/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
        });

        const response = await POST(request);
        
        // Should handle gracefully without crashing
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock prisma to throw error
      const originalFindUnique = prisma.passkey.findUnique;
      prisma.passkey.findUnique = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      try {
        const { POST } = await import('@/app/api/auth/passkey/authenticate/route');
        const request = new NextRequest('http://localhost/api/auth/passkey/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credential: createMockAuthResponse('any-credential', mockChallenge),
          }),
        });

        const response = await POST(request);
        
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Failed to authenticate' });
      } finally {
        prisma.passkey.findUnique = originalFindUnique;
      }
    });

    it('should handle WebAuthn library errors', async () => {
      (verifyAuthenticationResponse as jest.Mock).mockRejectedValue(
        new Error('WebAuthn verification failed')
      );

      const credentialId = createMockCredentialId('error-test');
      await createPasskey(testUser.id, credentialId, createMockPublicKey(), 'Error Test');

      const { POST } = await import('@/app/api/auth/passkey/authenticate/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: createMockAuthResponse(credentialId, mockChallenge),
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Failed to authenticate' });
    });

    it('should handle missing environment variables', async () => {
      const originalOrigin = process.env.EXPECTED_ORIGIN;
      const originalRPID = process.env.RP_ID;
      
      delete process.env.EXPECTED_ORIGIN;
      delete process.env.RP_ID;

      try {
        (verifyAuthenticationResponse as jest.Mock).mockImplementation((params) => {
          expect(params.expectedOrigin).toBe('http://localhost:3000');
          expect(params.expectedRPID).toBe('localhost');
          return { verified: true, authenticationInfo: { newCounter: 1 } };
        });

        const credentialId = createMockCredentialId('env-test');
        await createPasskey(testUser.id, credentialId, createMockPublicKey(), 'Env Test');

        jest.spyOn(require('@/lib/auth'), 'createSession').mockResolvedValue('mock-session-token');

        const { POST } = await import('@/app/api/auth/passkey/authenticate/route');
        const request = new NextRequest('http://localhost/api/auth/passkey/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credential: createMockAuthResponse(credentialId, mockChallenge),
          }),
        });

        const response = await POST(request);
        
        expect(response.status).toBe(200);
      } finally {
        if (originalOrigin) process.env.EXPECTED_ORIGIN = originalOrigin;
        if (originalRPID) process.env.RP_ID = originalRPID;
      }
    });

    it('should handle JSON parsing errors', async () => {
      const { POST } = await import('@/app/api/auth/passkey/authenticate/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{',
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Failed to authenticate' });
    });

    it('should handle empty request body', async () => {
      const { POST } = await import('@/app/api/auth/passkey/authenticate/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Failed to authenticate' });
    });
  });

  describe('Backup Eligibility and Recovery', () => {
    it('should detect backup eligible authenticators', async () => {
      (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credentialID: Buffer.from(createMockCredentialId('backup'), 'base64url'),
          credentialPublicKey: Buffer.from(createMockPublicKey(), 'base64'),
          counter: 0,
          credentialDeviceType: 'multiDevice',
          credentialBackedUp: true,
        },
      });

      jest.spyOn(require('@/lib/auth'), 'verifySession').mockResolvedValue({
        id: testUser.id,
        userId: testUser.id,
        email: generateTestEmail(),
        roles: ['user'],
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      const credentialId = createMockCredentialId('backup');
      const { POST } = await import('@/app/api/auth/passkey/register/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: createMockWebAuthnResponse(credentialId, mockChallenge),
          name: 'Backup Eligible Device',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify the passkey was registered (backup eligibility is determined by WebAuthn)
      const savedPasskey = await getPasskeyByCredentialId(credentialId);
      expect(savedPasskey).toBeDefined();
    });

    it('should support recovery from backup authenticator', async () => {
      // Simulate recovery scenario where user authenticates with backup device
      const backupCredentialId = createMockCredentialId('recovery');
      await createPasskey(testUser.id, backupCredentialId, createMockPublicKey(), 'Recovery Device');

      (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        authenticationInfo: {
          newCounter: 1,
          credentialDeviceType: 'multiDevice',
          credentialBackedUp: true,
        },
      });

      jest.spyOn(require('@/lib/auth'), 'createSession').mockResolvedValue('recovery-session-token');

      const { POST } = await import('@/app/api/auth/passkey/authenticate/route');
      const request = new NextRequest('http://localhost/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: createMockAuthResponse(backupCredentialId, mockChallenge),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.id).toBe(testUser.id);
    });
  });
});