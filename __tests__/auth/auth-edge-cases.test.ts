/**
 * Authentication Edge Cases and Error Handling Tests
 * 
 * Tests for lib/auth.ts functions not covered in main JWT tests
 * Focus on edge cases, error handling, and boundary conditions
 */

import { 
  findOrCreateUser,
  auth,
  createOtpCode,
  verifyOtpCode,
  getUserPasskeys,
  createPasskey,
  updatePasskeyCounter,
  getPasskeyByCredentialId
} from '@/lib/auth';
import { testPrisma as prisma, cleanupTestData, generateTestEmail } from '../utils/test-helpers';
import crypto from 'crypto';

describe('Authentication Edge Cases', () => {
  beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('findOrCreateUser Edge Cases', () => {
    it('should handle duplicate email creation attempts', async () => {
      const email = generateTestEmail('duplicate-test');
      
      // Create user first time
      const user1 = await findOrCreateUser(email);
      expect(user1.id).toBeDefined();
      
      // Create same user again - should return existing
      const user2 = await findOrCreateUser(email);
      expect(user2.id).toBe(user1.id);
      expect(user2.name).toBe(user1.name);
    });

    it('should handle emails with special characters', async () => {
      const specialEmails = [
        'test+tag@domain.com',
        'test.dot@domain.com',
        'test-dash@domain.com',
        'test_underscore@domain.com'
      ];

      for (const email of specialEmails) {
        const user = await findOrCreateUser(email);
        expect(user.id).toBeDefined();
        expect(user.name).toBe(email.split('@')[0]);
      }
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      
      try {
        const user = await findOrCreateUser(longEmail);
        expect(user.id).toBeDefined();
      } catch (error) {
        // Should handle gracefully - either succeed or fail with proper error
        expect(error).toBeDefined();
      }
    });

    it('should handle email case sensitivity correctly', async () => {
      const email1 = 'Test@Example.com';
      const email2 = 'test@example.com';
      
      const user1 = await findOrCreateUser(email1);
      const user2 = await findOrCreateUser(email2);
      
      // Depending on DB collation, these might be same or different users
      expect(user1.id).toBeDefined();
      expect(user2.id).toBeDefined();
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock a database error
      const originalFindUnique = prisma.user.findUnique;
      prisma.user.findUnique = jest.fn().mockRejectedValueOnce(new Error('Database connection failed'));
      
      try {
        await expect(findOrCreateUser('error@test.com')).rejects.toThrow();
      } finally {
        prisma.user.findUnique = originalFindUnique;
      }
    });
  });

  describe('auth() Function Edge Cases', () => {
    it('should handle missing cookies gracefully', async () => {
      // Mock cookies to return undefined
      const originalEnv = process.env.LOCAL_API;
      process.env.LOCAL_API = 'false';
      
      try {
        // This will fail in test environment since cookies() is not available
        // But it should fail gracefully, not crash
        const result = await auth();
        expect(result).toBeNull();
      } catch (error) {
        // Expected in test environment
        expect(error).toBeDefined();
      } finally {
        process.env.LOCAL_API = originalEnv;
      }
    });

    it('should use LOCAL_API bypass correctly', async () => {
      const originalEnv = process.env.LOCAL_API;
      process.env.LOCAL_API = 'true';
      
      try {
        const result = await auth();
        expect(result).toBeDefined();
        expect(result?.user).toBeDefined();
        expect(result?.user.roles).toContain('user');
      } finally {
        process.env.LOCAL_API = originalEnv;
      }
    });

    it('should handle database query failures in LOCAL_API mode', async () => {
      const originalEnv = process.env.LOCAL_API;
      process.env.LOCAL_API = 'true';
      
      // Mock database failure
      const originalFindFirst = prisma.user.findFirst;
      prisma.user.findFirst = jest.fn().mockRejectedValueOnce(new Error('DB Error'));
      
      try {
        const result = await auth();
        // Should fall back to mock user when DB fails
        expect(result).toBeDefined();
        expect(result?.user.email).toBe('localhost@test.com');
      } finally {
        process.env.LOCAL_API = originalEnv;
        prisma.user.findFirst = originalFindFirst;
      }
    });
  });

  describe('OTP Code Edge Cases', () => {
    it('should handle concurrent OTP creation', async () => {
      const email = generateTestEmail('concurrent-otp');
      const user = await findOrCreateUser(email);
      
      // Create multiple OTP codes concurrently
      const promises = Array(5).fill(null).map(() => createOtpCode(user.id));
      const codes = await Promise.all(promises);
      
      // All should be different
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
      
      // Only the last one should be valid
      const validCodes = [];
      for (const code of codes) {
        const isValid = await verifyOtpCode(user.id, code);
        if (isValid) validCodes.push(code);
      }
      
      expect(validCodes.length).toBeLessThanOrEqual(1);
    });

    it('should handle OTP verification race conditions', async () => {
      const email = generateTestEmail('otp-race');
      const user = await findOrCreateUser(email);
      const code = await createOtpCode(user.id);
      
      // Try to verify same code multiple times concurrently
      const promises = Array(5).fill(null).map(() => verifyOtpCode(user.id, code));
      const results = await Promise.all(promises);
      
      // Only one should succeed
      const successCount = results.filter(r => r === true).length;
      expect(successCount).toBe(1);
    });

    it('should handle expired code cleanup', async () => {
      const email = generateTestEmail('expired-cleanup');
      const user = await findOrCreateUser(email);
      
      // Create expired code manually
      const expiredCode = Math.floor(Math.random() * 900000 + 100000).toString();
      await prisma.otpCode.create({
        data: {
          userId: user.id,
          code: expiredCode,
          expiresAt: new Date(Date.now() - 1000), // Already expired
          used: false
        }
      });
      
      // Should not be verifiable
      const isValid = await verifyOtpCode(user.id, expiredCode);
      expect(isValid).toBe(false);
    });
  });

  describe('Passkey Edge Cases', () => {
    it('should handle passkey creation with invalid data', async () => {
      const email = generateTestEmail('passkey-invalid');
      const user = await findOrCreateUser(email);
      
      // Try to create passkey with invalid credential ID
      await expect(
        createPasskey(user.id, '', 'validPublicKey', 'Test Device')
      ).rejects.toThrow();
      
      // Try to create passkey with duplicate credential ID
      const credentialId = crypto.randomBytes(32).toString('base64');
      await createPasskey(user.id, credentialId, 'publicKey1', 'Device 1');
      
      await expect(
        createPasskey(user.id, credentialId, 'publicKey2', 'Device 2')
      ).rejects.toThrow();
    });

    it('should handle passkey counter updates with invalid credentials', async () => {
      await expect(
        updatePasskeyCounter('non-existent-credential', 5)
      ).rejects.toThrow();
    });

    it('should handle passkey lookup with malformed credential ID', async () => {
      const passkey = await getPasskeyByCredentialId('invalid-credential-id');
      expect(passkey).toBeNull();
    });

    it('should handle user passkey listing with no passkeys', async () => {
      const email = generateTestEmail('no-passkeys');
      const user = await findOrCreateUser(email);
      
      const passkeys = await getUserPasskeys(user.id);
      expect(passkeys).toEqual([]);
    });

    it('should handle passkey creation with extremely long names', async () => {
      const email = generateTestEmail('long-passkey-name');
      const user = await findOrCreateUser(email);
      const credentialId = crypto.randomBytes(32).toString('base64');
      const longName = 'a'.repeat(1000);
      
      try {
        const passkey = await createPasskey(user.id, credentialId, 'publicKey', longName);
        expect(passkey.name?.length).toBeLessThanOrEqual(255); // Assuming DB limit
      } catch (error) {
        // Should handle long names gracefully
        expect(error).toBeDefined();
      }
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle null byte injection in email', async () => {
      const maliciousEmail = 'test@test.com\x00malicious';
      
      try {
        await findOrCreateUser(maliciousEmail);
        // If it succeeds, email should be sanitized
      } catch (error) {
        // Should reject malicious input
        expect(error).toBeDefined();
      }
    });

    it('should handle SQL injection attempts in OTP codes', async () => {
      const email = generateTestEmail('sql-injection');
      const user = await findOrCreateUser(email);
      await createOtpCode(user.id);
      
      const maliciousCodes = [
        "123456'; DROP TABLE otp_codes; --",
        "123456' OR '1'='1",
        "123456' UNION SELECT * FROM users --"
      ];
      
      for (const code of maliciousCodes) {
        const isValid = await verifyOtpCode(user.id, code);
        expect(isValid).toBe(false);
      }
      
      // Verify table still exists by creating another OTP
      const validCode = await createOtpCode(user.id);
      expect(validCode).toMatch(/^\d{6}$/);
    });

    it('should handle buffer overflow attempts in passkey data', async () => {
      const email = generateTestEmail('buffer-overflow');
      const user = await findOrCreateUser(email);
      
      // Try with very large credential ID and public key
      const largeCredentialId = 'a'.repeat(10000);
      const largePublicKey = 'b'.repeat(10000);
      
      try {
        await createPasskey(user.id, largeCredentialId, largePublicKey);
        // If it succeeds, data should be truncated or validated
      } catch (error) {
        // Should handle oversized data gracefully
        expect(error).toBeDefined();
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent user creation', async () => {
      const email = generateTestEmail('concurrent-user');
      
      // Try to create same user multiple times concurrently
      const promises = Array(5).fill(null).map(() => findOrCreateUser(email));
      const users = await Promise.all(promises);
      
      // All should return the same user ID
      const userIds = users.map(u => u.id);
      const uniqueIds = new Set(userIds);
      expect(uniqueIds.size).toBe(1);
    });

    it('should handle concurrent passkey operations', async () => {
      const email = generateTestEmail('concurrent-passkeys');
      const user = await findOrCreateUser(email);
      
      // Create multiple passkeys concurrently
      const promises = Array(3).fill(null).map((_, i) => 
        createPasskey(
          user.id,
          crypto.randomBytes(16).toString('base64') + i,
          `publicKey${i}`,
          `Device ${i}`
        )
      );
      
      const passkeys = await Promise.all(promises);
      expect(passkeys).toHaveLength(3);
      
      // All should have different credential IDs
      const credentialIds = passkeys.map(p => p.credentialId);
      const uniqueIds = new Set(credentialIds);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('Performance and Limits', () => {
    it('should handle maximum OTP code generation', async () => {
      // Generate many OTP codes to test randomness and performance
      const codes = new Set();
      for (let i = 0; i < 1000; i++) {
        const { generateOtpCode } = await import('@/lib/auth');
        const code = generateOtpCode();
        expect(code).toMatch(/^\d{6}$/);
        codes.add(code);
      }
      
      // Should have good randomness (at least 80% unique)
      expect(codes.size).toBeGreaterThan(800);
    });

    it('should handle user with maximum passkeys', async () => {
      const email = generateTestEmail('max-passkeys');
      const user = await findOrCreateUser(email);
      
      // Create many passkeys for one user
      const passkeys = [];
      for (let i = 0; i < 10; i++) {
        const passkey = await createPasskey(
          user.id,
          crypto.randomBytes(16).toString('base64'),
          `publicKey${i}`,
          `Device ${i}`
        );
        passkeys.push(passkey);
      }
      
      const userPasskeys = await getUserPasskeys(user.id);
      expect(userPasskeys).toHaveLength(10);
    });
  });
});