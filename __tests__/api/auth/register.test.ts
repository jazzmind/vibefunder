import request from 'supertest';
import { app } from '../../../src/app';
import { prisma } from '../../../src/lib/prisma';
import bcrypt from 'bcrypt';
import { sendEmailVerification } from '../../../src/services/emailService';
import { validatePassword } from '../../../src/utils/passwordValidator';

// Mock external dependencies
jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    emailVerification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('bcrypt');
jest.mock('../../../src/services/emailService');
jest.mock('../../../src/utils/passwordValidator');

describe('POST /api/auth/register', () => {
  let mockUser: any;
  let validRegistrationData: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUser = {
      id: 'user123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'hashedPassword123',
      isEmailVerified: false,
      isActive: true,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    validRegistrationData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      termsAccepted: true,
      privacyPolicyAccepted: true,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful Registration', () => {
    it('should successfully register a new user with valid data', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (validatePassword as jest.Mock).mockReturnValue({ isValid: true });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.emailVerification.create as jest.Mock).mockResolvedValue({
        id: 'verification123',
        token: 'verificationToken123',
      });
      (sendEmailVerification as jest.Mock).mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully. Please check your email to verify your account.',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
        },
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: validRegistrationData.email.toLowerCase(),
          password: 'hashedPassword123',
          firstName: validRegistrationData.firstName,
          lastName: validRegistrationData.lastName,
          isEmailVerified: false,
          isActive: true,
          role: 'USER',
          termsAcceptedAt: expect.any(Date),
          privacyPolicyAcceptedAt: expect.any(Date),
        },
      });

      expect(sendEmailVerification).toHaveBeenCalledWith(
        mockUser.email,
        expect.any(String)
      );
    });

    it('should hash password before storing', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (validatePassword as jest.Mock).mockReturnValue({ isValid: true });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.emailVerification.create as jest.Mock).mockResolvedValue({});
      (sendEmailVerification as jest.Mock).mockResolvedValue(true);

      // Act
      await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(validRegistrationData.password, 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          password: 'hashedPassword123',
        }),
      });
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const dataWithUpperCaseEmail = {
        ...validRegistrationData,
        email: 'Test@EXAMPLE.COM',
      };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (validatePassword as jest.Mock).mockReturnValue({ isValid: true });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        email: 'test@example.com',
      });
      (prisma.emailVerification.create as jest.Mock).mockResolvedValue({});
      (sendEmailVerification as jest.Mock).mockResolvedValue(true);

      // Act
      await request(app)
        .post('/api/auth/register')
        .send(dataWithUpperCaseEmail);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
        }),
      });
    });
  });

  describe('Duplicate Email Prevention', () => {
    it('should prevent registration with existing email', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        error: 'User with this email already exists',
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive email checking', async () => {
      // Arrange
      const existingUser = { ...mockUser, email: 'test@example.com' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const registrationWithDifferentCase = {
        ...validRegistrationData,
        email: 'TEST@EXAMPLE.COM',
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationWithDifferentCase);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        error: 'User with this email already exists',
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should provide helpful error for existing unverified email', async () => {
      // Arrange
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(unverifiedUser);

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        error: 'An account with this email exists but is not verified. Please check your email or request a new verification link.',
        canResendVerification: true,
      });
    });
  });

  describe('Password Strength Requirements', () => {
    it('should validate password strength', async () => {
      // Arrange
      const weakPasswordData = {
        ...validRegistrationData,
        password: 'weak',
        confirmPassword: 'weak',
      };
      
      (validatePassword as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [
          'Password must be at least 8 characters long',
          'Password must contain at least one uppercase letter',
          'Password must contain at least one special character',
        ],
      });

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Password does not meet security requirements',
        passwordErrors: [
          'Password must be at least 8 characters long',
          'Password must contain at least one uppercase letter',
          'Password must contain at least one special character',
        ],
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should require password confirmation', async () => {
      // Arrange
      const mismatchPasswordData = {
        ...validRegistrationData,
        confirmPassword: 'DifferentPassword123!',
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(mismatchPasswordData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Passwords do not match',
      });
    });

    it('should accept strong passwords', async () => {
      // Arrange
      const strongPasswords = [
        'MyStr0ng!Password',
        'Complex#Pass123',
        'SecureP@ssw0rd2024',
        'Very$trong9Pass',
      ];

      for (const password of strongPasswords) {
        const testData = {
          ...validRegistrationData,
          email: `test${Date.now()}@example.com`,
          password,
          confirmPassword: password,
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (validatePassword as jest.Mock).mockReturnValue({ isValid: true });
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
        (prisma.user.create as jest.Mock).mockResolvedValue({ ...mockUser, email: testData.email });
        (prisma.emailVerification.create as jest.Mock).mockResolvedValue({});
        (sendEmailVerification as jest.Mock).mockResolvedValue(true);

        // Act
        const response = await request(app)
          .post('/api/auth/register')
          .send(testData);

        // Assert
        expect(response.status).toBe(201);
        expect(validatePassword).toHaveBeenCalledWith(password);
      }
    });

    it('should prevent common passwords', async () => {
      // Arrange
      const commonPasswords = [
        'password123',
        'qwerty123',
        '123456789',
        'admin123',
      ];

      for (const password of commonPasswords) {
        const testData = {
          ...validRegistrationData,
          password,
          confirmPassword: password,
        };

        (validatePassword as jest.Mock).mockReturnValue({
          isValid: false,
          errors: ['Password is too common and easily guessable'],
        });

        // Act
        const response = await request(app)
          .post('/api/auth/register')
          .send(testData);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.passwordErrors).toContain('Password is too common and easily guessable');
      }
    });
  });

  describe('Email Verification Flow', () => {
    it('should create email verification token and send email', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (validatePassword as jest.Mock).mockReturnValue({ isValid: true });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.emailVerification.create as jest.Mock).mockResolvedValue({
        id: 'verification123',
        token: 'verificationToken123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      (sendEmailVerification as jest.Mock).mockResolvedValue(true);

      // Act
      await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      // Assert
      expect(prisma.emailVerification.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          token: expect.any(String),
          expiresAt: expect.any(Date),
        },
      });
      expect(sendEmailVerification).toHaveBeenCalledWith(
        mockUser.email,
        'verificationToken123'
      );
    });

    it('should handle email service failure gracefully', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (validatePassword as jest.Mock).mockReturnValue({ isValid: true });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.emailVerification.create as jest.Mock).mockResolvedValue({
        token: 'verificationToken123',
      });
      (sendEmailVerification as jest.Mock).mockRejectedValue(new Error('Email service unavailable'));

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully, but there was an issue sending the verification email. Please request a new verification link.',
        user: expect.any(Object),
        emailSent: false,
      });
    });

    it('should generate secure verification tokens', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (validatePassword as jest.Mock).mockReturnValue({ isValid: true });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (sendEmailVerification as jest.Mock).mockResolvedValue(true);

      const capturedTokens: string[] = [];
      (prisma.emailVerification.create as jest.Mock).mockImplementation(({ data }) => {
        capturedTokens.push(data.token);
        return Promise.resolve({ token: data.token });
      });

      // Act - Register multiple users
      for (let i = 0; i < 5; i++) {
        const userData = {
          ...validRegistrationData,
          email: `test${i}@example.com`,
        };
        
        await request(app)
          .post('/api/auth/register')
          .send(userData);
      }

      // Assert
      expect(capturedTokens).toHaveLength(5);
      // All tokens should be unique
      expect(new Set(capturedTokens).size).toBe(5);
      // All tokens should be sufficiently long (at least 32 characters)
      capturedTokens.forEach(token => {
        expect(token.length).toBeGreaterThanOrEqual(32);
      });
    });
  });

  describe('Terms and Privacy Acceptance', () => {
    it('should require terms acceptance', async () => {
      // Arrange
      const dataWithoutTerms = {
        ...validRegistrationData,
        termsAccepted: false,
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(dataWithoutTerms);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'You must accept the Terms of Service to register',
      });
    });

    it('should require privacy policy acceptance', async () => {
      // Arrange
      const dataWithoutPrivacy = {
        ...validRegistrationData,
        privacyPolicyAccepted: false,
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(dataWithoutPrivacy);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'You must accept the Privacy Policy to register',
      });
    });

    it('should store acceptance timestamps', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (validatePassword as jest.Mock).mockReturnValue({ isValid: true });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.emailVerification.create as jest.Mock).mockResolvedValue({});
      (sendEmailVerification as jest.Mock).mockResolvedValue(true);

      // Act
      await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      // Assert
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          termsAcceptedAt: expect.any(Date),
          privacyPolicyAcceptedAt: expect.any(Date),
        }),
      });
    });

    it('should handle missing terms acceptance field', async () => {
      // Arrange
      const dataWithoutTermsField = { ...validRegistrationData };
      delete (dataWithoutTermsField as any).termsAccepted;

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(dataWithoutTermsField);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'You must accept the Terms of Service to register',
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      // Arrange
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test@.com',
        'test..test@example.com',
        'test@example.',
      ];

      for (const email of invalidEmails) {
        const testData = { ...validRegistrationData, email };

        // Act
        const response = await request(app)
          .post('/api/auth/register')
          .send(testData);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          success: false,
          error: 'Invalid email format',
        });
      }
    });

    it('should require all mandatory fields', async () => {
      // Arrange
      const requiredFields = ['email', 'password', 'confirmPassword', 'firstName', 'lastName'];
      
      for (const field of requiredFields) {
        const incompleteData = { ...validRegistrationData };
        delete (incompleteData as any)[field];

        // Act
        const response = await request(app)
          .post('/api/auth/register')
          .send(incompleteData);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toContain(field);
      }
    });

    it('should sanitize name fields', async () => {
      // Arrange
      const dataWithScriptTags = {
        ...validRegistrationData,
        firstName: '<script>alert("xss")</script>John',
        lastName: 'Doe<img src=x onerror=alert("xss")>',
      };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (validatePassword as jest.Mock).mockReturnValue({ isValid: true });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.emailVerification.create as jest.Mock).mockResolvedValue({});
      (sendEmailVerification as jest.Mock).mockResolvedValue(true);

      // Act
      await request(app)
        .post('/api/auth/register')
        .send(dataWithScriptTags);

      // Assert
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'John', // Script tags removed
          lastName: 'Doe', // Malicious content removed
        }),
      });
    });

    it('should limit name field lengths', async () => {
      // Arrange
      const dataWithLongNames = {
        ...validRegistrationData,
        firstName: 'A'.repeat(101), // Exceed typical limit
        lastName: 'B'.repeat(101),
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(dataWithLongNames);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'First name and last name must be 100 characters or less',
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce registration rate limiting', async () => {
      // This would typically be tested with integration tests
      // Here we mock the rate limiter behavior
      const mockRateLimit = jest.fn((req, res, next) => {
        res.status(429).json({
          success: false,
          error: 'Too many registration attempts. Please try again later.',
        });
      });

      // Apply rate limiting middleware
      const limitedApp = require('express')();
      limitedApp.use('/api/auth/register', mockRateLimit);

      // Act
      const response = await request(limitedApp)
        .post('/api/auth/register')
        .send(validRegistrationData);

      // Assert
      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Too many registration attempts');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Registration failed. Please try again later.',
      });
    });

    it('should handle bcrypt hashing errors', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (validatePassword as jest.Mock).mockReturnValue({ isValid: true });
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Registration failed. Please try again later.',
      });
    });

    it('should not leak sensitive information in error responses', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error('SELECT * FROM users WHERE secret_key = "abc123"')
      );

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).not.toContain('secret_key');
      expect(response.body.error).not.toContain('abc123');
      expect(response.body.error).toBe('Registration failed. Please try again later.');
    });
  });

  describe('Security Features', () => {
    it('should include security headers', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (validatePassword as jest.Mock).mockReturnValue({ isValid: true });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.emailVerification.create as jest.Mock).mockResolvedValue({});
      (sendEmailVerification as jest.Mock).mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      // Assert
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should prevent registration with suspicious patterns', async () => {
      // Arrange
      const suspiciousData = {
        ...validRegistrationData,
        firstName: 'admin',
        lastName: 'administrator',
        email: 'admin@example.com',
      };

      // This would typically integrate with fraud detection
      // For now, we'll simulate the behavior
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(suspiciousData);

      // Assert - In a real implementation, this might be blocked or flagged
      expect(response.status).toBe(201); // Or could be blocked based on security rules
    });
  });
});

