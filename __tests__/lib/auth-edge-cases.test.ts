/**
 * Auth Library Edge Cases Tests - Branch Coverage Enhancement
 * 
 * This file focuses on testing all conditional branches in auth.ts
 * to improve branch coverage by targeting specific edge cases.
 */

import { 
  createSession, 
  verifySession, 
  generateOtpCode, 
  createOtpCode, 
  verifyOtpCode, 
  findOrCreateUser, 
  auth 
} from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@/lib/db');
jest.mock('next/headers');
jest.mock('crypto');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockCrypto = crypto as jest.Mocked<typeof crypto>;

describe('Auth Library Edge Cases - Branch Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.LOCAL_API;
    delete process.env.JWT_SECRET;
  });

  describe('verifySession - All Branches', () => {
    it('should return parsed payload on valid token', async () => {
      // This tests the success branch
      const payload = {
        id: 'user-123',
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      };

      const token = await createSession(payload);
      const result = await verifySession(token);
      
      expect(result).toEqual(expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com'
      }));
    });

    it('should return null on invalid token', async () => {
      // This tests the catch branch
      const result = await verifySession('invalid-token');
      expect(result).toBe(null);
    });

    it('should return null on malformed token', async () => {
      // This tests the catch branch with malformed JWT
      const result = await verifySession('not.a.jwt');
      expect(result).toBe(null);
    });

    it('should return null on empty token', async () => {
      // This tests the catch branch with empty token
      const result = await verifySession('');
      expect(result).toBe(null);
    });
  });

  describe('generateOtpCode - Range Testing', () => {
    it('should generate code within valid range', () => {
      // Mock crypto.randomInt to return specific values
      mockCrypto.randomInt
        .mockReturnValueOnce(100000) // Minimum value
        .mockReturnValueOnce(999999) // Maximum value  
        .mockReturnValueOnce(555555); // Mid-range value

      expect(generateOtpCode()).toBe('100000');
      expect(generateOtpCode()).toBe('999999');
      expect(generateOtpCode()).toBe('555555');
      
      expect(mockCrypto.randomInt).toHaveBeenCalledWith(100000, 999999);
    });
  });

  describe('createOtpCode - All Branches', () => {
    it('should invalidate existing codes and create new one', async () => {
      const userId = 'user-123';
      const mockCode = '123456';
      
      mockCrypto.randomInt.mockReturnValue(123456);
      mockPrisma.otpCode.updateMany.mockResolvedValue({ count: 2 }); // Simulate updating existing codes
      mockPrisma.otpCode.create.mockResolvedValue({
        id: 'otp-1',
        userId,
        code: mockCode,
        expiresAt: new Date(),
        used: false,
        createdAt: new Date()
      });

      const result = await createOtpCode(userId);
      
      expect(result).toBe(mockCode);
      expect(mockPrisma.otpCode.updateMany).toHaveBeenCalledWith({
        where: { userId, used: false },
        data: { used: true }
      });
      expect(mockPrisma.otpCode.create).toHaveBeenCalled();
    });

    it('should create new code when no existing codes to invalidate', async () => {
      const userId = 'user-new';
      const mockCode = '654321';
      
      mockCrypto.randomInt.mockReturnValue(654321);
      mockPrisma.otpCode.updateMany.mockResolvedValue({ count: 0 }); // No existing codes
      mockPrisma.otpCode.create.mockResolvedValue({
        id: 'otp-2',
        userId,
        code: mockCode,
        expiresAt: new Date(),
        used: false,
        createdAt: new Date()
      });

      const result = await createOtpCode(userId);
      
      expect(result).toBe(mockCode);
      expect(mockPrisma.otpCode.updateMany).toHaveBeenCalledWith({
        where: { userId, used: false },
        data: { used: true }
      });
    });
  });

  describe('verifyOtpCode - All Branches', () => {
    it('should verify valid code and mark as used', async () => {
      const userId = 'user-123';
      const code = '123456';
      const mockOtpCode = {
        id: 'otp-1',
        userId,
        code,
        used: false,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        createdAt: new Date()
      };

      mockPrisma.otpCode.findFirst.mockResolvedValue(mockOtpCode);
      mockPrisma.otpCode.update.mockResolvedValue({ ...mockOtpCode, used: true });

      const result = await verifyOtpCode(userId, code);
      
      expect(result).toBe(true);
      expect(mockPrisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { used: true }
      });
    });

    it('should return false when OTP code not found', async () => {
      const userId = 'user-123';
      const code = '123456';

      mockPrisma.otpCode.findFirst.mockResolvedValue(null);

      const result = await verifyOtpCode(userId, code);
      
      expect(result).toBe(false);
      expect(mockPrisma.otpCode.update).not.toHaveBeenCalled();
    });

    it('should return false when OTP code is already used', async () => {
      const userId = 'user-123';
      const code = '123456';

      // Mock query to return null (used codes are filtered out)
      mockPrisma.otpCode.findFirst.mockResolvedValue(null);

      const result = await verifyOtpCode(userId, code);
      
      expect(result).toBe(false);
    });

    it('should return false when OTP code is expired', async () => {
      const userId = 'user-123';
      const code = '123456';

      // Mock query to return null (expired codes are filtered out)
      mockPrisma.otpCode.findFirst.mockResolvedValue(null);

      const result = await verifyOtpCode(userId, code);
      
      expect(result).toBe(false);
    });
  });

  describe('findOrCreateUser - Both Branches', () => {
    it('should return existing user when found', async () => {
      const email = 'existing@example.com';
      const existingUser = {
        id: 'user-123',
        name: 'Existing User',
        roles: ['user', 'admin']
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      const result = await findOrCreateUser(email);
      
      expect(result).toEqual(existingUser);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should create new user when not found', async () => {
      const email = 'new@example.com';
      const newUser = {
        id: 'user-456',
        name: 'new',
        roles: []
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // User not found
      mockPrisma.user.create.mockResolvedValue(newUser);

      const result = await findOrCreateUser(email);
      
      expect(result).toEqual(newUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email,
          name: 'new', // email.split('@')[0]
          roles: []
        },
        select: { id: true, name: true, roles: true }
      });
    });

    it('should handle email with complex domain', async () => {
      const email = 'user.name+tag@sub.domain.com';
      const newUser = {
        id: 'user-789',
        name: 'user.name+tag',
        roles: []
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(newUser);

      const result = await findOrCreateUser(email);
      
      expect(result).toEqual(newUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email,
          name: 'user.name+tag',
          roles: []
        },
        select: { id: true, name: true, roles: true }
      });
    });
  });

  describe('auth function - All Branches', () => {
    const mockCookieStore = {
      get: jest.fn()
    };

    beforeEach(() => {
      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockCookieStore.get.mockClear();
    });

    it('should return LOCAL_API mock user when LOCAL_API=true and test user found', async () => {
      process.env.LOCAL_API = 'true';
      
      const testUser = {
        id: 'test-user-123',
        email: 'test@example.com',
        createdAt: new Date()
      };

      mockPrisma.user.findFirst.mockResolvedValue(testUser);

      const result = await auth();
      
      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'test-user-123',
          userId: 'test-user-123',
          email: 'test@example.com',
          roles: ['user', 'admin']
        })
      });
    });

    it('should return fallback mock user when LOCAL_API=true but test user not found', async () => {
      process.env.LOCAL_API = 'true';
      
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await auth();
      
      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'test-session',
          userId: 'localhost-user',
          email: 'localhost@test.com',
          roles: ['user', 'admin']
        })
      });
    });

    it('should return fallback mock user when LOCAL_API=true and database query fails', async () => {
      process.env.LOCAL_API = 'true';
      
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database connection failed'));

      const result = await auth();
      
      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'test-session',
          userId: 'localhost-user',
          email: 'localhost@test.com'
        })
      });
    });

    it('should return null when no session token present', async () => {
      process.env.LOCAL_API = 'false';
      
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await auth();
      
      expect(result).toBe(null);
    });

    it('should return null when session token is invalid', async () => {
      process.env.LOCAL_API = 'false';
      
      mockCookieStore.get.mockReturnValue({ value: 'invalid-token' });

      const result = await auth();
      
      expect(result).toBe(null);
    });

    it('should return user session when valid token present', async () => {
      process.env.LOCAL_API = 'false';
      
      const validPayload = {
        id: 'user-123',
        userId: 'user-123',
        email: 'valid@example.com',
        roles: ['user'],
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      };

      const token = await createSession(validPayload);
      mockCookieStore.get.mockReturnValue({ value: token });

      const result = await auth();
      
      expect(result).toEqual({
        user: expect.objectContaining({
          email: 'valid@example.com',
          roles: ['user']
        })
      });
    });

    it('should return null when auth function throws unexpected error', async () => {
      process.env.LOCAL_API = 'false';
      
      // Mock cookies() to throw an error
      mockCookies.mockRejectedValue(new Error('Cookies unavailable'));

      const result = await auth();
      
      expect(result).toBe(null);
    });

    it('should return null when cookie value is null', async () => {
      process.env.LOCAL_API = 'false';
      
      mockCookieStore.get.mockReturnValue(null);

      const result = await auth();
      
      expect(result).toBe(null);
    });

    it('should return null when cookie exists but has no value', async () => {
      process.env.LOCAL_API = 'false';
      
      mockCookieStore.get.mockReturnValue({}); // Cookie without value

      const result = await auth();
      
      expect(result).toBe(null);
    });
  });

  describe('Session Creation Edge Cases', () => {
    it('should handle custom JWT secret from environment', async () => {
      process.env.JWT_SECRET = 'custom-secret-key';
      
      const payload = {
        id: 'user-test',
        userId: 'user-test',
        email: 'test@custom.com',
        roles: ['user'],
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      };

      const token = await createSession(payload);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      
      // Verify the token can be verified with the same secret
      const verified = await verifySession(token);
      expect(verified).toEqual(expect.objectContaining({
        email: 'test@custom.com'
      }));
    });

    it('should handle payload with additional properties', async () => {
      const payload = {
        id: 'user-extra',
        userId: 'user-extra',
        email: 'extra@example.com',
        roles: ['user', 'admin'],
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
        // Additional properties
        customField: 'custom-value',
        permissions: ['read', 'write']
      } as any;

      const token = await createSession(payload);
      const verified = await verifySession(token);
      
      expect(verified).toEqual(expect.objectContaining({
        email: 'extra@example.com',
        roles: ['user', 'admin']
      }));
    });
  });
});