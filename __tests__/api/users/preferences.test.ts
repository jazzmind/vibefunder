import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { createAuthHeaders, generateTestEmail, createTestUser, cleanupTestData } from '../../utils/test-helpers';
import { GET, PUT } from '@/app/api/users/preferences/campaign-interests/route';

describe('User Preferences API', () => {
  let testUser: any;
  let testData: any[] = [];

  const createRequest = (method: string, body?: any, user = testUser) => {
    const url = new URL('http://localhost:3000/api/users/preferences/campaign-interests');
    const headers = createAuthHeaders(user);
    
    return new NextRequest(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  };

  beforeEach(async () => {
    // Create test user in the database
    testUser = await createTestUser({
      email: generateTestEmail('preferences-user'),
      name: 'Preferences Test User',
    });
    testData.push({ type: 'user', id: testUser.id });
  });

  afterEach(async () => {
    await cleanupTestData(testData);
    testData = [];
  });

  describe('Campaign Interest Categories', () => {
    it('should get campaign interest categories', async () => {
      // Arrange
      const request = createRequest('GET');

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
      const interests = {
        categories: ['technology', 'environment', 'education', 'health'],
        subcategories: {
          technology: ['software', 'hardware', 'ai'],
          environment: ['climate', 'renewable-energy']
        }
      };

      const request = createRequest('PUT', interests);

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
      const invalidInterests = {
        categories: ['invalid-category', 'another-invalid'],
        subcategories: {
          'non-existent': ['test']
        }
      };

      const request = createRequest('PUT', invalidInterests);

      // Act
      const response = await PUT(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.errors).toEqual([
        'Invalid category: invalid-category, another-invalid'
      ]);
    });

    it('should validate subcategory parent categories', async () => {
      // Arrange
      // Test with valid categories but invalid subcategory parent
      const invalidSubcategories = {
        categories: ['technology', 'environment'],
        subcategories: {
          'non-existent-category': ['test']
        }
      };

      const request = createRequest('PUT', invalidSubcategories);

      // Act
      const response = await PUT(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.errors).toEqual([
        'Subcategory parent does not exist: non-existent-category'
      ]);
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Create request without authentication headers
      const request = createRequest('GET', undefined, null);

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