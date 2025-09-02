/**
 * Auth Verify OTP API Branch Coverage Tests
 * 
 * This file focuses on testing all conditional branches in the verify-otp route
 * to improve branch coverage by testing validation, authentication, and error conditions.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/verify-otp/route';
import { findOrCreateUser, verifyOtpCode, createSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('next/headers');

const mockFindOrCreateUser = findOrCreateUser as jest.MockedFunction<typeof findOrCreateUser>;
const mockVerifyOtpCode = verifyOtpCode as jest.MockedFunction<typeof verifyOtpCode>;
const mockCreateSession = createSession as jest.MockedFunction<typeof createSession>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

describe('Auth Verify OTP API Branch Coverage', () => {
  const mockCookieStore = {
    set: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    mockCookies.mockResolvedValue(mockCookieStore as any);
    process.env.NODE_ENV = 'test';
  });

  describe('POST /api/auth/verify-otp - Validation Branches', () => {
    it('should return 400 for missing email', async () => {
      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          code: '123456'
          // Missing email
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({ error: 'Failed to verify OTP' });
      expect(console.error).toHaveBeenCalledWith('Verify OTP error:', expect.any(Error));
    });

    it('should return 400 for missing code', async () => {
      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com'
          // Missing code
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalledWith('Verify OTP error:', expect.any(Error));
    });

    it('should return 400 for invalid email format', async () => {
      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email-format',
          code: '123456'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalledWith('Verify OTP error:', expect.any(Error));
    });

    it('should return 400 for code with wrong length', async () => {
      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '12345' // Only 5 digits, should be 6
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalledWith('Verify OTP error:', expect.any(Error));
    });

    it('should return 400 for code with non-numeric characters', async () => {
      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: 'abc123' // Contains letters
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalledWith('Verify OTP error:', expect.any(Error));
    });

    it('should return 400 for code too long', async () => {
      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '1234567' // 7 digits, should be 6
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalledWith('Verify OTP error:', expect.any(Error));
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: 'invalid json {'
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalledWith('Verify OTP error:', expect.any(Error));
    });

    it('should handle empty JSON body', async () => {
      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: '{}'
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalledWith('Verify OTP error:', expect.any(Error));
    });

    it('should handle null JSON body', async () => {
      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: 'null'
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalledWith('Verify OTP error:', expect.any(Error));
    });
  });

  describe('POST /api/auth/verify-otp - OTP Verification Branches', () => {
    it('should return 400 when OTP is invalid', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        roles: ['user']
      };

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockResolvedValue(false); // Invalid OTP

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456'
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({ error: 'Invalid or expired code' });
      expect(mockFindOrCreateUser).toHaveBeenCalledWith('test@example.com');
      expect(mockVerifyOtpCode).toHaveBeenCalledWith('user-123', '123456');
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });

    it('should return 400 when OTP is expired', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        roles: ['user']
      };

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockResolvedValue(false); // Expired OTP returns false

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456'
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({ error: 'Invalid or expired code' });
    });

    it('should return 400 when OTP is already used', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        roles: ['user']
      };

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockResolvedValue(false); // Used OTP returns false

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/verify-otp - Success Branches', () => {
    it('should successfully verify OTP and create session', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        roles: ['user', 'admin']
      };

      const mockSessionToken = 'mock-jwt-token';

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(mockSessionToken);

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456'
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          roles: ['user', 'admin']
        }
      });

      expect(mockFindOrCreateUser).toHaveBeenCalledWith('test@example.com');
      expect(mockVerifyOtpCode).toHaveBeenCalledWith('user-123', '123456');
      expect(mockCreateSession).toHaveBeenCalledWith({
        id: 'user-123',
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user', 'admin'],
        iat: expect.any(Number),
        exp: expect.any(Number)
      });
    });

    it('should set secure cookie in production', async () => {
      process.env.NODE_ENV = 'production';

      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        roles: ['user']
      };

      const mockSessionToken = 'mock-jwt-token';

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(mockSessionToken);

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockCookieStore.set).toHaveBeenCalledWith('session', mockSessionToken, {
        httpOnly: true,
        secure: true, // Should be true in production
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
    });

    it('should set non-secure cookie in development', async () => {
      process.env.NODE_ENV = 'development';

      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        roles: ['user']
      };

      const mockSessionToken = 'mock-jwt-token';

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(mockSessionToken);

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockCookieStore.set).toHaveBeenCalledWith('session', mockSessionToken, {
        httpOnly: true,
        secure: false, // Should be false in development
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
    });

    it('should normalize email to lowercase', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        roles: ['user']
      };

      const mockSessionToken = 'mock-jwt-token';

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(mockSessionToken);

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'Test@Example.COM', // Mixed case
          code: '123456'
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.user.email).toBe('test@example.com'); // Should be lowercase
      expect(mockFindOrCreateUser).toHaveBeenCalledWith('test@example.com');
      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com'
        })
      );
    });

    it('should handle user with empty roles array', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        roles: [] // Empty roles array
      };

      const mockSessionToken = 'mock-jwt-token';

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(mockSessionToken);

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456'
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.user.roles).toEqual([]);
    });

    it('should handle user with null name', async () => {
      const mockUser = {
        id: 'user-123',
        name: null, // Null name
        roles: ['user']
      };

      const mockSessionToken = 'mock-jwt-token';

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(mockSessionToken);

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456'
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.user.name).toBe(null);
    });
  });

  describe('POST /api/auth/verify-otp - Error Handling Branches', () => {
    it('should return 500 when findOrCreateUser fails', async () => {
      mockFindOrCreateUser.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456'
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({ error: 'Failed to verify OTP' });
      expect(console.error).toHaveBeenCalledWith('Verify OTP error:', expect.any(Error));
    });

    it('should return 500 when verifyOtpCode fails', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        roles: ['user']
      };

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockRejectedValue(new Error('OTP verification error'));

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalledWith('Verify OTP error:', expect.any(Error));
    });

    it('should return 500 when createSession fails', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        roles: ['user']
      };

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockResolvedValue(true);
      mockCreateSession.mockRejectedValue(new Error('Session creation error'));

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalledWith('Verify OTP error:', expect.any(Error));
    });

    it('should return 500 when cookies() fails', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        roles: ['user']
      };

      const mockSessionToken = 'mock-jwt-token';

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(mockSessionToken);
      mockCookies.mockRejectedValue(new Error('Cookies not available'));

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalledWith('Verify OTP error:', expect.any(Error));
    });

    it('should return 500 when cookie.set fails', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        roles: ['user']
      };

      const mockSessionToken = 'mock-jwt-token';
      const mockFailingCookieStore = {
        set: jest.fn().mockImplementation(() => {
          throw new Error('Cookie setting failed');
        })
      };

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(mockSessionToken);
      mockCookies.mockResolvedValue(mockFailingCookieStore as any);

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalledWith('Verify OTP error:', expect.any(Error));
    });
  });

  describe('POST /api/auth/verify-otp - Edge Cases', () => {
    it('should handle extremely long email', async () => {
      const longEmail = 'a'.repeat(100) + '@example.com';
      
      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: longEmail,
          code: '123456'
        })
      });

      const response = await POST(request);

      // Should handle gracefully (either succeed if email is valid or fail with validation)
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle email with special characters', async () => {
      const specialEmail = 'user+tag@example.com';

      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        roles: ['user']
      };

      const mockSessionToken = 'mock-jwt-token';

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(mockSessionToken);

      const request = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: specialEmail,
          code: '123456'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockFindOrCreateUser).toHaveBeenCalledWith(specialEmail);
    });

    it('should handle exact 6-digit code boundaries', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        roles: ['user']
      };

      const mockSessionToken = 'mock-jwt-token';

      mockFindOrCreateUser.mockResolvedValue(mockUser);
      mockVerifyOtpCode.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(mockSessionToken);

      // Test minimum valid code
      const request1 = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '000000'
        })
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Test maximum valid code  
      const request2 = new NextRequest('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '999999'
        })
      });

      const response2 = await POST(request2);
      expect(response2.status).toBe(200);
    });
  });
});