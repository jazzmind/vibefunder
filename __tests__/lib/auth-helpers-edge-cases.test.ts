/**
 * Auth Helpers Edge Cases Tests - Branch Coverage Enhancement
 * 
 * This file focuses on testing all conditional branches in auth-helpers.ts
 * to improve branch coverage by at least 3%.
 */

import { NextRequest } from 'next/server';
import { getUserFromRequest, getTestUserEmail } from '@/lib/auth-helpers';
import { jwtVerify } from 'jose';

// Mock jose module
jest.mock('jose', () => ({
  jwtVerify: jest.fn()
}));

const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;

describe('Auth Helpers Edge Cases - Branch Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.LOCAL_API;
  });

  describe('getUserFromRequest - All Conditional Branches', () => {
    it('should return test user ID when in test mode with NODE_ENV=test', async () => {
      process.env.NODE_ENV = 'test';
      
      const mockHeaders = new Map([['x-test-user-id', 'test-user-123']]);
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        },
        cookies: {
          get: () => undefined
        }
      } as unknown as NextRequest;

      const result = await getUserFromRequest(request);
      expect(result).toBe('test-user-123');
    });

    it('should return test user ID when LOCAL_API=true', async () => {
      process.env.LOCAL_API = 'true';
      
      const mockHeaders = new Map([['x-test-user-id', 'local-test-user']]);
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        },
        cookies: {
          get: () => undefined
        }
      } as unknown as NextRequest;

      const result = await getUserFromRequest(request);
      expect(result).toBe('local-test-user');
    });

    it('should proceed with normal auth when in test mode but no test header present', async () => {
      process.env.NODE_ENV = 'test';
      
      const mockHeaders = new Map([['Authorization', 'Bearer valid-token']]);
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        },
        cookies: {
          get: () => undefined
        }
      } as unknown as NextRequest;

      mockJwtVerify.mockResolvedValueOnce({
        payload: { sub: 'jwt-user-id' } as any,
        protectedHeader: {} as any
      });

      const result = await getUserFromRequest(request);
      expect(result).toBe('jwt-user-id');
    });

    it('should get token from Authorization header when present', async () => {
      const mockHeaders = new Map([['Authorization', 'Bearer auth-token-123']]);
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        },
        cookies: {
          get: () => undefined
        }
      } as unknown as NextRequest;

      mockJwtVerify.mockResolvedValueOnce({
        payload: { sub: 'auth-header-user' } as any,
        protectedHeader: {} as any
      });

      const result = await getUserFromRequest(request);
      expect(result).toBe('auth-header-user');
      expect(mockJwtVerify).toHaveBeenCalledWith('auth-token-123', expect.any(Object));
    });

    it('should get token from cookie when Authorization header absent', async () => {
      const mockHeaders = new Map();
      const mockCookies = new Map([['session', { value: 'cookie-token-456' }]]);
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        },
        cookies: {
          get: (name: string) => mockCookies.get(name)
        }
      } as unknown as NextRequest;

      mockJwtVerify.mockResolvedValueOnce({
        payload: { sub: 'cookie-user' } as any,
        protectedHeader: {} as any
      });

      const result = await getUserFromRequest(request);
      expect(result).toBe('cookie-user');
      expect(mockJwtVerify).toHaveBeenCalledWith('cookie-token-456', expect.any(Object));
    });

    it('should return null when no token in header or cookie', async () => {
      const mockHeaders = new Map();
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        },
        cookies: {
          get: () => undefined
        }
      } as unknown as NextRequest;

      const result = await getUserFromRequest(request);
      expect(result).toBe(null);
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    it('should return null when JWT verification fails', async () => {
      const mockHeaders = new Map([['Authorization', 'Bearer invalid-token']]);
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        },
        cookies: {
          get: () => undefined
        }
      } as unknown as NextRequest;

      mockJwtVerify.mockRejectedValueOnce(new Error('Invalid token'));

      const result = await getUserFromRequest(request);
      expect(result).toBe(null);
    });

    it('should return null when Authorization header is malformed', async () => {
      const mockHeaders = new Map([['Authorization', 'InvalidFormat token']]);
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        },
        cookies: {
          get: () => undefined
        }
      } as unknown as NextRequest;

      const result = await getUserFromRequest(request);
      expect(result).toBe(null);
    });

    it('should handle Authorization header without Bearer prefix', async () => {
      const mockHeaders = new Map([['Authorization', 'direct-token']]);
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        },
        cookies: {
          get: () => undefined
        }
      } as unknown as NextRequest;

      mockJwtVerify.mockResolvedValueOnce({
        payload: { sub: 'direct-token-user' } as any,
        protectedHeader: {} as any
      });

      const result = await getUserFromRequest(request);
      expect(result).toBe('direct-token-user');
      expect(mockJwtVerify).toHaveBeenCalledWith('direct-token', expect.any(Object));
    });
  });

  describe('getTestUserEmail - All Conditional Branches', () => {
    it('should return test user email when NODE_ENV=test', () => {
      process.env.NODE_ENV = 'test';
      
      const mockHeaders = new Map([['x-test-user-email', 'test@example.com']]);
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        }
      } as unknown as NextRequest;

      const result = getTestUserEmail(request);
      expect(result).toBe('test@example.com');
    });

    it('should return test user email when LOCAL_API=true', () => {
      process.env.LOCAL_API = 'true';
      
      const mockHeaders = new Map([['x-test-user-email', 'local@example.com']]);
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        }
      } as unknown as NextRequest;

      const result = getTestUserEmail(request);
      expect(result).toBe('local@example.com');
    });

    it('should return null when not in test mode', () => {
      process.env.NODE_ENV = 'production';
      
      const mockHeaders = new Map([['x-test-user-email', 'test@example.com']]);
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        }
      } as unknown as NextRequest;

      const result = getTestUserEmail(request);
      expect(result).toBe(null);
    });

    it('should return null when in test mode but header is missing', () => {
      process.env.NODE_ENV = 'test';
      
      const mockHeaders = new Map();
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        }
      } as unknown as NextRequest;

      const result = getTestUserEmail(request);
      expect(result).toBe(null);
    });

    it('should return null when LOCAL_API is not true', () => {
      process.env.LOCAL_API = 'false';
      
      const mockHeaders = new Map([['x-test-user-email', 'test@example.com']]);
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        }
      } as unknown as NextRequest;

      const result = getTestUserEmail(request);
      expect(result).toBe(null);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle empty Authorization header', async () => {
      const mockHeaders = new Map([['Authorization', '']]);
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        },
        cookies: {
          get: () => undefined
        }
      } as unknown as NextRequest;

      const result = await getUserFromRequest(request);
      expect(result).toBe(null);
    });

    it('should handle null cookie value', async () => {
      const mockHeaders = new Map();
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        },
        cookies: {
          get: () => null
        }
      } as unknown as NextRequest;

      const result = await getUserFromRequest(request);
      expect(result).toBe(null);
    });

    it('should handle cookie without value property', async () => {
      const mockHeaders = new Map();
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        },
        cookies: {
          get: () => ({}) // Cookie object without value
        }
      } as unknown as NextRequest;

      const result = await getUserFromRequest(request);
      expect(result).toBe(null);
    });

    it('should handle JWT payload without sub field', async () => {
      const mockHeaders = new Map([['Authorization', 'Bearer token-without-sub']]);
      const request = {
        headers: {
          get: (name: string) => mockHeaders.get(name) || null
        },
        cookies: {
          get: () => undefined
        }
      } as unknown as NextRequest;

      mockJwtVerify.mockResolvedValueOnce({
        payload: {} as any, // No sub field
        protectedHeader: {} as any
      });

      const result = await getUserFromRequest(request);
      expect(result).toBe(undefined); // Should return undefined when no sub
    });
  });
});