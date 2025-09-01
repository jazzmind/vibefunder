/**
 * Simple Auth Test - Working Version
 * Basic auth function tests without complex race conditions
 */

import { 
  findOrCreateUser,
  auth,
  createOtpCode,
  verifyOtpCode,
} from '@/lib/auth';

// Generate test email
function generateTestEmail(prefix = 'test') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}@vibefunder-test.com`;
}

describe('Simple Auth Tests', () => {
  jest.setTimeout(30000);

  describe('findOrCreateUser', () => {
    it('should create a new user', async () => {
      const email = generateTestEmail('new-user');
      const user = await findOrCreateUser(email);
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.name).toBe(email.split('@')[0]);
      expect(user.roles).toEqual([]);
    });

    it('should handle duplicate user creation', async () => {
      const email = generateTestEmail('duplicate-user');
      
      // Create user first time
      const user1 = await findOrCreateUser(email);
      expect(user1).toBeDefined();
      
      // Create same user again
      const user2 = await findOrCreateUser(email);
      expect(user2.id).toBe(user1.id);
      expect(user2.name).toBe(user1.name);
    });
  });

  describe('auth function', () => {
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
  });

  describe('OTP functionality', () => {
    it('should create and verify OTP code', async () => {
      const email = generateTestEmail('otp-user');
      const user = await findOrCreateUser(email);
      
      // Wait for user creation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create OTP
      const otpCode = await createOtpCode(user.id);
      expect(otpCode).toMatch(/^\d{6}$/);
      
      // Verify OTP
      const isValid = await verifyOtpCode(user.id, otpCode);
      expect(isValid).toBe(true);
      
      // Try to verify same OTP again (should fail)
      const isValidAgain = await verifyOtpCode(user.id, otpCode);
      expect(isValidAgain).toBe(false);
    });

    it('should reject invalid OTP codes', async () => {
      const email = generateTestEmail('invalid-otp');
      const user = await findOrCreateUser(email);
      
      // Wait for user creation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try invalid OTP
      const invalidOtp = '000000';
      const isValid = await verifyOtpCode(user.id, invalidOtp);
      expect(isValid).toBe(false);
    });

    it('should handle malformed OTP codes', async () => {
      const email = generateTestEmail('malformed-otp');
      const user = await findOrCreateUser(email);
      
      // Wait for user creation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const malformedCodes = [
        'abc123',
        '12345',
        '1234567',
        '',
        'null',
        '123.45',
      ];
      
      for (const code of malformedCodes) {
        const isValid = await verifyOtpCode(user.id, code);
        expect(isValid).toBe(false);
      }
    });
  });
});