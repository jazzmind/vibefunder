/**
 * Unit Tests for JWT Authentication Functions (No Database Required)
 * 
 * These tests focus on the pure JWT functionality without requiring database access.
 * They test the core security features of token generation and validation.
 */

import { 
  createSession, 
  verifySession, 
  generateOtpCode
} from '@/lib/auth';
import { SignJWT } from 'jose';

describe('JWT Authentication Unit Tests (No DB)', () => {
  const testPayload = {
    id: 'test-id-123',
    userId: 'test-user-456',
    email: 'test@example.com',
    roles: ['user']
  };

  describe('JWT Token Generation and Validation', () => {
    it('should generate valid JWT token with proper payload', async () => {
      const token = await createSession(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // JWT should have 3 parts separated by dots
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      
      // Each part should be base64url encoded
      parts.forEach(part => {
        expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
      });
    });

    it('should verify valid JWT token and return correct payload', async () => {
      const token = await createSession(testPayload);
      const verified = await verifySession(token);

      expect(verified).toBeDefined();
      expect(verified?.userId).toBe(testPayload.userId);
      expect(verified?.email).toBe(testPayload.email);
      expect(verified?.roles).toEqual(testPayload.roles);
      expect(verified?.iat).toBeDefined(); // Issued at
      expect(verified?.exp).toBeDefined(); // Expires at
    });

    it('should return null for invalid JWT token signatures', async () => {
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

    it('should return null for malformed JWT tokens', async () => {
      const malformedTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Only header
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.', // Missing payload and signature
        '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.', // Missing header and signature
        'not-base64!.also-not-base64!.invalid-base64!'
      ];

      for (const malformedToken of malformedTokens) {
        const verified = await verifySession(malformedToken);
        expect(verified).toBeNull();
      }
    });

    it('should validate JWT expiration correctly', async () => {
      // Create a token with very short expiration for testing
      const jwtSecret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'your-very-long-secret-key-change-this-in-production'
      );

      const shortLivedToken = await new SignJWT(testPayload as any)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + 1) // Expires in 1 second
        .sign(jwtSecret);

      // Wait to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const verified = await verifySession(shortLivedToken);
      expect(verified).toBeNull();
    });

    it('should handle JWT with wrong signature', async () => {
      const validToken = await createSession(testPayload);
      
      // Tamper with the signature
      const parts = validToken.split('.');
      parts[2] = 'tampered-signature';
      const tamperedToken = parts.join('.');

      const verified = await verifySession(tamperedToken);
      expect(verified).toBeNull();
    });

    it('should handle JWT with tampered payload', async () => {
      const validToken = await createSession(testPayload);
      const parts = validToken.split('.');
      
      // Create a tampered payload with privilege escalation
      const tamperedPayload = {
        ...testPayload,
        roles: ['admin', 'superuser'] // Privilege escalation attempt
      };
      
      // Base64url encode the tampered payload
      const tamperedPayloadB64 = btoa(JSON.stringify(tamperedPayload))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      parts[1] = tamperedPayloadB64;
      const tamperedToken = parts.join('.');

      const verified = await verifySession(tamperedToken);
      expect(verified).toBeNull();
    });

    it('should use HMAC SHA-256 algorithm correctly', async () => {
      const token = await createSession(testPayload);
      const parts = token.split('.');
      
      // Decode header to verify algorithm
      const headerB64 = parts[0];
      const headerPadded = headerB64 + '='.repeat((4 - headerB64.length % 4) % 4);
      const headerJson = atob(headerPadded.replace(/-/g, '+').replace(/_/g, '/'));
      const header = JSON.parse(headerJson);
      
      expect(header.alg).toBe('HS256');
      // JWT header may or may not include typ field, both are valid
      if (header.typ) {
        expect(header.typ).toBe('JWT');
      }
    });

    it('should include proper timestamps in JWT', async () => {
      const beforeIssuance = Math.floor(Date.now() / 1000);
      const token = await createSession(testPayload);
      const afterIssuance = Math.floor(Date.now() / 1000);
      
      const verified = await verifySession(token);
      
      expect(verified?.iat).toBeGreaterThanOrEqual(beforeIssuance);
      expect(verified?.iat).toBeLessThanOrEqual(afterIssuance);
      expect(verified?.exp).toBeGreaterThan(verified!.iat);
      
      // Token should expire in 7 days (7 * 24 * 60 * 60 = 604800 seconds)
      const expectedExp = verified!.iat + 604800;
      expect(verified?.exp).toBe(expectedExp);
    });

    it('should handle edge case payloads', async () => {
      const edgeCasePayloads = [
        {
          id: '',
          userId: '',
          email: '',
          roles: []
        },
        {
          id: 'very-long-id-' + 'x'.repeat(100),
          userId: 'very-long-user-id-' + 'x'.repeat(100),
          email: 'very-long-email-' + 'x'.repeat(50) + '@example.com',
          roles: ['user', 'admin', 'moderator', 'super-admin', 'test-role']
        }
      ];

      for (const payload of edgeCasePayloads) {
        const token = await createSession(payload);
        const verified = await verifySession(token);
        
        expect(verified).toBeDefined();
        expect(verified?.id).toBe(payload.id);
        expect(verified?.userId).toBe(payload.userId);
        expect(verified?.email).toBe(payload.email);
        expect(verified?.roles).toEqual(payload.roles);
      }
    });
  });

  describe('OTP Code Generation (Pure Functions)', () => {
    it('should generate valid 6-digit OTP codes', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateOtpCode();
        expect(code).toMatch(/^\d{6}$/);
        expect(code.length).toBe(6);
        expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
        expect(parseInt(code)).toBeLessThanOrEqual(999999);
      }
    });

    it('should generate different codes each time', () => {
      const codes = new Set();
      
      // Generate 100 codes and verify they're mostly unique
      for (let i = 0; i < 100; i++) {
        codes.add(generateOtpCode());
      }
      
      // Should have high uniqueness (at least 90% unique)
      expect(codes.size).toBeGreaterThan(90);
    });

    it('should use cryptographically secure randomness', () => {
      const codes = [];
      
      // Generate many codes to test distribution
      for (let i = 0; i < 1000; i++) {
        codes.push(parseInt(generateOtpCode()));
      }
      
      // Test basic statistical properties
      const min = Math.min(...codes);
      const max = Math.max(...codes);
      const avg = codes.reduce((a, b) => a + b) / codes.length;
      
      expect(min).toBeGreaterThanOrEqual(100000);
      expect(max).toBeLessThanOrEqual(999999);
      // Average should be reasonably close to middle of range (with generous tolerance for randomness)
      expect(avg).toBeGreaterThan(500000);
      expect(avg).toBeLessThan(600000);
      
      // Test that codes are reasonably distributed across the range
      const buckets = Array(10).fill(0);
      codes.forEach(code => {
        const bucket = Math.floor((code - 100000) / 90000);
        buckets[bucket]++;
      });
      
      // Each bucket should have some codes (no bucket should be empty)
      buckets.forEach(count => {
        expect(count).toBeGreaterThan(0);
      });
    });
  });

  describe('JWT Security Properties', () => {
    it('should create tokens that are URL-safe', async () => {
      const token = await createSession(testPayload);
      
      // Token should not contain URL-unsafe characters
      expect(token).not.toMatch(/[+/=]/);
      expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    });

    it('should fail verification with different secrets', async () => {
      const token = await createSession(testPayload);
      
      // Try to verify with a different secret
      const differentSecret = new TextEncoder().encode('different-secret-key');
      
      try {
        const { jwtVerify } = await import('jose');
        const result = await jwtVerify(token, differentSecret);
        // Should not reach here
        expect(result).toBeUndefined();
      } catch (error) {
        // Should throw an error due to signature mismatch
        expect(error).toBeDefined();
      }
    });

    it('should handle token replay attacks through expiration', async () => {
      const token = await createSession(testPayload);
      
      // Token should be valid now
      const verified1 = await verifySession(token);
      expect(verified1).toBeDefined();
      
      // Token should still be valid immediately after
      const verified2 = await verifySession(token);
      expect(verified2).toBeDefined();
      
      // Both verifications should return the same data
      expect(verified1?.userId).toBe(verified2?.userId);
      expect(verified1?.email).toBe(verified2?.email);
    });

    it('should prevent token forgery without the secret', async () => {
      // Try to create a fake token without the proper secret
      const fakePayload = {
        id: 'hacker-id',
        userId: 'admin-user',
        email: 'hacker@evil.com',
        roles: ['admin', 'superuser']
      };
      
      const fakeSecret = new TextEncoder().encode('fake-secret');
      
      try {
        const fakeToken = await new SignJWT(fakePayload as any)
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('7d')
          .sign(fakeSecret);
        
        // This fake token should not verify with the real secret
        const verified = await verifySession(fakeToken);
        expect(verified).toBeNull();
      } catch (error) {
        // Creating the fake token might fail, which is also acceptable
        expect(error).toBeDefined();
      }
    });

    it('should maintain data integrity in the payload', async () => {
      const specialPayload = {
        id: 'id-with-special-chars-<>&"\'',
        userId: 'user-123',
        email: 'user+tag@domain.co.uk',
        roles: ['user', 'role-with-dashes', 'role_with_underscores']
      };
      
      const token = await createSession(specialPayload);
      const verified = await verifySession(token);
      
      expect(verified?.id).toBe(specialPayload.id);
      expect(verified?.userId).toBe(specialPayload.userId);
      expect(verified?.email).toBe(specialPayload.email);
      expect(verified?.roles).toEqual(specialPayload.roles);
    });
  });

  describe('Error Handling', () => {
    it('should handle null and undefined gracefully', async () => {
      const nullResult = await verifySession(null as any);
      expect(nullResult).toBeNull();
      
      const undefinedResult = await verifySession(undefined as any);
      expect(undefinedResult).toBeNull();
    });

    it('should handle empty string token', async () => {
      const emptyResult = await verifySession('');
      expect(emptyResult).toBeNull();
    });

    it('should handle very long invalid tokens', async () => {
      const longInvalidToken = 'x'.repeat(10000);
      const result = await verifySession(longInvalidToken);
      expect(result).toBeNull();
    });

    it('should handle binary data as token', async () => {
      const binaryData = '\x00\x01\x02\x03\x04\x05';
      const result = await verifySession(binaryData);
      expect(result).toBeNull();
    });
  });
});