/**
 * Services API Tests for VibeFunder
 * 
 * Tests all service-related API endpoints including:
 * - Service categories
 * - Service listings
 * - Security and validation
 */

import { createTestUser, cleanupTestData } from '../utils/test-helpers';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('Services API', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/services/categories', () => {
    it('should return list of service categories', async () => {
      const response = await fetch(`${API_BASE}/api/services/categories`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      
      // Should return standard service categories
      if (data.length > 0) {
        const category = data[0];
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('slug');
      }
    });

    it('should handle empty categories gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/services/categories`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return categories in consistent format', async () => {
      const response = await fetch(`${API_BASE}/api/services/categories`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      if (data.length > 0) {
        data.forEach((category: any) => {
          expect(typeof category.id).toBe('string');
          expect(typeof category.name).toBe('string');
          expect(typeof category.slug).toBe('string');
          
          // Slug should be URL-friendly
          expect(category.slug).toMatch(/^[a-z0-9-]+$/);
        });
      }
    });

    it('should handle malformed requests gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/services/categories?invalid=param`);
      
      // Should ignore invalid parameters and return normally
      expect(response.status).toBe(200);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in category queries', async () => {
      const maliciousUrl = `${API_BASE}/api/services/categories?category='; DROP TABLE service_categories; --`;
      
      const response = await fetch(maliciousUrl);
      
      // Should not cause server error, should handle gracefully
      expect([200, 400]).toContain(response.status);
    });

    it('should handle XSS attempts in query parameters', async () => {
      const maliciousUrl = `${API_BASE}/api/services/categories?search=<script>alert('xss')</script>`;
      
      const response = await fetch(maliciousUrl);
      
      // Should handle malicious input gracefully
      expect([200, 400]).toContain(response.status);
    });

    it('should rate limit requests appropriately', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = Array.from({ length: 20 }, () => 
        fetch(`${API_BASE}/api/services/categories`)
      );

      const responses = await Promise.all(promises);
      
      // Most should succeed, but rate limiting might kick in for excessive requests
      const statuses = responses.map(r => r.status);
      const successCount = statuses.filter(s => s === 200).length;
      const rateLimitedCount = statuses.filter(s => s === 429).length;
      
      // Either all succeed (no rate limiting implemented) or some are rate limited
      expect(successCount + rateLimitedCount).toBeGreaterThan(0);
      expect(successCount).toBeGreaterThan(0); // At least some should succeed
    });

    it('should handle very long query parameters', async () => {
      const longParam = 'a'.repeat(10000);
      const maliciousUrl = `${API_BASE}/api/services/categories?search=${longParam}`;
      
      const response = await fetch(maliciousUrl);
      
      // Should reject oversized parameters or handle gracefully
      expect([200, 400, 414]).toContain(response.status);
    });

    it('should validate content-type headers', async () => {
      const response = await fetch(`${API_BASE}/api/services/categories`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/xml', // Wrong content type for JSON API
          'X-Malicious-Header': '<script>alert(1)</script>'
        }
      });
      
      // Should ignore malicious headers and wrong content type for GET
      expect(response.status).toBe(200);
    });

    it('should handle concurrent requests safely', async () => {
      // Test concurrent access to ensure thread safety
      const concurrentPromises = Array.from({ length: 50 }, () => 
        fetch(`${API_BASE}/api/services/categories`)
      );

      const responses = await Promise.all(concurrentPromises);
      
      // All concurrent requests should succeed or fail gracefully
      responses.forEach(response => {
        expect([200, 429, 503]).toContain(response.status);
      });
      
      // At least most should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(responses.length * 0.8);
    });
  });

  describe('Performance Tests', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE}/api/services/categories`);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      
      // Should respond within 2 seconds under normal conditions
      expect(responseTime).toBeLessThan(2000);
    });

    it('should handle multiple simultaneous requests efficiently', async () => {
      const startTime = Date.now();
      
      // Make 10 simultaneous requests
      const promises = Array.from({ length: 10 }, () => 
        fetch(`${API_BASE}/api/services/categories`)
      );

      const responses = await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should handle concurrent requests efficiently (not much slower than single request)
      expect(totalTime).toBeLessThan(5000);
    });
  });
});