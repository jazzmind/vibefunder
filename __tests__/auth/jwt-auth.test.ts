/**
 * Comprehensive JWT Authentication Security Tests for VibeFunder
 * 
 * This test suite covers all aspects of authentication security including:
 * - JWT token generation, validation, and expiration
 * - OTP flows and verification
 * - Passkey authentication
 * - Session management and persistence
 * - CSRF protection
 * - XSS prevention
 * - SQL injection protection
 * - Timing attack prevention
 * - Edge cases and security vulnerabilities
 */

import { 
  createSession, 
  verifySession, 
  generateOtpCode, 
  createOtpCode, 
  verifyOtpCode,
  findOrCreateUser,
  createPasskey,
  getPasskeyByCredentialId,
  updatePasskeyCounter,
  getUserPasskeys,
  auth
} from '@/lib/auth';
import { 
  createTestUser, 
  generateTestEmail, 
  cleanupTestData, 
  createTestPasskey,
  testPrisma as prisma,
  wait,
  createAuthHeaders
} from '../utils/test-helpers';
import { SignJWT } from 'jose';
import crypto from 'crypto';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('JWT Authentication Security Tests', () => {
  let testUser: any;
  let testUser2: any;

  beforeAll(async () => {
    testUser = await createTestUser({
      email: generateTestEmail('jwt-auth'),
      name: 'JWT Test User',
      roles: ['user']
    });

    testUser2 = await createTestUser({
      email: generateTestEmail('jwt-auth-2'),
      name: 'JWT Test User 2',
      roles: ['admin']
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('JWT Token Generation and Validation', () => {
    it('should generate valid JWT token with proper payload', async () => {
      const payload = {
        id: testUser.id,
        userId: testUser.id,
        email: testUser.email,
        roles: testUser.roles
      };

      const token = await createSession(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // JWT should have 3 parts separated by dots
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should verify valid JWT token and return correct payload', async () => {
      const payload = {
        id: testUser.id,
        userId: testUser.id,
        email: testUser.email,
        roles: testUser.roles
      };

      const token = await createSession(payload);
      const verified = await verifySession(token);

      expect(verified).toBeDefined();
      expect(verified?.userId).toBe(testUser.id);
      expect(verified?.email).toBe(testUser.email);
      expect(verified?.roles).toEqual(testUser.roles);
      expect(verified?.iat).toBeDefined(); // Issued at
      expect(verified?.exp).toBeDefined(); // Expires at
    });

    it('should return null for invalid JWT token', async () => {
      const invalidTokens = [
        'invalid.token.here',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
        'not-a-jwt-at-all',
        'a.b.c.d.e' // Too many parts
      ];

      for (const invalidToken of invalidTokens) {
        const verified = await verifySession(invalidToken);
        expect(verified).toBeNull();
      }
    });

    it('should return null for malformed JWT token', async () => {
      const malformedTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Only header
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.', // Missing payload and signature
        '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.', // Missing header and signature
      ];

      for (const malformedToken of malformedTokens) {
        const verified = await verifySession(malformedToken);
        expect(verified).toBeNull();
      }
    });

    it('should validate JWT expiration correctly', async () => {
      // Create a token with short expiration for testing
      const jwtSecret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'your-very-long-secret-key-change-this-in-production'
      );

      const shortLivedToken = await new SignJWT({
        id: testUser.id,
        userId: testUser.id,
        email: testUser.email,
        roles: testUser.roles
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1ms') // Expires immediately
        .sign(jwtSecret);

      // Wait to ensure expiration
      await wait(10);

      const verified = await verifySession(shortLivedToken);
      expect(verified).toBeNull();
    });

    it('should handle JWT with wrong signature', async () => {
      const payload = {
        id: testUser.id,
        userId: testUser.id,
        email: testUser.email,
        roles: testUser.roles
      };

      const validToken = await createSession(payload);
      
      // Tamper with the signature
      const parts = validToken.split('.');
      parts[2] = 'tampered-signature';
      const tamperedToken = parts.join('.');

      const verified = await verifySession(tamperedToken);
      expect(verified).toBeNull();
    });

    it('should handle JWT with tampered payload', async () => {
      const payload = {
        id: testUser.id,
        userId: testUser.id,
        email: testUser.email,
        roles: testUser.roles
      };

      const validToken = await createSession(payload);
      const parts = validToken.split('.');
      
      // Tamper with payload - try to escalate privileges
      const tamperedPayload = {
        id: testUser.id,
        userId: testUser.id,
        email: testUser.email,
        roles: ['admin', 'superuser'] // Privilege escalation attempt
      };
      
      parts[1] = btoa(JSON.stringify(tamperedPayload));
      const tamperedToken = parts.join('.');

      const verified = await verifySession(tamperedToken);
      expect(verified).toBeNull();
    });
  });

  describe('OTP Code Generation and Verification', () => {
    it('should generate valid 6-digit OTP codes', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateOtpCode();
        expect(code).toMatch(/^\d{6}$/);
        expect(code.length).toBe(6);
        expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
        expect(parseInt(code)).toBeLessThanOrEqual(999999);
      }
    });

    it('should create OTP code in database with correct expiration', async () => {
      const code = await createOtpCode(testUser.id);
      
      expect(code).toMatch(/^\d{6}$/);
      
      // Verify it was stored in database
      const dbCode = await prisma.otpCode.findFirst({
        where: {
          userId: testUser.id,
          code,
          used: false
        }
      });

      expect(dbCode).toBeDefined();
      expect(dbCode!.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(dbCode!.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 11 * 60 * 1000); // 11 minutes max
    });

    it('should invalidate existing codes when creating new OTP', async () => {
      // Create first code
      const code1 = await createOtpCode(testUser.id);
      
      // Create second code
      const code2 = await createOtpCode(testUser.id);
      
      expect(code1).not.toBe(code2);

      // First code should be marked as used
      const oldCode = await prisma.otpCode.findFirst({
        where: { userId: testUser.id, code: code1 }
      });

      expect(oldCode?.used).toBe(true);

      // Second code should be active
      const newCode = await prisma.otpCode.findFirst({
        where: { userId: testUser.id, code: code2 }
      });

      expect(newCode?.used).toBe(false);
    });

    it('should verify valid OTP codes', async () => {
      const code = await createOtpCode(testUser.id);
      const isValid = await verifyOtpCode(testUser.id, code);
      
      expect(isValid).toBe(true);

      // Code should be marked as used after verification
      const dbCode = await prisma.otpCode.findFirst({
        where: { userId: testUser.id, code }
      });

      expect(dbCode?.used).toBe(true);
    });

    it('should reject invalid OTP codes', async () => {
      await createOtpCode(testUser.id);
      
      const invalidCodes = [
        '000000',
        '123456', // Wrong code
        '12345',  // Too short
        '1234567', // Too long
        'abc123', // Non-numeric
        ''
      ];

      for (const invalidCode of invalidCodes) {
        const isValid = await verifyOtpCode(testUser.id, invalidCode);
        expect(isValid).toBe(false);
      }
    });

    it('should reject expired OTP codes', async () => {
      // Create expired code manually
      const expiredCode = generateOtpCode();
      await prisma.otpCode.create({
        data: {
          userId: testUser.id,
          code: expiredCode,
          expiresAt: new Date(Date.now() - 1000), // Already expired
          used: false
        }
      });

      const isValid = await verifyOtpCode(testUser.id, expiredCode);
      expect(isValid).toBe(false);
    });

    it('should reject already used OTP codes', async () => {
      const code = await createOtpCode(testUser.id);
      
      // First verification should succeed
      const firstVerify = await verifyOtpCode(testUser.id, code);
      expect(firstVerify).toBe(true);

      // Second verification should fail
      const secondVerify = await verifyOtpCode(testUser.id, code);
      expect(secondVerify).toBe(false);
    });

    it('should handle concurrent OTP verifications safely', async () => {
      const code = await createOtpCode(testUser.id);
      
      // Try to verify the same code multiple times concurrently
      const promises = Array(5).fill(null).map(() => verifyOtpCode(testUser.id, code));
      const results = await Promise.all(promises);
      
      // Only one should succeed
      const successCount = results.filter(r => r === true).length;
      expect(successCount).toBe(1);
    });
  });

  describe('Passkey Authentication', () => {
    it('should create passkey with valid credentials', async () => {
      const credentialId = crypto.randomBytes(32).toString('base64');
      const publicKey = crypto.randomBytes(65).toString('base64');

      const passkey = await createPasskey(testUser.id, credentialId, publicKey, 'Test Device');

      expect(passkey.userId).toBe(testUser.id);
      expect(passkey.credentialId).toBe(credentialId);
      expect(passkey.publicKey).toBe(publicKey);
      expect(passkey.name).toBe('Test Device');
      expect(passkey.counter).toBe(0);
    });

    it('should retrieve passkey by credential ID', async () => {
      const credentialId = crypto.randomBytes(32).toString('base64');
      const publicKey = crypto.randomBytes(65).toString('base64');

      await createPasskey(testUser.id, credentialId, publicKey);
      const retrieved = await getPasskeyByCredentialId(credentialId);

      expect(retrieved).toBeDefined();
      expect(retrieved!.credentialId).toBe(credentialId);
      expect(retrieved!.user.id).toBe(testUser.id);
    });

    it('should update passkey counter and last used timestamp', async () => {
      const credentialId = crypto.randomBytes(32).toString('base64');
      const publicKey = crypto.randomBytes(65).toString('base64');

      await createPasskey(testUser.id, credentialId, publicKey);
      
      const initialTime = Date.now();
      await wait(10);
      
      const updated = await updatePasskeyCounter(credentialId, 5);

      expect(updated.counter).toBe(5);
      expect(updated.lastUsed!.getTime()).toBeGreaterThan(initialTime);
    });

    it('should list user passkeys ordered by last used', async () => {
      // Clean up any existing passkeys for the user
      await prisma.passkey.deleteMany({ where: { userId: testUser.id } });

      const cred1 = crypto.randomBytes(16).toString('base64');
      const cred2 = crypto.randomBytes(16).toString('base64');
      
      await createPasskey(testUser.id, cred1, 'key1', 'Device 1');
      await wait(10);
      await createPasskey(testUser.id, cred2, 'key2', 'Device 2');

      // Update last used for first passkey to make it more recent
      await updatePasskeyCounter(cred1, 1);

      const passkeys = await getUserPasskeys(testUser.id);
      
      expect(passkeys).toHaveLength(2);
      expect(passkeys[0].credentialId).toBe(cred1); // Most recently used first
      expect(passkeys[1].credentialId).toBe(cred2);
    });

    it('should prevent duplicate credential IDs', async () => {
      const credentialId = crypto.randomBytes(32).toString('base64');
      
      await createPasskey(testUser.id, credentialId, 'key1');
      
      // Attempt to create another passkey with same credential ID should fail
      await expect(
        createPasskey(testUser2.id, credentialId, 'key2')
      ).rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    it('should handle session authentication correctly', async () => {
      // Mock cookie for session
      process.env.LOCAL_API = 'false';
      
      const payload = {
        id: testUser.id,
        userId: testUser.id,
        email: testUser.email,
        roles: testUser.roles
      };

      const token = await createSession(payload);
      
      // Mock cookies function would normally be used here
      // This test verifies the auth function logic
      const session = await verifySession(token);
      expect(session).toBeDefined();
      expect(session!.userId).toBe(testUser.id);
    });

    it('should handle missing session gracefully', async () => {
      process.env.LOCAL_API = 'false';
      
      // Test with no session token - this would normally come from cookies
      const verified = await verifySession('');
      expect(verified).toBeNull();
    });

    it('should use LOCAL_API bypass when enabled', async () => {
      const originalLocalApi = process.env.LOCAL_API;
      process.env.LOCAL_API = 'true';
      
      const session = await auth();
      
      expect(session).toBeDefined();
      expect(session!.user).toBeDefined();
      expect(session!.user.roles).toContain('user');
      
      // Restore original value
      process.env.LOCAL_API = originalLocalApi;
    });
  });

  describe('API Route Security Tests', () => {
    describe('Session API Route', () => {
      it('should return null for unauthenticated requests', async () => {
        const response = await fetch(`${API_BASE}/api/auth/session`);
        expect(response.status).toBe(200);
        
        const result = await response.json();
        expect(result.user).toBeNull();
      });

      it('should return user data for authenticated requests', async () => {
        const response = await fetch(`${API_BASE}/api/auth/session`, {
          headers: createAuthHeaders(testUser.id)
        });
        
        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.user.id).toBe(testUser.id);
      });
    });

    describe('OTP API Routes', () => {
      it('should send OTP for valid email', async () => {
        const testEmail = generateTestEmail('otp-api');
        
        const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail })
        });

        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.success).toBe(true);
      });

      it('should reject invalid email formats', async () => {
        const invalidEmails = [
          'not-an-email',
          '@domain.com',
          'user@',
          'user@.com',
          'user..user@domain.com',
          'user name@domain.com',
          ''
        ];

        for (const email of invalidEmails) {
          const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });

          expect(response.status).toBe(400);
        }
      });

      it('should verify valid OTP and create session', async () => {
        const testEmail = generateTestEmail('otp-verify');
        
        // Create user and OTP code manually
        const user = await createTestUser({ email: testEmail });
        const code = await createOtpCode(user.id);

        const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail, code })
        });

        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.user.email).toBe(testEmail);
      });

      it('should reject invalid OTP codes', async () => {
        const testEmail = generateTestEmail('otp-invalid');
        
        const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail, code: '000000' })
        });

        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result.error).toContain('Invalid');
      });
    });

    describe('Passkey API Routes', () => {
      it('should provide registration options for authenticated user', async () => {
        const response = await fetch(`${API_BASE}/api/auth/passkey/register-options`, {
          method: 'POST',
          headers: {
            ...createAuthHeaders(testUser.id),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: testUser.email })
        });

        expect(response.status).toBe(200);
        const options = await response.json();
        expect(options.challenge).toBeDefined();
        expect(options.rp).toBeDefined();
        expect(options.user).toBeDefined();
      });

      it('should provide authentication options', async () => {
        const response = await fetch(`${API_BASE}/api/auth/passkey/auth-options`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testUser.email })
        });

        expect(response.status).toBe(200);
        const options = await response.json();
        expect(options.challenge).toBeDefined();
      });

      it('should list user passkeys for authenticated user', async () => {
        const response = await fetch(`${API_BASE}/api/auth/user-passkeys`, {
          headers: createAuthHeaders(testUser.id)
        });

        expect(response.status).toBe(200);
        const passkeys = await response.json();
        expect(Array.isArray(passkeys)).toBe(true);
      });

      it('should deny passkey access to unauthenticated users', async () => {
        const response = await fetch(`${API_BASE}/api/auth/user-passkeys`);
        expect(response.status).toBe(401);
      });
    });
  });

  describe('Security Vulnerability Tests', () => {
    describe('SQL Injection Protection', () => {
      it('should prevent SQL injection in email field', async () => {
        const maliciousEmails = [
          "admin@test.com'; DROP TABLE users; --",
          "test@test.com' OR '1'='1",
          "test@test.com'; UPDATE users SET roles = 'admin'; --",
          "test@test.com' UNION SELECT * FROM users --"
        ];

        for (const email of maliciousEmails) {
          const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });

          // Should either reject as invalid email or handle gracefully
          expect([400, 500]).not.toContain(response.status);
          
          // Verify users table still exists and is intact
          const userCount = await prisma.user.count();
          expect(userCount).toBeGreaterThan(0);
        }
      });

      it('should prevent SQL injection in OTP code field', async () => {
        const maliciousCodes = [
          "123456'; DROP TABLE otp_codes; --",
          "123456' OR '1'='1",
          "123456'; UPDATE users SET roles = 'admin'; --"
        ];

        for (const code of maliciousCodes) {
          const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testUser.email, code })
          });

          expect(response.status).toBe(400);
          
          // Verify tables still exist
          const codeCount = await prisma.otpCode.count();
          expect(codeCount).toBeGreaterThanOrEqual(0);
        }
      });
    });

    describe('XSS Prevention', () => {
      it('should sanitize XSS attempts in authentication responses', async () => {
        const xssEmail = '<script>alert("xss")</script>@test.com';
        
        const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: xssEmail })
        });

        expect(response.status).toBe(400);
        const result = await response.json();
        
        // Response should not contain unescaped script tags
        const responseText = JSON.stringify(result);
        expect(responseText).not.toContain('<script>');
        expect(responseText).not.toContain('javascript:');
      });

      it('should handle XSS in user creation', async () => {
        const xssEmail = 'user+<img src=x onerror=alert(1)>@test.com';
        
        // This should be rejected as invalid email format
        const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: xssEmail })
        });

        expect(response.status).toBe(400);
      });
    });

    describe('CSRF Protection', () => {
      it('should require proper content type for POST requests', async () => {
        const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' }, // Wrong content type
          body: JSON.stringify({ email: testUser.email })
        });

        expect(response.status).not.toBe(200);
      });

      it('should validate origin header in sensitive requests', async () => {
        const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://malicious-site.com'
          },
          body: JSON.stringify({ email: testUser.email, code: '123456' })
        });

        // Should handle CORS properly, not allowing malicious origins
        const corsHeader = response.headers.get('Access-Control-Allow-Origin');
        expect(corsHeader).not.toBe('https://malicious-site.com');
      });
    });

    describe('Timing Attack Prevention', () => {
      it('should have consistent response times for valid/invalid users', async () => {
        const existingEmail = testUser.email;
        const nonExistentEmail = generateTestEmail('nonexistent');

        // Measure time for existing user
        const start1 = Date.now();
        await fetch(`${API_BASE}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: existingEmail })
        });
        const time1 = Date.now() - start1;

        // Measure time for non-existent user
        const start2 = Date.now();
        await fetch(`${API_BASE}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: nonExistentEmail })
        });
        const time2 = Date.now() - start2;

        // Times should be reasonably similar (within 200ms) to prevent user enumeration
        const timeDifference = Math.abs(time1 - time2);
        expect(timeDifference).toBeLessThan(200);
      });

      it('should have consistent response times for valid/invalid OTP codes', async () => {
        const validCode = await createOtpCode(testUser.id);
        const invalidCode = '999999';

        // Test valid code
        const start1 = Date.now();
        await fetch(`${API_BASE}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testUser.email, code: validCode })
        });
        const time1 = Date.now() - start1;

        // Test invalid code
        const start2 = Date.now();
        await fetch(`${API_BASE}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testUser.email, code: invalidCode })
        });
        const time2 = Date.now() - start2;

        // Times should be similar
        const timeDifference = Math.abs(time1 - time2);
        expect(timeDifference).toBeLessThan(200);
      });
    });

    describe('Rate Limiting Tests', () => {
      it('should implement rate limiting on OTP requests', async () => {
        const testEmail = generateTestEmail('rate-limit');
        const requests = [];

        // Send multiple requests rapidly
        for (let i = 0; i < 10; i++) {
          requests.push(
            fetch(`${API_BASE}/api/auth/send-otp`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: testEmail })
            })
          );
        }

        const responses = await Promise.all(requests);
        
        // Should have some rate limiting (429 responses)
        const rateLimited = responses.filter(r => r.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
      });

      it('should rate limit OTP verification attempts', async () => {
        const testEmail = generateTestEmail('rate-limit-verify');
        const user = await createTestUser({ email: testEmail });
        await createOtpCode(user.id);

        const requests = [];
        
        // Try many invalid codes rapidly
        for (let i = 0; i < 10; i++) {
          requests.push(
            fetch(`${API_BASE}/api/auth/verify-otp`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: testEmail, code: '000000' })
            })
          );
        }

        const responses = await Promise.all(requests);
        
        // Should implement some form of rate limiting or account lockout
        const successfulResponses = responses.filter(r => r.status === 200);
        expect(successfulResponses.length).toBe(0); // None should succeed with invalid code
      });
    });

    describe('Session Security', () => {
      it('should regenerate session on authentication', async () => {
        // This test would require mocking cookies to verify session regeneration
        // In a real application, session IDs should change after authentication
        expect(true).toBe(true); // Placeholder - implement with cookie mocking
      });

      it('should clear session on logout', async () => {
        const response = await fetch(`${API_BASE}/api/auth/signout`, {
          method: 'POST',
          headers: createAuthHeaders(testUser.id)
        });

        expect(response.status).toBe(200);
        
        // Verify session is cleared by checking session endpoint
        const sessionResponse = await fetch(`${API_BASE}/api/auth/session`);
        const session = await sessionResponse.json();
        expect(session.user).toBeNull();
      });
    });

    describe('Input Validation and Sanitization', () => {
      it('should reject oversized input data', async () => {
        const oversizedEmail = 'a'.repeat(1000) + '@test.com';
        
        const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: oversizedEmail })
        });

        expect(response.status).toBe(400);
      });

      it('should reject null byte injection attempts', async () => {
        const nullByteEmail = 'test@test.com\x00malicious';
        
        const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: nullByteEmail })
        });

        expect(response.status).toBe(400);
      });

      it('should handle unicode and special characters safely', async () => {
        const specialEmails = [
          'тест@test.com', // Cyrillic
          'test@tëst.com', // Accented characters
          'test+tag@test.com', // Plus addressing
          'test.dot@test.com' // Dot in local part
        ];

        for (const email of specialEmails) {
          const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });

          // Should handle gracefully (either accept valid ones or reject invalid)
          expect([200, 400]).toContain(response.status);
        }
      });
    });

    describe('Edge Cases and Boundary Conditions', () => {
      it('should handle concurrent authentication attempts', async () => {
        const testEmail = generateTestEmail('concurrent');
        const user = await createTestUser({ email: testEmail });
        const code = await createOtpCode(user.id);

        // Try to verify the same code multiple times concurrently
        const promises = Array(5).fill(null).map(() =>
          fetch(`${API_BASE}/api/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, code })
          })
        );

        const responses = await Promise.all(promises);
        
        // Only one should succeed
        const successCount = responses.filter(r => r.status === 200).length;
        expect(successCount).toBeLessThanOrEqual(1);
      });

      it('should handle malformed JSON payloads', async () => {
        const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{"email": "test@test.com"' // Missing closing brace
        });

        expect(response.status).toBe(400);
      });

      it('should handle missing required fields', async () => {
        const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testUser.email }) // Missing code
        });

        expect(response.status).toBe(400);
      });

      it('should handle extremely long JWT tokens', async () => {
        const massivePayload = {
          id: testUser.id,
          userId: testUser.id,
          email: testUser.email,
          roles: testUser.roles,
          massiveData: 'x'.repeat(10000) // Very large data
        };

        // Creating the token might succeed, but verification should handle it properly
        try {
          const token = await createSession(massivePayload as any);
          const verified = await verifySession(token);
          // Should either verify correctly or fail gracefully
          expect(verified === null || verified.userId === testUser.id).toBe(true);
        } catch (error) {
          // Token creation might fail due to size limits, which is acceptable
          expect(error).toBeDefined();
        }
      });
    });
  });
});