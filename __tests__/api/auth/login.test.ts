import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/login/route';
import { POST as LogoutPOST } from '@/app/api/auth/logout/route';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

// Mock external dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
    },
    loginAttempt: {
      create: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs');
jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mockJwtToken')
  })),
  jwtVerify: jest.fn()
}));

describe('POST /api/auth/login', () => {
  let mockUser: any;
  let mockSession: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUser = {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedPassword123',
      isEmailVerified: true,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockSession = {
      id: 'session123',
      userId: 'user123',
      token: 'sessionToken123',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };
  });

  afterEach(async () => {
    // Clean up any test data
    jest.restoreAllMocks();
  });

  describe('Email/Password Login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);
      (prisma.loginAttempt.create as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'validPassword123',
        })
      });

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('token');
      expect(responseData.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
    });

    it('should fail login with invalid email', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      });

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        success: false,
        error: 'Invalid credentials',
      });
    });

    it('should fail login with incorrect password', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prisma.loginAttempt.create as jest.Mock).mockResolvedValue({});
      (prisma.loginAttempt.count as jest.Mock).mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongPassword',
        })
      });

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        success: false,
        error: 'Invalid credentials',
      });
      expect(prisma.loginAttempt.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
          successful: false,
        },
      });
    });

    it('should fail login for unverified email', async () => {
      // Arrange
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(unverifiedUser);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'validPassword123',
        })
      });

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(responseData).toEqual({
        success: false,
        error: 'Email not verified. Please check your email and verify your account.',
      });
    });

    it('should fail login for inactive account', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(inactiveUser);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'validPassword123',
        })
      });

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(responseData).toEqual({
        success: false,
        error: 'Account has been deactivated. Please contact support.',
      });
    });
  });

  describe('Account Lockout', () => {
    it('should lock account after maximum failed attempts', async () => {
      // Arrange
      const lockedUser = {
        ...mockUser,
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(lockedUser);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'validPassword123',
        })
      });

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(423);
      expect(responseData).toEqual({
        success: false,
        error: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
        lockedUntil: lockedUser.lockedUntil.toISOString(),
      });
    });

    it('should unlock account after lockout period expires', async () => {
      // Arrange
      const expiredLockUser = {
        ...mockUser,
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() - 1000), // 1 second ago
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(expiredLockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);
      (prisma.loginAttempt.create as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'validPassword123',
        })
      });

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });
  });

  describe('Session Management', () => {
    it('should create new session on successful login', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);
      (prisma.loginAttempt.create as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'validPassword123',
        })
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          token: expect.any(String),
          expiresAt: expect.any(Date),
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
        },
      });
    });

    it('should invalidate existing sessions on new login', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.session.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);
      (prisma.loginAttempt.create as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'validPassword123',
          invalidateOtherSessions: true,
        })
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
        },
      });
      expect(response.status).toBe(200);
    });

    it('should handle remember me functionality', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      const longSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      };
      (prisma.session.create as jest.Mock).mockResolvedValue(longSession);
      (prisma.loginAttempt.create as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'validPassword123',
          rememberMe: true,
        })
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123',
        })
      });

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        success: false,
        error: 'Invalid email format',
      });
    });

    it('should require both email and password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
        })
      });

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        success: false,
        error: 'Password is required',
      });
    });
  });
});

describe('POST /api/auth/logout', () => {
  it('should successfully logout and invalidate session', async () => {
    // Arrange
    const sessionToken = 'validSessionToken';
    (prisma.session.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
    });

    // Act
    const response = await LogoutPOST(request);
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseData).toEqual({
      success: true,
      message: 'Logged out successfully',
    });
  });

  it('should handle logout without valid session gracefully', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    // Act
    const response = await LogoutPOST(request);
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseData).toEqual({
      success: true,
      message: 'Logged out successfully',
    });
  });
});