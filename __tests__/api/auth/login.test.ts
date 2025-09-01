import request from 'supertest';
import { app } from '../../../src/app';
import { prisma } from '../../../src/lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { rateLimit } from '../../../src/middleware/rateLimiter';

// Mock external dependencies
jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    loginAttempt: {
      create: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../../src/middleware/rateLimiter');

describe('POST /api/auth/login', () => {
  let mockUser: any;
  let mockSession: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUser = {
      id: 'user123',
      email: 'test@example.com',
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
      (jwt.sign as jest.Mock).mockReturnValue('mockJwtToken');
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'validPassword123',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should fail login with invalid email', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid credentials',
      });
    });

    it('should fail login with incorrect password', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prisma.loginAttempt.create as jest.Mock).mockResolvedValue({});

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongPassword',
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
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

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'validPassword123',
        });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: 'Email not verified. Please check your email and verify your account.',
      });
    });

    it('should fail login for inactive account', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(inactiveUser);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'validPassword123',
        });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: 'Account has been deactivated. Please contact support.',
      });
    });
  });

  describe('Social Login', () => {
    describe('Google OAuth', () => {
      it('should successfully login with Google OAuth', async () => {
        // Mock Google OAuth verification
        const mockGoogleUser = {
          sub: 'google123',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
          email_verified: true,
        };

        // Arrange
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

        // Act
        const response = await request(app)
          .post('/api/auth/google')
          .send({
            idToken: 'mockGoogleIdToken',
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user.email).toBe('test@example.com');
      });

      it('should create new user for first-time Google login', async () => {
        // Arrange
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.user.create as jest.Mock).mockResolvedValue({
          ...mockUser,
          googleId: 'google123',
        });
        (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

        // Act
        const response = await request(app)
          .post('/api/auth/google')
          .send({
            idToken: 'mockGoogleIdToken',
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(prisma.user.create).toHaveBeenCalled();
      });
    });

    describe('GitHub OAuth', () => {
      it('should successfully login with GitHub OAuth', async () => {
        // Arrange
        const mockGitHubUser = {
          id: 'github123',
          email: 'test@example.com',
          name: 'Test User',
          avatar_url: 'https://github.com/avatar.jpg',
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          ...mockUser,
          githubId: 'github123',
        });
        (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

        // Act
        const response = await request(app)
          .post('/api/auth/github')
          .send({
            code: 'mockGitHubCode',
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('token');
      });

      it('should fail GitHub login with invalid code', async () => {
        // Act
        const response = await request(app)
          .post('/api/auth/github')
          .send({
            code: 'invalidCode',
          });

        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          success: false,
          error: 'Invalid GitHub authorization code',
        });
      });
    });
  });

  describe('Rate Limiting and Brute Force Protection', () => {
    it('should enforce rate limiting on login attempts', async () => {
      // Arrange
      (rateLimit as jest.Mock).mockImplementation((req, res, next) => {
        res.status(429).json({
          success: false,
          error: 'Too many login attempts. Please try again later.',
        });
      });

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      // Assert
      expect(response.status).toBe(429);
      expect(response.body).toEqual({
        success: false,
        error: 'Too many login attempts. Please try again later.',
      });
    });

    it('should track failed login attempts by IP', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prisma.loginAttempt.count as jest.Mock).mockResolvedValue(3);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongPassword',
        });

      // Assert
      expect(response.status).toBe(401);
      expect(prisma.loginAttempt.count).toHaveBeenCalledWith({
        where: {
          ipAddress: expect.any(String),
          successful: false,
          createdAt: {
            gte: expect.any(Date),
          },
        },
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

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'validPassword123',
        });

      // Assert
      expect(response.status).toBe(423);
      expect(response.body).toEqual({
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

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'validPassword123',
        });

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
      (jwt.sign as jest.Mock).mockReturnValue('mockJwtToken');
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'validPassword123',
        });

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
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should invalidate existing sessions on new login', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.session.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'validPassword123',
          invalidateOtherSessions: true,
        });

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
      (jwt.sign as jest.Mock).mockReturnValue('mockJwtToken');
      
      const longSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      };
      (prisma.session.create as jest.Mock).mockResolvedValue(longSession);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'validPassword123',
          rememberMe: true,
        });

      // Assert
      expect(response.status).toBe(200);
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      });
      
      const sessionCall = (prisma.session.create as jest.Mock).mock.calls[0][0];
      const expiresAt = sessionCall.data.expiresAt;
      const thirtyDaysFromNow = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000);
      expect(expiresAt.getTime()).toBeGreaterThan(thirtyDaysFromNow.getTime());
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid email format',
      });
    });

    it('should require both email and password', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Email and password are required',
      });
    });

    it('should sanitize input to prevent injection attacks', async () => {
      // Arrange
      const maliciousEmail = "'; DROP TABLE users; --";
      
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: maliciousEmail,
          password: 'password123',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid email format',
      });
    });
  });

  describe('Security Headers and CORS', () => {
    it('should include security headers in response', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'validPassword123',
        });

      // Assert
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should set secure cookie attributes in production', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'validPassword123',
        });

      // Assert
      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader[0]).toContain('Secure');
      expect(setCookieHeader[0]).toContain('HttpOnly');
      expect(setCookieHeader[0]).toContain('SameSite=Strict');

      // Cleanup
      process.env.NODE_ENV = 'test';
    });
  });
});

describe('POST /api/auth/logout', () => {
  it('should successfully logout and invalidate session', async () => {
    // Arrange
    const sessionToken = 'validSessionToken';
    (prisma.session.delete as jest.Mock).mockResolvedValue({ id: 'session123' });

    // Act
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send();

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Logged out successfully',
    });
    expect(prisma.session.delete).toHaveBeenCalled();
  });

  it('should handle logout without valid session gracefully', async () => {
    // Act
    const response = await request(app)
      .post('/api/auth/logout')
      .send();

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Logged out successfully',
    });
  });
});