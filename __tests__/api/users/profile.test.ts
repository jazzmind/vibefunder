import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/users/profile/route';
import { prisma } from '@/lib/db';
import { jwtVerify } from 'jose';
import { createTestRequest, createAuthenticatedRequest } from '../../utils/api-test-helpers';

// Mock external dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('jose', () => ({
  jwtVerify: jest.fn()
}));

describe('User Profile API', () => {
  const mockUser = {
    id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    bio: 'Test bio',
    avatar: 'https://example.com/avatar.jpg',
    isPublic: true,
    socialLinks: {
      twitter: 'https://twitter.com/testuser',
      linkedin: 'https://linkedin.com/in/testuser'
    },
    role: 'USER',
    createdAt: new Date(),
    isEmailVerified: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/profile', () => {
    it('should return user profile for authenticated user', async () => {
      // Arrange
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { sub: 'user123' }
      });
      
      const mockUserResponse = {
        ...mockUser,
        createdAt: mockUser.createdAt.toISOString() // Convert to string as API returns
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'GET',
        headers: { 
          'Authorization': 'Bearer mockToken',
          'Content-Type': 'application/json' 
        }
      });

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toHaveProperty('success', true);
      expect(responseData.user).toMatchObject({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        bio: mockUser.bio,
        avatar: mockUser.avatar,
        isPublic: mockUser.isPublic,
        socialLinks: mockUser.socialLinks,
        role: mockUser.role,
        isEmailVerified: mockUser.isEmailVerified
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      // Arrange - no token
      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should return 404 for non-existent user', async () => {
      // Arrange
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { sub: 'nonexistent123' }
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'GET',
        headers: { 
          'Authorization': 'Bearer mockToken',
          'Content-Type': 'application/json' 
        }
      });

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData).toEqual({
        success: false,
        error: 'User not found'
      });
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile successfully', async () => {
      // Arrange
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { sub: 'user123' }
      });

      const updatedUser = {
        ...mockUser,
        name: 'Updated Name',
        bio: 'Updated bio',
        isPublic: false, // This should match the updateData
        updatedAt: new Date()
      };
      
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const updateData = {
        name: 'Updated Name',
        bio: 'Updated bio',
        isPublic: false
      };

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: { 
          'Authorization': 'Bearer mockToken',
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(updateData)
      });

      // Act
      const response = await PUT(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toHaveProperty('success', true);
      expect(responseData.message).toBe('Profile updated successfully');
      expect(responseData.user).toMatchObject({
        id: updatedUser.id,
        name: updatedUser.name,
        bio: updatedUser.bio,
        isPublic: updateData.isPublic
      });
      
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: updateData,
        select: expect.any(Object)
      });
    });

    it('should validate profile update data', async () => {
      // Arrange
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { sub: 'user123' }
      });

      const invalidData = {
        name: '', // Empty name should be invalid
        bio: 'x'.repeat(501), // Bio too long
        avatar: 'not-a-url' // Invalid URL
      };

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: { 
          'Authorization': 'Bearer mockToken',
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(invalidData)
      });

      // Act
      const response = await PUT(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
    });

    it('should update social links', async () => {
      // Arrange
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { sub: 'user123' }
      });

      const updatedUser = {
        ...mockUser,
        socialLinks: {
          twitter: 'https://twitter.com/newhandle',
          linkedin: 'https://linkedin.com/in/newhandle',
          github: 'https://github.com/newhandle'
        },
        updatedAt: new Date()
      };
      
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const updateData = {
        socialLinks: {
          twitter: 'https://twitter.com/newhandle',
          linkedin: 'https://linkedin.com/in/newhandle',
          github: 'https://github.com/newhandle'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: { 
          'Authorization': 'Bearer mockToken',
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(updateData)
      });

      // Act
      const response = await PUT(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.user.socialLinks).toEqual(updateData.socialLinks);
    });

    it('should return 401 for unauthenticated update', async () => {
      // Arrange - no token
      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' })
      });

      // Act
      const response = await PUT(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });
  });
});