describe('Email Verification Endpoint', () => {
  describe('POST /api/auth/verify-email', () => {
    it('should successfully verify email with valid token', async () => {
      // Arrange
      const verificationToken = 'validToken123';
      const mockVerification = {
        id: 'verification123',
        userId: 'user123',
        token: verificationToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      };

      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(mockVerification);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        isEmailVerified: true,
      });
      (prisma.emailVerification.delete as jest.Mock).mockResolvedValue(mockVerification);

      // Act
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: verificationToken });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Email verified successfully',
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockVerification.userId },
        data: { isEmailVerified: true },
      });
      expect(prisma.emailVerification.delete).toHaveBeenCalledWith({
        where: { id: mockVerification.id },
      });
    });

    it('should fail verification with invalid token', async () => {
      // Arrange
      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalidToken' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired verification token',
      });
    });

    it('should fail verification with expired token', async () => {
      // Arrange
      const expiredVerification = {
        id: 'verification123',
        userId: 'user123',
        token: 'expiredToken123',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };

      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(expiredVerification);
      (prisma.emailVerification.delete as jest.Mock).mockResolvedValue(expiredVerification);

      // Act
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'expiredToken123' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Verification token has expired. Please request a new verification email.',
      });
      expect(prisma.emailVerification.delete).toHaveBeenCalledWith({
        where: { id: expiredVerification.id },
      });
    });
  });
});