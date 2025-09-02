import {
  createSession,
  verifySession,
  generateOtpCode,
  createOtpCode,
  verifyOtpCode,
  findOrCreateUser,
  getUserPasskeys,
  createPasskey,
  getPasskeyByCredentialId,
  updatePasskeyCounter,
  auth,
  SessionPayload
} from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    otpCode: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn()
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn()
    },
    passkey: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

jest.mock('jose');
jest.mock('crypto');

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockedSignJWT = SignJWT as jest.MockedClass<typeof SignJWT>;
const mockedJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;
const mockedCrypto = crypto as jest.Mocked<typeof crypto>;

describe('auth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createSession', () => {
    it('should create JWT session successfully', async () => {
      const payload: SessionPayload = {
        id: 'session_123',
        userId: 'user_123',
        email: 'test@example.com',
        roles: ['user'],
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      };

      const mockJwtInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue('signed_jwt_token')
      };

      mockedSignJWT.mockReturnValue(mockJwtInstance as any);

      const result = await createSession(payload);

      expect(SignJWT).toHaveBeenCalledWith(payload);
      expect(mockJwtInstance.setProtectedHeader).toHaveBeenCalledWith({ alg: 'HS256' });
      expect(mockJwtInstance.setIssuedAt).toHaveBeenCalled();
      expect(mockJwtInstance.setExpirationTime).toHaveBeenCalledWith('7d');
      expect(result).toBe('signed_jwt_token');
    });

    it('should handle JWT creation errors', async () => {
      const payload: SessionPayload = {
        id: 'session_123',
        userId: 'user_123',
        email: 'test@example.com',
        roles: ['user'],
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      };

      const mockJwtInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockRejectedValue(new Error('JWT signing failed'))
      };

      mockedSignJWT.mockReturnValue(mockJwtInstance as any);

      await expect(createSession(payload)).rejects.toThrow('JWT signing failed');
    });
  });

  describe('verifySession', () => {
    it('should verify valid JWT token', async () => {
      const mockPayload: SessionPayload = {
        id: 'session_123',
        userId: 'user_123',
        email: 'test@example.com',
        roles: ['user'],
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      };

      mockedJwtVerify.mockResolvedValue({
        payload: mockPayload as any,
        protectedHeader: {}
      } as any);

      const result = await verifySession('valid_jwt_token');

      expect(jwtVerify).toHaveBeenCalledWith('valid_jwt_token', expect.any(Uint8Array));
      expect(result).toEqual(mockPayload);
    });

    it('should return null for invalid JWT token', async () => {
      mockedJwtVerify.mockRejectedValue(new Error('Invalid token'));

      const result = await verifySession('invalid_jwt_token');

      expect(result).toBeNull();
    });

    it('should return null for expired JWT token', async () => {
      mockedJwtVerify.mockRejectedValue(new Error('Token expired'));

      const result = await verifySession('expired_jwt_token');

      expect(result).toBeNull();
    });
  });

  describe('generateOtpCode', () => {
    it('should generate 6-digit OTP code', () => {
      mockedCrypto.randomInt.mockReturnValue(123456);

      const result = generateOtpCode();

      expect(crypto.randomInt).toHaveBeenCalledWith(100000, 999999);
      expect(result).toBe('123456');
    });

    it('should handle minimum OTP value', () => {
      mockedCrypto.randomInt.mockReturnValue(100000);

      const result = generateOtpCode();

      expect(result).toBe('100000');
    });

    it('should handle maximum OTP value', () => {
      mockedCrypto.randomInt.mockReturnValue(999999);

      const result = generateOtpCode();

      expect(result).toBe('999999');
    });
  });

  describe('createOtpCode', () => {
    it('should create new OTP code and invalidate existing ones', async () => {
      const userId = 'user_123';
      const mockCode = '123456';
      
      mockedCrypto.randomInt.mockReturnValue(123456);
      mockedPrisma.otpCode.updateMany.mockResolvedValue({ count: 2 });
      mockedPrisma.otpCode.create.mockResolvedValue({
        id: 'otp_123',
        userId,
        code: mockCode,
        expiresAt: new Date(),
        used: false,
        createdAt: new Date()
      });

      const result = await createOtpCode(userId);

      expect(mockedPrisma.otpCode.updateMany).toHaveBeenCalledWith({
        where: { userId, used: false },
        data: { used: true }
      });

      expect(mockedPrisma.otpCode.create).toHaveBeenCalledWith({
        data: {
          userId,
          code: mockCode,
          expiresAt: expect.any(Date)
        }
      });

      expect(result).toBe(mockCode);
    });

    it('should handle database errors during OTP creation', async () => {
      const userId = 'user_123';
      
      mockedCrypto.randomInt.mockReturnValue(123456);
      mockedPrisma.otpCode.updateMany.mockResolvedValue({ count: 0 });
      mockedPrisma.otpCode.create.mockRejectedValue(new Error('Database error'));

      await expect(createOtpCode(userId)).rejects.toThrow('Database error');
    });
  });

  describe('verifyOtpCode', () => {
    it('should verify valid OTP code', async () => {
      const userId = 'user_123';
      const code = '123456';
      const mockOtpCode = {
        id: 'otp_123',
        userId,
        code,
        used: false,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date()
      };

      mockedPrisma.otpCode.findFirst.mockResolvedValue(mockOtpCode);
      mockedPrisma.otpCode.update.mockResolvedValue({
        ...mockOtpCode,
        used: true
      });

      const result = await verifyOtpCode(userId, code);

      expect(mockedPrisma.otpCode.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          code,
          used: false,
          expiresAt: { gt: expect.any(Date) }
        }
      });

      expect(mockedPrisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: mockOtpCode.id },
        data: { used: true }
      });

      expect(result).toBe(true);
    });

    it('should return false for invalid OTP code', async () => {
      const userId = 'user_123';
      const code = '999999';

      mockedPrisma.otpCode.findFirst.mockResolvedValue(null);

      const result = await verifyOtpCode(userId, code);

      expect(result).toBe(false);
    });

    it('should return false for expired OTP code', async () => {
      const userId = 'user_123';
      const code = '123456';

      // Mock returns null because expired codes are filtered out by the query
      mockedPrisma.otpCode.findFirst.mockResolvedValue(null);

      const result = await verifyOtpCode(userId, code);

      expect(result).toBe(false);
    });

    it('should return false for already used OTP code', async () => {
      const userId = 'user_123';
      const code = '123456';

      // Mock returns null because used codes are filtered out by the query
      mockedPrisma.otpCode.findFirst.mockResolvedValue(null);

      const result = await verifyOtpCode(userId, code);

      expect(result).toBe(false);
    });
  });

  describe('findOrCreateUser', () => {
    it('should return existing user', async () => {
      const email = 'existing@example.com';
      const existingUser = {
        id: 'user_123',
        name: 'Existing User',
        roles: ['user']
      };

      mockedPrisma.user.findUnique.mockResolvedValue(existingUser);

      const result = await findOrCreateUser(email);

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        select: { id: true, name: true, roles: true }
      });

      expect(result).toEqual(existingUser);
      expect(mockedPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should create new user when not found', async () => {
      const email = 'new@example.com';
      const newUser = {
        id: 'user_456',
        name: 'new',
        roles: []
      };

      mockedPrisma.user.findUnique.mockResolvedValue(null);
      mockedPrisma.user.create.mockResolvedValue(newUser);

      const result = await findOrCreateUser(email);

      expect(mockedPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email,
          name: 'new',
          roles: []
        },
        select: { id: true, name: true, roles: true }
      });

      expect(result).toEqual(newUser);
    });

    it('should handle complex email addresses', async () => {
      const email = 'user.name+tag@subdomain.example.com';
      
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      mockedPrisma.user.create.mockResolvedValue({
        id: 'user_789',
        name: 'user.name+tag',
        roles: []
      });

      await findOrCreateUser(email);

      expect(mockedPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email,
          name: 'user.name+tag',
          roles: []
        },
        select: { id: true, name: true, roles: true }
      });
    });
  });

  describe('Passkey management', () => {
    describe('getUserPasskeys', () => {
      it('should return user passkeys ordered by lastUsed', async () => {
        const userId = 'user_123';
        const mockPasskeys = [
          { id: 'pk_1', credentialId: 'cred_1', name: 'Phone', lastUsed: new Date('2023-12-01') },
          { id: 'pk_2', credentialId: 'cred_2', name: 'Laptop', lastUsed: new Date('2023-11-01') }
        ];

        mockedPrisma.passkey.findMany.mockResolvedValue(mockPasskeys);

        const result = await getUserPasskeys(userId);

        expect(mockedPrisma.passkey.findMany).toHaveBeenCalledWith({
          where: { userId },
          orderBy: { lastUsed: 'desc' }
        });

        expect(result).toEqual(mockPasskeys);
      });
    });

    describe('createPasskey', () => {
      it('should create new passkey', async () => {
        const userId = 'user_123';
        const credentialId = 'cred_123';
        const publicKey = 'public_key_data';
        const name = 'My Passkey';
        
        const mockPasskey = {
          id: 'pk_123',
          userId,
          credentialId,
          publicKey,
          name,
          counter: 0,
          lastUsed: null,
          createdAt: new Date()
        };

        mockedPrisma.passkey.create.mockResolvedValue(mockPasskey);

        const result = await createPasskey(userId, credentialId, publicKey, name);

        expect(mockedPrisma.passkey.create).toHaveBeenCalledWith({
          data: {
            userId,
            credentialId,
            publicKey,
            name,
            counter: 0
          }
        });

        expect(result).toEqual(mockPasskey);
      });

      it('should create passkey without name', async () => {
        const userId = 'user_123';
        const credentialId = 'cred_123';
        const publicKey = 'public_key_data';

        await createPasskey(userId, credentialId, publicKey);

        expect(mockedPrisma.passkey.create).toHaveBeenCalledWith({
          data: {
            userId,
            credentialId,
            publicKey,
            name: undefined,
            counter: 0
          }
        });
      });
    });

    describe('getPasskeyByCredentialId', () => {
      it('should return passkey with user details', async () => {
        const credentialId = 'cred_123';
        const mockPasskey = {
          id: 'pk_123',
          credentialId,
          publicKey: 'public_key_data',
          counter: 5,
          user: {
            id: 'user_123',
            email: 'test@example.com',
            name: 'Test User'
          }
        };

        mockedPrisma.passkey.findUnique.mockResolvedValue(mockPasskey);

        const result = await getPasskeyByCredentialId(credentialId);

        expect(mockedPrisma.passkey.findUnique).toHaveBeenCalledWith({
          where: { credentialId },
          include: { user: true }
        });

        expect(result).toEqual(mockPasskey);
      });
    });

    describe('updatePasskeyCounter', () => {
      it('should update passkey counter and lastUsed timestamp', async () => {
        const credentialId = 'cred_123';
        const counter = 10;
        
        const mockUpdatedPasskey = {
          id: 'pk_123',
          credentialId,
          counter,
          lastUsed: new Date(),
          createdAt: new Date()
        };

        mockedPrisma.passkey.update.mockResolvedValue(mockUpdatedPasskey);

        const result = await updatePasskeyCounter(credentialId, counter);

        expect(mockedPrisma.passkey.update).toHaveBeenCalledWith({
          where: { credentialId },
          data: { 
            counter,
            lastUsed: expect.any(Date)
          }
        });

        expect(result).toEqual(mockUpdatedPasskey);
      });
    });
  });

  describe('auth', () => {
    it('should return user session from valid cookie', async () => {
      process.env.LOCAL_API = 'false';
      const mockPayload: SessionPayload = {
        id: 'session_123',
        userId: 'user_123',
        email: 'test@example.com',
        roles: ['user'],
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      };

      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'valid_session_token' })
      };

      mockedCookies.mockResolvedValue(mockCookieStore as any);
      mockedJwtVerify.mockResolvedValue({
        payload: mockPayload as any,
        protectedHeader: {}
      } as any);

      const result = await auth();

      expect(result).toEqual({ user: mockPayload });
    });

    it('should return null when no session cookie', async () => {
      process.env.LOCAL_API = 'false';
      
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(undefined)
      };

      mockedCookies.mockResolvedValue(mockCookieStore as any);

      const result = await auth();

      expect(result).toBeNull();
    });

    it('should return null when session verification fails', async () => {
      process.env.LOCAL_API = 'false';
      
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'invalid_session_token' })
      };

      mockedCookies.mockResolvedValue(mockCookieStore as any);
      mockedJwtVerify.mockRejectedValue(new Error('Invalid token'));

      const result = await auth();

      expect(result).toBeNull();
    });

    it('should return local API user when LOCAL_API is true', async () => {
      process.env.LOCAL_API = 'true';

      const mockTestUser = {
        id: 'test_user_123',
        email: 'test@example.com'
      };

      mockedPrisma.user.findFirst.mockResolvedValue(mockTestUser);

      const result = await auth();

      expect(result).toEqual({
        user: {
          id: mockTestUser.id,
          userId: mockTestUser.id,
          email: mockTestUser.email,
          roles: ['user', 'admin'],
          iat: expect.any(Number),
          exp: expect.any(Number)
        }
      });
    });

    it('should return fallback user when LOCAL_API is true but no test user found', async () => {
      process.env.LOCAL_API = 'true';

      mockedPrisma.user.findFirst.mockResolvedValue(null);

      const result = await auth();

      expect(result).toEqual({
        user: {
          id: 'test-session',
          userId: 'localhost-user',
          email: 'localhost@test.com',
          roles: ['user', 'admin'],
          iat: expect.any(Number),
          exp: expect.any(Number)
        }
      });
    });

    it('should handle database errors in LOCAL_API mode', async () => {
      process.env.LOCAL_API = 'true';

      mockedPrisma.user.findFirst.mockRejectedValue(new Error('Database connection failed'));

      const result = await auth();

      // Should fallback to mock session
      expect(result).toEqual({
        user: {
          id: 'test-session',
          userId: 'localhost-user',
          email: 'localhost@test.com',
          roles: ['user', 'admin'],
          iat: expect.any(Number),
          exp: expect.any(Number)
        }
      });
    });

    it('should handle cookies() throwing error', async () => {
      process.env.LOCAL_API = 'false';
      
      mockedCookies.mockRejectedValue(new Error('Cookies not available'));

      const result = await auth();

      expect(result).toBeNull();
    });
  });
});