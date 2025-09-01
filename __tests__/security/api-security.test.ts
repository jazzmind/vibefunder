/**
 * API Security Tests
 * 
 * Comprehensive security tests for all API endpoints
 * Focus on SQL injection, XSS, CSRF, authorization, input validation
 */

import { generateTestEmail, cleanupTestData, createAuthHeaders } from '../utils/test-helpers';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe.skip('API Security Tests (SKIPPED: No test server running)', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  describe('SQL Injection Prevention', () => {
    const sqlPayloads = [
      "'; DROP TABLE campaigns; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; UPDATE users SET roles = 'admin' WHERE id = '1'; --",
      "' AND 1=1 --",
      "' OR 1=1#",
      "'; INSERT INTO users (email, roles) VALUES ('hacker@evil.com', 'admin'); --"
    ];

    it('should prevent SQL injection in campaign endpoints', async () => {
      for (const payload of sqlPayloads) {
        // Test GET with malicious ID
        const getResponse = await fetch(`${API_BASE}/api/campaigns/${encodeURIComponent(payload)}`);
        expect(getResponse.status).toBe(404); // Not found, not DB error
        
        // Test POST with malicious data
        const postResponse = await fetch(`${API_BASE}/api/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: payload,
            summary: 'Test summary',
            fundingGoalDollars: 50000
          })
        });
        
        // Should either reject (400) or sanitize and create (201)
        expect([400, 201]).toContain(postResponse.status);
        
        if (postResponse.status === 201) {
          const campaign = await postResponse.json();
          // Title should not contain raw SQL
          expect(campaign.title).not.toContain('DROP TABLE');
          expect(campaign.title).not.toContain('UNION SELECT');
        }
      }
    });

    it('should prevent SQL injection in pledge-tier endpoints', async () => {
      // First create a campaign to attach pledge tiers to
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Security Test Campaign',
          summary: 'Testing security',
          fundingGoalDollars: 50000
        })
      });
      
      expect(campaignResponse.status).toBe(201);
      const campaign = await campaignResponse.json();

      for (const payload of sqlPayloads) {
        const response = await fetch(`${API_BASE}/api/pledge-tiers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: campaign.id,
            title: payload,
            description: 'Test tier',
            amountDollars: 100
          })
        });
        
        expect([400, 201]).toContain(response.status);
        
        if (response.status === 201) {
          const tier = await response.json();
          expect(tier.title).not.toContain('DROP TABLE');
        }
      }
    });

    it('should prevent SQL injection in user lookup operations', async () => {
      const maliciousEmails = [
        "test@test.com'; DROP TABLE users; --",
        "admin@test.com' OR '1'='1' --",
        "test@test.com' UNION SELECT password FROM users --"
      ];

      for (const email of maliciousEmails) {
        const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        // Should handle gracefully - either validation error or safe processing
        expect([200, 400]).toContain(response.status);
      }
    });
  });

  describe('XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      'javascript:alert("xss")',
      '<svg onload=alert("xss")>',
      '<iframe src="javascript:alert(\'xss\')"></iframe>',
      '<body onload=alert("xss")>',
      '<div onclick="alert(\'xss\')">Click me</div>',
      '"><script>alert("xss")</script><div class="',
      '\'+alert("xss")+\'',
      '<object data="javascript:alert(\'xss\')"></object>'
    ];

    it('should sanitize XSS in campaign creation', async () => {
      for (const payload of xssPayloads) {
        const response = await fetch(`${API_BASE}/api/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: payload,
            summary: `Description with XSS: ${payload}`,
            fundingGoalDollars: 50000
          })
        });
        
        if (response.status === 201) {
          const campaign = await response.json();
          const responseText = JSON.stringify(campaign);
          
          // Response should not contain unescaped script tags
          expect(responseText).not.toContain('<script>');
          expect(responseText).not.toContain('javascript:');
          expect(responseText).not.toContain('onerror=');
          expect(responseText).not.toContain('onload=');
        }
      }
    });

    it('should sanitize XSS in pledge tier creation', async () => {
      // Create campaign first
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'XSS Test Campaign',
          summary: 'Testing XSS prevention',
          fundingGoalDollars: 50000
        })
      });
      
      const campaign = await campaignResponse.json();

      for (const payload of xssPayloads) {
        const response = await fetch(`${API_BASE}/api/pledge-tiers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: campaign.id,
            title: payload,
            description: `Tier with XSS: ${payload}`,
            amountDollars: 100
          })
        });
        
        if (response.status === 201) {
          const tier = await response.json();
          const responseText = JSON.stringify(tier);
          
          expect(responseText).not.toContain('<script>');
          expect(responseText).not.toContain('javascript:');
        }
      }
    });

    it('should handle XSS in authentication flows', async () => {
      const xssEmail = '<script>alert("xss")</script>@test.com';
      
      const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: xssEmail })
      });

      // Should reject invalid email format
      expect(response.status).toBe(400);
      
      const result = await response.json();
      const responseText = JSON.stringify(result);
      expect(responseText).not.toContain('<script>');
    });
  });

  describe('CSRF Protection', () => {
    it('should require proper Content-Type for POST requests', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          title: 'CSRF Test',
          summary: 'Testing CSRF',
          fundingGoalDollars: 50000
        })
      });

      expect(response.status).not.toBe(201);
    });

    it('should validate Origin header for sensitive operations', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://malicious-site.com'
        },
        body: JSON.stringify({
          title: 'Origin Test',
          summary: 'Testing origin validation',
          fundingGoalDollars: 50000
        })
      });

      // Should handle CORS properly
      const corsHeader = response.headers.get('Access-Control-Allow-Origin');
      expect(corsHeader).not.toBe('https://malicious-site.com');
    });

    it('should handle missing CSRF tokens appropriately', async () => {
      // This would test CSRF token validation if implemented
      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'CSRF Token Test',
          summary: 'Testing CSRF tokens',
          fundingGoalDollars: 50000
        })
      });

      // For now, just ensure it doesn't crash
      expect([200, 201, 400, 403]).toContain(response.status);
    });
  });

  describe('Input Validation', () => {
    it('should validate email formats strictly', async () => {
      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user@.com',
        'user..double@domain.com',
        'user name@domain.com',
        'user@domain',
        '',
        'a'.repeat(255) + '@domain.com', // Too long
        'user@' + 'a'.repeat(255) + '.com' // Domain too long
      ];

      for (const email of invalidEmails) {
        const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        expect(response.status).toBe(400);
      }
    });

    it('should validate funding amounts', async () => {
      const invalidAmounts = [
        -1000, // Negative
        0, // Zero
        'not-a-number',
        999999999999999, // Too large
        0.001, // Too precise
        null,
        undefined
      ];

      for (const amount of invalidAmounts) {
        const response = await fetch(`${API_BASE}/api/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Amount Test',
            summary: 'Testing amount validation',
            fundingGoalDollars: amount
          })
        });

        expect(response.status).toBe(400);
      }
    });

    it('should validate string lengths', async () => {
      const longString = 'a'.repeat(10000);
      
      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: longString,
          summary: longString,
          fundingGoalDollars: 50000
        })
      });

      expect(response.status).toBe(400);
    });

    it('should reject null byte injection', async () => {
      const nullBytePayloads = [
        'test\x00malicious',
        'test\u0000malicious',
        'test%00malicious'
      ];

      for (const payload of nullBytePayloads) {
        const response = await fetch(`${API_BASE}/api/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: payload,
            summary: 'Test',
            fundingGoalDollars: 50000
          })
        });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Authorization and Access Control', () => {
    it('should require authentication for sensitive operations', async () => {
      // These endpoints should require authentication
      const protectedEndpoints = [
        { method: 'PUT', path: '/api/campaigns/test-id' },
        { method: 'DELETE', path: '/api/campaigns/test-id' },
        { method: 'POST', path: '/api/pledge-tiers' },
        { method: 'GET', path: '/api/auth/user-passkeys' }
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await fetch(`${API_BASE}${endpoint.path}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          body: endpoint.method !== 'GET' ? JSON.stringify({}) : undefined
        });

        // Should require authentication
        expect([401, 403, 404]).toContain(response.status);
      }
    });

    it('should prevent privilege escalation', async () => {
      // Create a campaign first
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Privilege Test',
          summary: 'Testing privileges',
          fundingGoalDollars: 50000
        })
      });

      const campaign = await campaignResponse.json();

      // Try to access/modify someone else's campaign without proper auth
      const updateResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Hacked Campaign'
        })
      });

      expect([401, 403]).toContain(updateResponse.status);
    });

    it('should validate user roles and permissions', async () => {
      // Test with mock auth headers for different roles
      const userHeaders = createAuthHeaders('test-user-id');
      
      // User should not be able to access admin functions
      const adminResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'DELETE', // Assuming DELETE requires admin
        headers: userHeaders
      });

      expect([401, 403, 405]).toContain(adminResponse.status);
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should implement rate limiting on authentication endpoints', async () => {
      const email = generateTestEmail('rate-limit');
      const requests = [];

      // Send many requests rapidly
      for (let i = 0; i < 20; i++) {
        requests.push(
          fetch(`${API_BASE}/api/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: `${email}-${i}` })
          })
        );
      }

      const responses = await Promise.all(requests);
      const statusCodes = responses.map(r => r.status);
      
      // Should have some rate limiting (429 responses)
      const rateLimited = statusCodes.filter(s => s === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should handle large payloads appropriately', async () => {
      const largePayload = {
        title: 'a'.repeat(100000),
        summary: 'b'.repeat(100000),
        fundingGoalDollars: 50000,
        extraData: 'c'.repeat(1000000)
      };

      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(largePayload)
      });

      // Should reject oversized payloads
      expect([400, 413]).toContain(response.status);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"title": "test", "summary": "test"' // Missing closing brace
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Information Disclosure Prevention', () => {
    it('should not expose internal error details', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns/trigger-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Error Test',
          summary: 'Testing error handling'
        })
      });

      if (response.status >= 500) {
        const errorResponse = await response.text();
        
        // Should not expose stack traces or internal paths
        expect(errorResponse).not.toContain('at Object.');
        expect(errorResponse).not.toContain('node_modules');
        expect(errorResponse).not.toContain('prisma');
        expect(errorResponse).not.toContain('DATABASE_URL');
      }
    });

    it('should not expose user enumeration', async () => {
      const existingEmail = 'existing@test.com';
      const nonExistentEmail = 'nonexistent@test.com';

      // Create user first
      await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: existingEmail })
      });

      // Test timing for existing vs non-existent users
      const start1 = Date.now();
      await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: existingEmail })
      });
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nonExistentEmail })
      });
      const time2 = Date.now() - start2;

      // Timing should be similar to prevent user enumeration
      const timeDifference = Math.abs(time1 - time2);
      expect(timeDifference).toBeLessThan(500); // Allow some variance
    });
  });
});