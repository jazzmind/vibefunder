/**
 * Organizations API Tests for VibeFunder
 * 
 * Tests all organization-related API endpoints including:
 * - CRUD operations for organizations
 * - Authorization and ownership checks
 * - Security and validation
 */

import { createTestUser, cleanupTestData } from '../utils/test-helpers';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('Organizations API', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/organizations', () => {
    it('should create new organization', async () => {
      const orgData = {
        name: 'Test Organization',
        email: 'test@testorg.com',
        type: 'startup',
        description: 'A test organization for API testing',
        website: 'https://testorg.com'
      };

      const response = await fetch(`${API_BASE}/api/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgData)
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.message).toBe('Organization created successfully');
      expect(result.organization).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidData = { 
        description: 'Missing required fields' 
      };

      const response = await fetch(`${API_BASE}/api/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });

    it('should prevent creating multiple organizations per user', async () => {
      const orgData = {
        name: 'Second Test Org',
        email: 'second@testorg.com',
        type: 'creator'
      };

      const response = await fetch(`${API_BASE}/api/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgData)
      });

      // Should get 409 conflict since user already has an organization
      expect(response.status).toBe(409);
    });

    it('should validate organization type', async () => {
      const invalidData = {
        name: 'Test Org',
        email: 'test@testorg.com',
        type: 'invalid-type'
      };

      const response = await fetch(`${API_BASE}/api/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/organizations', () => {
    it('should return list of organizations', async () => {
      // First create an organization via the API
      const createResponse = await fetch(`${API_BASE}/api/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Organization for List',
          email: 'list@testorg.com',
          type: 'startup'
        })
      });
      
      expect(createResponse.status).toBe(201);
      const createdOrg = await createResponse.json();

      // Small delay to ensure database persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test GET list
      const response = await fetch(`${API_BASE}/api/organizations`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      
      // Find our specific test organization
      const org = data.find((o: any) => o.id === createdOrg.id);
      expect(org).toBeDefined();
      if (org) {
        expect(org.name).toBe('Test Organization for List');
        expect(org.status).toBe('active');
      }
    });

    it('should handle empty results gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/organizations`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection', async () => {
      const maliciousData = {
        name: "'; DROP TABLE organizations; --",
        email: 'test@evil.com',
        type: 'startup'
      };

      const response = await fetch(`${API_BASE}/api/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData)
      });

      // Should either reject the input (400) or sanitize it (201)
      expect([201, 400]).toContain(response.status);
    });

    it('should handle malicious input', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>Evil Org',
        email: 'evil@test.com',
        type: 'startup',
        description: '<img src=x onerror=alert(1)>',
        website: 'javascript:alert(1)'
      };

      const response = await fetch(`${API_BASE}/api/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData)
      });

      // Should handle malicious input gracefully
      expect([201, 400]).toContain(response.status);
    });
  });
});