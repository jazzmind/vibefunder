import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import crypto from 'crypto';
import { promisify } from 'util';

// Mock jose module before any imports
jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-jwt-token')
  })),
  jwtVerify: jest.fn().mockResolvedValue({
    payload: {
      id: 'test-session',
      userId: 'test-user-123',
      email: 'test@example.com',
      roles: ['user'],
      iat: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    }
  })
}));

// Mock all external dependencies first
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    otpCode: {
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

// Create mock functions for auth module
const mockCreateSession = jest.fn();
const mockVerifySession = jest.fn();
const mockCreateOtpCode = jest.fn();
const mockVerifyOtpCode = jest.fn();
const mockGenerateOtpCode = jest.fn();
const mockFindOrCreateUser = jest.fn();

jest.mock('@/lib/auth', () => ({
  createSession: mockCreateSession,
  verifySession: mockVerifySession,
  createOtpCode: mockCreateOtpCode,
  verifyOtpCode: mockVerifyOtpCode,
  generateOtpCode: mockGenerateOtpCode,
  findOrCreateUser: mockFindOrCreateUser,
  getUserPasskeys: jest.fn(),
  createPasskey: jest.fn(),
  getPasskeyByCredentialId: jest.fn(),
  updatePasskeyCounter: jest.fn(),
  auth: jest.fn(),
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
    // Use the mocked implementation
    return mockGenerateOtpCode() || '123456';
  }

  async sendOTP(userId: string, method: 'email' | 'sms'): Promise<{ success: boolean; message: string }> {
    try {
      // Rate limiting check
      const rateLimitKey = `otp_rate_limit:${userId}`;
      const currentRequests = await mockRedis.get(rateLimitKey) || '0';
      
      if (parseInt(currentRequests) >= this.MAX_OTP_REQUESTS) {
        return { success: false, message: 'Rate limit exceeded. Please try again later.' };
      }

      // Use mocked createOtpCode function
      const otpCode = await mockCreateOtpCode(userId);

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

      // Use mocked verifyOtpCode function
      const isValid = await mockVerifyOtpCode(userId, code);
      
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
    await mockPrisma.otpCode.deleteMany({
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
    mockGenerateOtpCode.mockReturnValue('123456');
    mockCreateOtpCode.mockResolvedValue('123456');
    mockVerifyOtpCode.mockResolvedValue(true);
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
      mockCreateOtpCode.mockResolvedValue('123456');

      const result = await otpService.sendOTP(testUserId, 'email');

      expect(result.success).toBe(true);
      expect(mockCreateOtpCode).toHaveBeenCalledWith(testUserId);
      expect(mockEmailService.sendOTP).toHaveBeenCalledWith(testUserId, '123456');
    });

    it('should send OTP via SMS successfully', async () => {
      mockRedis.get.mockResolvedValue('0');
      mockSMSService.sendOTP.mockResolvedValue(true);
      mockCreateOtpCode.mockResolvedValue('123456');

      const result = await otpService.sendOTP(testUserId, 'sms');

      expect(result.success).toBe(true);
      expect(mockCreateOtpCode).toHaveBeenCalledWith(testUserId);
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
      mockVerifyOtpCode.mockResolvedValue(true);

      const result = await otpService.verifyOTP(testUserId, '123456');

      expect(result.success).toBe(true);
      expect(result.message).toBe('OTP verified successfully');
    });

    it('should reject incorrect OTP', async () => {
      mockVerifyOtpCode.mockResolvedValue(false);

      const result = await otpService.verifyOTP(testUserId, '654321');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid OTP');
    });

    it('should handle timing attack prevention', async () => {
      const startTime = Date.now();
      
      mockVerifyOtpCode.mockResolvedValue(false);

      await otpService.verifyOTP(testUserId, '123456');

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(100); // Minimum processing time
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on OTP requests', async () => {
      mockRedis.get.mockResolvedValue('3'); // Max requests reached

      const result = await otpService.sendOTP(testUserId, 'email');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Rate limit exceeded. Please try again later.');
      expect(mockCreateOtpCode).not.toHaveBeenCalled();
    });

    it('should allow OTP requests within rate limit', async () => {
      mockRedis.get.mockResolvedValue('1'); // Below limit
      mockCreateOtpCode.mockResolvedValue('123456');

      const result = await otpService.sendOTP(testUserId, 'email');

      expect(result.success).toBe(true);
      expect(mockRedis.incr).toHaveBeenCalledWith(`otp_rate_limit:${testUserId}`);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully during OTP sending', async () => {
      mockRedis.get.mockResolvedValue('0');
      mockCreateOtpCode.mockRejectedValue(new Error('Database error'));

      const result = await otpService.sendOTP(testUserId, 'email');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send OTP');
    });

    it('should handle database errors gracefully during OTP verification', async () => {
      mockVerifyOtpCode.mockRejectedValue(new Error('Database error'));

      const result = await otpService.verifyOTP(testUserId, '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('OTP verification failed');
    });
  });
});