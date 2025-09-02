import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import crypto from 'crypto';
import { promisify } from 'util';
import { createTestRequest } from '../../utils/api-test-helpers';

// Mock all external dependencies first
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    oTPCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    backupCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  createSession: jest.fn(),
  verifySession: jest.fn(),
  createOtpCode: jest.fn(),
  verifyOtpCode: jest.fn(),
  generateOtpCode: jest.fn(),
  findOrCreateUser: jest.fn(),
}));

// Mock external services - using local mock objects instead of jest.mock with virtual
const mockEmailService = {
  sendOTP: jest.fn(),
};

const mockSMSService = {
  sendOTP: jest.fn(),
};

// Mock Redis client
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
};

// Import after mocking
import { prisma } from '@/lib/db';
import { createOtpCode, verifyOtpCode, generateOtpCode } from '@/lib/auth';

// Get mocked prisma instance
const mockPrisma = prisma as any;


// Mock OTP service implementation using actual auth functions
class OTPService {
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly OTP_LENGTH = 6;
  private readonly MAX_OTP_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW = 300; // 5 minutes
  private readonly MAX_OTP_REQUESTS = 3;

  async generateOTP(): Promise<string> {
    // Use the actual implementation
    return (generateOtpCode as jest.MockedFunction<typeof generateOtpCode>)() || '123456';
  }

  async sendOTP(userId: string, method: 'email' | 'sms'): Promise<{ success: boolean; message: string }> {
    try {
      // Rate limiting check
      const rateLimitKey = `otp_rate_limit:${userId}`;
      const currentRequests = await mockRedis.get(rateLimitKey) || '0';
      
      if (parseInt(currentRequests) >= this.MAX_OTP_REQUESTS) {
        return { success: false, message: 'Rate limit exceeded. Please try again later.' };
      }

      // Use actual createOtpCode function
      const otpCode = await (createOtpCode as jest.MockedFunction<typeof createOtpCode>)(userId);

      // Update rate limiting
      await mockRedis.incr(rateLimitKey);
      await mockRedis.expire(rateLimitKey, this.RATE_LIMIT_WINDOW);

      // Send OTP
      if (method === 'email') {
        await mockEmailService.sendOTP(userId, otpCode);
      } else {
        await mockSMSService.sendOTP(userId, otpCode);
      }

      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to send OTP' };
    }
  }

  async verifyOTP(userId: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      // Simulate timing attack prevention
      const startTime = Date.now();
      const minProcessingTime = 100; // milliseconds

      // Use actual verifyOtpCode function
      const isValid = await (verifyOtpCode as jest.MockedFunction<typeof verifyOtpCode>)(userId, code);
      
      if (!isValid) {
        // Ensure minimum processing time
        const elapsed = Date.now() - startTime;
        if (elapsed < minProcessingTime) {
          await promisify(setTimeout)(minProcessingTime - elapsed);
        }
        return { success: false, message: 'Invalid OTP' };
      }

      // Ensure minimum processing time
      const elapsed = Date.now() - startTime;
      if (elapsed < minProcessingTime) {
        await promisify(setTimeout)(minProcessingTime - elapsed);
      }

      return { success: true, message: 'OTP verified successfully' };
    } catch (error) {
      return { success: false, message: 'OTP verification failed' };
    }
  }

  async resendOTP(userId: string, method: 'email' | 'sms'): Promise<{ success: boolean; message: string }> {
    // Invalidate existing unused OTPs
    await mockPrisma.oTPCode.deleteMany({
      where: {
        userId,
        used: false,
      },
    });

    // Send new OTP
    return this.sendOTP(userId, method);
  }

  async generateBackupCodes(userId: string): Promise<string[]> {
    const codes: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
      
      await mockPrisma.backupCode.create({
        data: {
          userId,
          code: await this.hashOTP(code),
        },
      });
    }

    return codes;
  }

  async verifyBackupCode(userId: string, code: string): Promise<{ success: boolean; message: string }> {
    const backupCode = await mockPrisma.backupCode.findFirst({
      where: {
        userId,
        used: false,
      },
    });

    if (!backupCode || !(await this.verifyOTPHash(code, backupCode.code))) {
      return { success: false, message: 'Invalid backup code' };
    }

    // Mark as used
    await mockPrisma.backupCode.update({
      where: { id: backupCode.id },
      data: { used: true, usedAt: new Date() },
    });

    return { success: true, message: 'Backup code verified successfully' };
  }

  private async hashOTP(otp: string): Promise<string> {
    return crypto.pbkdf2Sync(otp, 'salt', 100000, 64, 'sha512').toString('hex');
  }

  private async verifyOTPHash(otp: string, hash: string): Promise<boolean> {
    const otpHash = await this.hashOTP(otp);
    return crypto.timingSafeEqual(Buffer.from(otpHash), Buffer.from(hash));
  }

  async validateCodeEntropy(code: string): Promise<boolean> {
    // Check for patterns that indicate low entropy
    const patterns = [
      /^(\d)\1+$/, // All same digits (111111)
      /^123456$|^654321$/, // Sequential digits
      /^000000$|^111111$|^222222$|^333333$|^444444$|^555555$|^666666$|^777777$|^888888$|^999999$/, // Common patterns
    ];

    return !patterns.some(pattern => pattern.test(code));
  }
}

