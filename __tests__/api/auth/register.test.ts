import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/register/route';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { createTestRequest } from '../../utils/api-test-helpers';

// Mock external dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
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

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully register a new user', async () => {
    // Arrange
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // No existing user
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    
    const newUser = {
      id: 'user123',
      email: 'newuser@example.com',
      name: 'New User',
      role: 'USER',
      isEmailVerified: false,
      isActive: true
    };
    
    const mockSession = {
      id: 'session123',
      userId: 'user123',
      token: 'mockJwtToken',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    (prisma.user.create as jest.Mock).mockResolvedValue(newUser);
    (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

    const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
        confirmPassword: 'password123'
      }
      });

    // Act
    const response = await POST(request);
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(responseData).toHaveProperty('success', true);
    expect(responseData).toHaveProperty('token');
    expect(responseData.user).toEqual({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      isEmailVerified: newUser.isEmailVerified
    });
  });

  it('should fail registration with existing email', async () => {
    // Arrange
    const existingUser = {
      id: 'existing123',
      email: 'existing@example.com',
      name: 'Existing User'
    };
    
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

    const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
        email: 'existing@example.com',
        name: 'New User',
        password: 'password123'
      }
      });

    // Act
    const response = await POST(request);
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(409);
    expect(responseData).toEqual({
      success: false,
      error: 'User already exists with this email'
    });
  });

  it('should validate password length', async () => {
    const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
        email: 'test@example.com',
        name: 'Test User',
        password: '123' // Too short
      }
      });

    // Act
    const response = await POST(request);
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(responseData).toEqual({
      success: false,
      error: 'Password must be at least 8 characters'
    });
  });

  it('should validate email format', async () => {
    const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
        email: 'invalid-email',
        name: 'Test User',
        password: 'password123'
      }
      });

    // Act
    const response = await POST(request);
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(responseData).toEqual({
      success: false,
      error: 'Invalid email format'
    });
  });

  it('should require name', async () => {
    const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
        email: 'test@example.com',
        password: 'password123'
        // Missing name
      }
      });

    // Act
    const response = await POST(request);
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(responseData).toEqual({
      success: false,
      error: 'Name is required'
    });
  });

  it('should validate password confirmation', async () => {
    const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        confirmPassword: 'different_password'
      }
      });

    // Act
    const response = await POST(request);
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(responseData).toEqual({
      success: false,
      error: "Passwords don't match"
    });
  });
});