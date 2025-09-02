import { getUserFromRequest, getTestUserEmail } from '@/lib/auth-helpers';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Mock jose library
jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
}));

const mockedJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;

describe('auth-helpers', () => {
  let mockRequest: NextRequest;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Create a fresh mock request for each test
    mockRequest = {
      headers: {
        get: jest.fn(),
      },
      cookies: {
        get: jest.fn(),
      },
    } as unknown as NextRequest;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getUserFromRequest', () => {
    it('should return test user ID in test mode with x-test-user-id header', async () => {
      process.env.NODE_ENV = 'test';
      const testUserId = 'test-user-123';
      
      (mockRequest.headers.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-test-user-id') return testUserId;
        return null;
      });

      const result = await getUserFromRequest(mockRequest);
      expect(result).toBe(testUserId);
    });

    it('should return test user ID in local API mode with x-test-user-id header', async () => {
      process.env.LOCAL_API = 'true';
      const testUserId = 'local-user-456';
      
      (mockRequest.headers.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-test-user-id') return testUserId;
        return null;
      });

      const result = await getUserFromRequest(mockRequest);
      expect(result).toBe(testUserId);
    });

    it('should extract user ID from Authorization header Bearer token', async () => {
      process.env.NODE_ENV = 'production';
      const userId = 'bearer-user-789';
      const token = 'valid-jwt-token';
      
      (mockRequest.headers.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-test-user-id') return null;
        if (header === 'Authorization') return `Bearer ${token}`;
        return null;
      });
      
      (mockRequest.cookies.get as jest.Mock).mockReturnValue(undefined);
      
      mockedJwtVerify.mockResolvedValue({
        payload: { sub: userId },
        protectedHeader: {}
      } as any);

      const result = await getUserFromRequest(mockRequest);
      expect(result).toBe(userId);
      expect(mockedJwtVerify).toHaveBeenCalledWith(token, expect.any(Uint8Array));
    });

    it('should extract user ID from session cookie when no Authorization header', async () => {
      process.env.NODE_ENV = 'production';
      const userId = 'cookie-user-101';
      const sessionToken = 'session-jwt-token';
      
      (mockRequest.headers.get as jest.Mock).mockReturnValue(null);
      (mockRequest.cookies.get as jest.Mock).mockImplementation((name: string) => {
        if (name === 'session') return { value: sessionToken };
        return undefined;
      });
      
      mockedJwtVerify.mockResolvedValue({
        payload: { sub: userId },
        protectedHeader: {}
      } as any);

      const result = await getUserFromRequest(mockRequest);
      expect(result).toBe(userId);
      expect(mockedJwtVerify).toHaveBeenCalledWith(sessionToken, expect.any(Uint8Array));
    });

    it('should return null when no token is found', async () => {
      process.env.NODE_ENV = 'production';
      
      (mockRequest.headers.get as jest.Mock).mockReturnValue(null);
      (mockRequest.cookies.get as jest.Mock).mockReturnValue(undefined);

      const result = await getUserFromRequest(mockRequest);
      expect(result).toBeNull();
    });

    it('should return null when JWT verification fails', async () => {
      process.env.NODE_ENV = 'production';
      const token = 'invalid-jwt-token';
      
      (mockRequest.headers.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Authorization') return `Bearer ${token}`;
        return null;
      });
      
      mockedJwtVerify.mockRejectedValue(new Error('Invalid token'));

      const result = await getUserFromRequest(mockRequest);
      expect(result).toBeNull();
    });

    it('should handle malformed Authorization header', async () => {
      process.env.NODE_ENV = 'production';
      
      (mockRequest.headers.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Authorization') return 'InvalidFormat token';
        return null;
      });
      
      (mockRequest.cookies.get as jest.Mock).mockReturnValue(undefined);

      const result = await getUserFromRequest(mockRequest);
      expect(result).toBeNull();
    });

    it('should prefer Authorization header over cookie when both exist', async () => {
      process.env.NODE_ENV = 'production';
      const userIdFromBearer = 'bearer-priority-user';
      const bearerToken = 'bearer-token';
      const sessionToken = 'session-token';
      
      (mockRequest.headers.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Authorization') return `Bearer ${bearerToken}`;
        return null;
      });
      
      (mockRequest.cookies.get as jest.Mock).mockImplementation((name: string) => {
        if (name === 'session') return { value: sessionToken };
        return undefined;
      });
      
      mockedJwtVerify.mockResolvedValue({
        payload: { sub: userIdFromBearer },
        protectedHeader: {}
      } as any);

      const result = await getUserFromRequest(mockRequest);
      expect(result).toBe(userIdFromBearer);
      expect(mockedJwtVerify).toHaveBeenCalledWith(bearerToken, expect.any(Uint8Array));
      expect(mockedJwtVerify).not.toHaveBeenCalledWith(sessionToken, expect.any(Uint8Array));
    });

    it('should handle empty Bearer token', async () => {
      process.env.NODE_ENV = 'production';
      
      (mockRequest.headers.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Authorization') return 'Bearer ';
        return null;
      });
      
      (mockRequest.cookies.get as jest.Mock).mockReturnValue(undefined);

      const result = await getUserFromRequest(mockRequest);
      expect(result).toBeNull();
    });

    it('should handle missing payload.sub in JWT', async () => {
      process.env.NODE_ENV = 'production';
      const token = 'jwt-without-sub';
      
      (mockRequest.headers.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Authorization') return `Bearer ${token}`;
        return null;
      });
      
      mockedJwtVerify.mockResolvedValue({
        payload: {}, // No sub field
        protectedHeader: {}
      } as any);

      const result = await getUserFromRequest(mockRequest);
      expect(result).toBeUndefined(); // Will be undefined when sub is missing
    });
  });

  describe('getTestUserEmail', () => {
    it('should return test user email in test mode', () => {
      process.env.NODE_ENV = 'test';
      const testEmail = 'test@example.com';
      
      (mockRequest.headers.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-test-user-email') return testEmail;
        return null;
      });

      const result = getTestUserEmail(mockRequest);
      expect(result).toBe(testEmail);
    });

    it('should return test user email in local API mode', () => {
      process.env.LOCAL_API = 'true';
      const testEmail = 'local@example.com';
      
      (mockRequest.headers.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-test-user-email') return testEmail;
        return null;
      });

      const result = getTestUserEmail(mockRequest);
      expect(result).toBe(testEmail);
    });

    it('should return null in production mode', () => {
      process.env.NODE_ENV = 'production';
      const testEmail = 'test@example.com';
      
      (mockRequest.headers.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-test-user-email') return testEmail;
        return null;
      });

      const result = getTestUserEmail(mockRequest);
      expect(result).toBeNull();
    });

    it('should return null when header is not present', () => {
      process.env.NODE_ENV = 'test';
      
      (mockRequest.headers.get as jest.Mock).mockReturnValue(null);

      const result = getTestUserEmail(mockRequest);
      expect(result).toBeNull();
    });

    it('should handle empty header value', () => {
      process.env.NODE_ENV = 'test';
      
      (mockRequest.headers.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-test-user-email') return '';
        return null;
      });

      const result = getTestUserEmail(mockRequest);
      expect(result).toBe('');
    });

    it('should handle undefined environment variables', () => {
      delete process.env.NODE_ENV;
      delete process.env.LOCAL_API;
      const testEmail = 'test@example.com';
      
      (mockRequest.headers.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-test-user-email') return testEmail;
        return null;
      });

      const result = getTestUserEmail(mockRequest);
      expect(result).toBeNull();
    });
  });
});