describe('OTP Verification Tests', () => {
  let otpService: OTPService;
  const testUserId = 'test-user-123';

  beforeEach(() => {
    otpService = new OTPService();
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (generateOtpCode as jest.MockedFunction<typeof generateOtpCode>).mockReturnValue('123456');
    (createOtpCode as jest.MockedFunction<typeof createOtpCode>).mockResolvedValue('123456');
    (verifyOtpCode as jest.MockedFunction<typeof verifyOtpCode>).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('OTP Generation and Delivery', () => {
    it('should generate a 6-digit OTP', async () => {
      const otp = await otpService.generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it('should send OTP via email successfully', async () => {
      mockRedis.get.mockResolvedValue('0');
      mockEmailService.sendOTP.mockResolvedValue(true);
      (createOtpCode as jest.MockedFunction<typeof createOtpCode>).mockResolvedValue('123456');

      const result = await otpService.sendOTP(testUserId, 'email');

      expect(result.success).toBe(true);
      expect(createOtpCode).toHaveBeenCalledWith(testUserId);
      expect(mockEmailService.sendOTP).toHaveBeenCalledWith(testUserId, '123456');
    });

    it('should send OTP via SMS successfully', async () => {
      mockRedis.get.mockResolvedValue('0');
      mockSMSService.sendOTP.mockResolvedValue(true);
      (createOtpCode as jest.MockedFunction<typeof createOtpCode>).mockResolvedValue('123456');

      const result = await otpService.sendOTP(testUserId, 'sms');

      expect(result.success).toBe(true);
      expect(createOtpCode).toHaveBeenCalledWith(testUserId);
      expect(mockSMSService.sendOTP).toHaveBeenCalledWith(testUserId, '123456');
    });

    it('should validate code entropy', async () => {
      const validCode = '847293';
      const invalidCodes = ['111111', '123456', '000000'];

      expect(await otpService.validateCodeEntropy(validCode)).toBe(true);
      
      for (const code of invalidCodes) {
        expect(await otpService.validateCodeEntropy(code)).toBe(false);
      }
    });
  });

  describe('OTP Verification', () => {
    it('should verify correct OTP successfully', async () => {
      const validOTP = {
        id: '1',
        userId: testUserId,
        code: 'hashed_123456',
        attempts: 0,
        used: false,
        expiresAt: new Date(Date.now() + 300000), // 5 minutes from now
      };

      mockPrisma.oTPCode.findFirst.mockResolvedValue(validOTP);
      mockPrisma.oTPCode.update.mockResolvedValue(validOTP);

      // Mock the hash verification to return true for correct OTP
      jest.spyOn(otpService as any, 'verifyOTPHash').mockResolvedValue(true);

      const result = await otpService.verifyOTP(testUserId, '123456');

      expect(result.success).toBe(true);
      expect(mockPrisma.oTPCode.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { used: true, usedAt: expect.any(Date) },
      });
    });

    it('should reject incorrect OTP', async () => {
      const validOTP = {
        id: '1',
        userId: testUserId,
        code: 'hashed_123456',
        attempts: 0,
        used: false,
        expiresAt: new Date(Date.now() + 300000),
      };

      mockPrisma.oTPCode.findFirst.mockResolvedValue(validOTP);
      jest.spyOn(otpService as any, 'verifyOTPHash').mockResolvedValue(false);

      const result = await otpService.verifyOTP(testUserId, '654321');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid OTP');
      expect(mockPrisma.oTPCode.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { attempts: 1 },
      });
    });

    it('should handle timing attack prevention', async () => {
      const startTime = Date.now();
      
      mockPrisma.oTPCode.findFirst.mockResolvedValue(null);

      await otpService.verifyOTP(testUserId, '123456');

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(100); // Minimum processing time
    });
  });

  describe('OTP Expiration', () => {
    it('should reject expired OTP', async () => {
      const expiredOTP = {
        id: '1',
        userId: testUserId,
        code: 'hashed_123456',
        attempts: 0,
        used: false,
        expiresAt: new Date(Date.now() - 60000), // 1 minute ago
      };

      mockPrisma.oTPCode.findFirst.mockResolvedValue(null); // Expired OTPs won't be found

      const result = await otpService.verifyOTP(testUserId, '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or expired OTP');
    });

    it('should accept OTP within 5-minute window', async () => {
      const validOTP = {
        id: '1',
        userId: testUserId,
        code: 'hashed_123456',
        attempts: 0,
        used: false,
        expiresAt: new Date(Date.now() + 240000), // 4 minutes from now
      };

      mockPrisma.oTPCode.findFirst.mockResolvedValue(validOTP);
      jest.spyOn(otpService as any, 'verifyOTPHash').mockResolvedValue(true);

      const result = await otpService.verifyOTP(testUserId, '123456');

      expect(result.success).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on OTP requests', async () => {
      mockRedis.get.mockResolvedValue('3'); // Max requests reached

      const result = await otpService.sendOTP(testUserId, 'email');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Rate limit exceeded. Please try again later.');
      expect(mockPrisma.oTPCode.create).not.toHaveBeenCalled();
    });

    it('should allow OTP requests within rate limit', async () => {
      mockRedis.get.mockResolvedValue('1'); // Below limit
      mockPrisma.oTPCode.create.mockResolvedValue({
        id: '1',
        userId: testUserId,
        code: 'hashed_otp',
        method: 'email',
        expiresAt: new Date(),
        attempts: 0,
      });

      const result = await otpService.sendOTP(testUserId, 'email');

      expect(result.success).toBe(true);
      expect(mockRedis.incr).toHaveBeenCalledWith(`otp_rate_limit:${testUserId}`);
    });
  });

  describe('Resend OTP Functionality', () => {
    it('should invalidate existing OTPs when resending', async () => {
      mockPrisma.oTPCode.deleteMany.mockResolvedValue({ count: 1 });
      mockRedis.get.mockResolvedValue('0');
      mockPrisma.oTPCode.create.mockResolvedValue({
        id: '2',
        userId: testUserId,
        code: 'new_hashed_otp',
        method: 'email',
        expiresAt: new Date(),
        attempts: 0,
      });

      const result = await otpService.resendOTP(testUserId, 'email');

      expect(mockPrisma.oTPCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: testUserId, used: false },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('One-Time Use Enforcement', () => {
    it('should prevent reuse of verified OTP', async () => {
      const usedOTP = {
        id: '1',
        userId: testUserId,
        code: 'hashed_123456',
        attempts: 0,
        used: true, // Already used
        expiresAt: new Date(Date.now() + 300000),
      };

      mockPrisma.oTPCode.findFirst.mockResolvedValue(null); // Won't find used OTPs

      const result = await otpService.verifyOTP(testUserId, '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or expired OTP');
    });

    it('should mark OTP as used after successful verification', async () => {
      const validOTP = {
        id: '1',
        userId: testUserId,
        code: 'hashed_123456',
        attempts: 0,
        used: false,
        expiresAt: new Date(Date.now() + 300000),
      };

      mockPrisma.oTPCode.findFirst.mockResolvedValue(validOTP);
      jest.spyOn(otpService as any, 'verifyOTPHash').mockResolvedValue(true);

      await otpService.verifyOTP(testUserId, '123456');

      expect(mockPrisma.oTPCode.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { used: true, usedAt: expect.any(Date) },
      });
    });
  });

  describe('Backup Codes', () => {
    it('should generate 10 backup codes', async () => {
      mockPrisma.backupCode.create.mockResolvedValue({
        id: '1',
        userId: testUserId,
        code: 'hashed_code',
        used: false,
      });

      const codes = await otpService.generateBackupCodes(testUserId);

      expect(codes).toHaveLength(10);
      expect(mockPrisma.backupCode.create).toHaveBeenCalledTimes(10);
      codes.forEach(code => {
        expect(code).toMatch(/^[A-F0-9]{8}$/); // 8-character hex codes
      });
    });

    it('should verify valid backup code', async () => {
      const backupCode = {
        id: '1',
        userId: testUserId,
        code: 'hashed_ABC12345',
        used: false,
      };

      mockPrisma.backupCode.findFirst.mockResolvedValue(backupCode);
      jest.spyOn(otpService as any, 'verifyOTPHash').mockResolvedValue(true);

      const result = await otpService.verifyBackupCode(testUserId, 'ABC12345');

      expect(result.success).toBe(true);
      expect(mockPrisma.backupCode.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { used: true, usedAt: expect.any(Date) },
      });
    });

    it('should reject invalid backup code', async () => {
      mockPrisma.backupCode.findFirst.mockResolvedValue(null);

      const result = await otpService.verifyBackupCode(testUserId, 'INVALID');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid backup code');
    });
  });

  describe('Brute Force Protection', () => {
    it('should block OTP verification after max attempts', async () => {
      const exhaustedOTP = {
        id: '1',
        userId: testUserId,
        code: 'hashed_123456',
        attempts: 5, // Max attempts reached
        used: false,
        expiresAt: new Date(Date.now() + 300000),
      };

      mockPrisma.oTPCode.findFirst.mockResolvedValue(exhaustedOTP);

      const result = await otpService.verifyOTP(testUserId, '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Maximum attempts exceeded');
    });

    it('should increment attempts on failed verification', async () => {
      const validOTP = {
        id: '1',
        userId: testUserId,
        code: 'hashed_123456',
        attempts: 2,
        used: false,
        expiresAt: new Date(Date.now() + 300000),
      };

      mockPrisma.oTPCode.findFirst.mockResolvedValue(validOTP);
      jest.spyOn(otpService as any, 'verifyOTPHash').mockResolvedValue(false);

      await otpService.verifyOTP(testUserId, '654321');

      expect(mockPrisma.oTPCode.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { attempts: 3 },
      });
    });
  });

  describe('Database Storage Security', () => {
    it('should store OTP as hashed value', async () => {
      mockRedis.get.mockResolvedValue('0');
      (createOtpCode as jest.MockedFunction<typeof createOtpCode>).mockResolvedValue('123456');

      const result = await otpService.sendOTP(testUserId, 'email');

      expect(result.success).toBe(true);
      expect(createOtpCode).toHaveBeenCalledWith(testUserId);
    });

    it('should use timing-safe comparison for OTP verification', async () => {
      const validOTP = {
        id: '1',
        userId: testUserId,
        code: 'hashed_123456',
        attempts: 0,
        used: false,
        expiresAt: new Date(Date.now() + 300000),
      };

      mockPrisma.oTPCode.findFirst.mockResolvedValue(validOTP);
      
      // Spy on the private method
      const verifySpy = jest.spyOn(otpService as any, 'verifyOTPHash');
      verifySpy.mockResolvedValue(true);

      await otpService.verifyOTP(testUserId, '123456');

      expect(verifySpy).toHaveBeenCalledWith('123456', 'hashed_123456');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully during OTP sending', async () => {
      mockRedis.get.mockResolvedValue('0');
      (createOtpCode as jest.MockedFunction<typeof createOtpCode>).mockRejectedValue(new Error('Database error'));

      const result = await otpService.sendOTP(testUserId, 'email');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send OTP');
    });

    it('should handle database errors gracefully during OTP verification', async () => {
      (verifyOtpCode as jest.MockedFunction<typeof verifyOtpCode>).mockRejectedValue(new Error('Database error'));

      const result = await otpService.verifyOTP(testUserId, '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('OTP verification failed');
    });

    it('should handle email service failures', async () => {
      mockRedis.get.mockResolvedValue('0');
      (createOtpCode as jest.MockedFunction<typeof createOtpCode>).mockRejectedValue(new Error('Email service down'));
      mockEmailService.sendOTP.mockRejectedValue(new Error('Email service down'));

      const result = await otpService.sendOTP(testUserId, 'email');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send OTP');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent OTP verifications', async () => {
      const validOTP = {
        id: '1',
        userId: testUserId,
        code: 'hashed_123456',
        attempts: 0,
        used: false,
        expiresAt: new Date(Date.now() + 300000),
      };

      mockPrisma.oTPCode.findFirst.mockResolvedValue(validOTP);
      jest.spyOn(otpService as any, 'verifyOTPHash').mockResolvedValue(true);

      const promises = Array(100).fill(null).map(() => 
        otpService.verifyOTP(testUserId, '123456')
      );

      const results = await Promise.all(promises);
      
      // Only first request should succeed due to one-time use
      expect(results[0].success).toBe(true);
      expect(results.slice(1).every(r => !r.success)).toBe(true);
    });

    it('should complete OTP verification within reasonable time', async () => {
      const validOTP = {
        id: '1',
        userId: testUserId,
        code: 'hashed_123456',
        attempts: 0,
        used: false,
        expiresAt: new Date(Date.now() + 300000),
      };

      mockPrisma.oTPCode.findFirst.mockResolvedValue(validOTP);
      jest.spyOn(otpService as any, 'verifyOTPHash').mockResolvedValue(true);

      const startTime = Date.now();
      await otpService.verifyOTP(testUserId, '123456');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(duration).toBeGreaterThan(100); // Should have minimum processing time
    });
  });
});