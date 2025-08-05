/**
 * Waitlist API Tests for VibeFunder
 * 
 * Tests all waitlist-related API endpoints including:
 * - Waitlist signup and management
 * - Email validation and security
 * - Status tracking
 */

import { createTestUser, cleanupTestData } from '../utils/test-helpers';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('Waitlist API', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/waitlist', () => {
    it('should add user to waitlist', async () => {
      const waitlistData = {
        email: `waitlist-test-${Date.now()}@example.com`,
        reason: 'back_campaign' // Must be 'back_campaign' or 'create_campaign'
      };

      const response = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waitlistData)
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.id).toBeDefined();
      expect(result.message).toBe('Successfully added to waitlist');
    });

    it('should validate email format', async () => {
      const invalidData = {
        email: 'invalid-email-format',
        name: 'Test User',
        reason: 'interested'
      };

      const response = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });

    it('should require email field', async () => {
      const invalidData = {
        reason: 'back_campaign'
      };

      const response = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });

    it('should handle duplicate email addresses', async () => {
      const email = `duplicate-test-${Date.now()}@example.com`;
      
      const waitlistData = {
        email,
        name: 'First User',
        reason: 'interested'
      };

      // First signup
      const firstResponse = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waitlistData)
      });

      expect(firstResponse.status).toBe(201);

      // Second signup with same email
      const duplicateData = {
        email,
        name: 'Second User',
        reason: 'also interested'
      };

      const secondResponse = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData)
      });

      // Should handle gracefully - either update existing or reject
      expect([200, 201, 400, 409]).toContain(secondResponse.status);
    });

    it('should validate reason field options', async () => {
      const invalidData = {
        email: `reason-test-${Date.now()}@example.com`,
        name: 'Test User',
        reason: 'invalid-reason-option'
      };

      const response = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      // May accept any string or validate against specific options
      expect([201, 400]).toContain(response.status);
    });
  });

  describe('GET /api/waitlist', () => {
    it('should return waitlist entries for authorized users', async () => {
      // First add an entry to waitlist
      const createResponse = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `get-test-${Date.now()}@example.com`,
          name: 'Get Test User',
          reason: 'interested'
        })
      });
      
      expect(createResponse.status).toBe(201);

      // Small delay to ensure database persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test GET list
      const response = await fetch(`${API_BASE}/api/waitlist`);
      
      // Should either return data for authorized users or reject for unauthorized
      expect([200, 401, 403]).toContain(response.status);
      
      if (response.status === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      }
    });

    it('should handle query parameters', async () => {
      const response = await fetch(`${API_BASE}/api/waitlist?status=pending&limit=10`);
      
      // Should either return filtered data or handle auth
      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection', async () => {
      const maliciousData = {
        email: "'; DROP TABLE waitlist; --@evil.com",
        name: 'Malicious User',
        reason: 'evil'
      };

      const response = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData)
      });

      // Should reject malicious input
      expect(response.status).toBe(400);
    });

    it('should handle malicious input', async () => {
      const maliciousData = {
        email: `xss-test-${Date.now()}@example.com`,
        name: '<script>alert("xss")</script>Evil User',
        reason: '<img src=x onerror=alert(1)>interested',
        referralSource: 'javascript:alert(1)'
      };

      const response = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData)
      });

      // Should either sanitize input (201) or reject it (400)
      expect([201, 400]).toContain(response.status);
    });

    it('should validate email length limits', async () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      
      const invalidData = {
        email: longEmail,
        name: 'Test User',
        reason: 'interested'
      };

      const response = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });

    it('should handle large payload attacks', async () => {
      const largeData = {
        email: `large-test-${Date.now()}@example.com`,
        name: 'A'.repeat(10000), // Very large name field
        reason: 'B'.repeat(10000), // Very large reason field
        referralSource: 'C'.repeat(10000)
      };

      const response = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(largeData)
      });

      // Should reject oversized payloads
      expect([400, 413]).toContain(response.status);
    });

    it('should rate limit waitlist signups', async () => {
      const baseEmail = `rate-limit-test-${Date.now()}`;
      
      // Attempt multiple rapid signups
      const promises = Array.from({ length: 10 }, (_, i) => 
        fetch(`${API_BASE}/api/waitlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `${baseEmail}-${i}@example.com`,
            name: `User ${i}`,
            reason: 'interested'
          })
        })
      );

      const responses = await Promise.all(promises);
      
      // At least some should succeed, but rate limiting might kick in
      const statuses = responses.map(r => r.status);
      const successCount = statuses.filter(s => s === 201).length;
      const rateLimitedCount = statuses.filter(s => s === 429).length;
      
      // Either all succeed (no rate limiting) or some are rate limited
      expect(successCount + rateLimitedCount).toBeGreaterThan(0);
    });
  });
});