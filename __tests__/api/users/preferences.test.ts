import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/users/preferences/campaign-interests/route';
import { prisma } from '@/lib/db';
import { jwtVerify } from 'jose';

// Mock external dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    userPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('jose', () => ({
  jwtVerify: jest.fn()
}));

describe('User Preferences API', () => {
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Campaign Interest Categories', () => {
    it('should get campaign interest categories', async () => {
      // Arrange
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { sub: 'user123' }
      });

      const request = new NextRequest('http://localhost:3000/api/users/preferences/campaign-interests', {
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
      expect(Array.isArray(responseData.categories)).toBe(true);
      expect(responseData).toHaveProperty('selectedCategories');
      expect(responseData).toHaveProperty('availableCategories');
    });

    it('should update campaign interest categories', async () => {
      // Arrange
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { sub: 'user123' }
      });

      const interests = {
        categories: ['technology', 'environment', 'education', 'health'],
        subcategories: {
          technology: ['software', 'hardware', 'ai'],
          environment: ['climate', 'renewable-energy']
        }
      };

      const request = new NextRequest('http://localhost:3000/api/users/preferences/campaign-interests', {
        method: 'PUT',
        headers: { 
          'Authorization': 'Bearer mockToken',
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(interests)
      });

      // Act
      const response = await PUT(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.data.categories).toHaveLength(4);
      expect(responseData.data.subcategories.technology).toHaveLength(3);
    });

    it('should validate campaign interest categories', async () => {
      // Arrange
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { sub: 'user123' }
      });

      const invalidInterests = {
        categories: ['invalid-category', 'another-invalid'],
        subcategories: {
          'non-existent': ['test']
        }
      };

      const request = new NextRequest('http://localhost:3000/api/users/preferences/campaign-interests', {
        method: 'PUT',
        headers: { 
          'Authorization': 'Bearer mockToken',
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(invalidInterests)
      });

      // Act
      const response = await PUT(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Invalid category'),
          expect.stringContaining('Subcategory parent does not exist')
        ])
      );
    });

    it('should return 401 for unauthenticated requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/preferences/campaign-interests', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });
  });
});