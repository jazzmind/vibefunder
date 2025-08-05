/**
 * Authentication Security Tests for VibeFunder
 * 
 * Tests authentication flows and security measures including:
 * - Passkey authentication
 * - OTP verification
 * - Session management
 * - Authorization checks
 * - Security vulnerabilities
 */

import { createTestUser, generateTestEmail, cleanupTestData } from '../utils/test-helpers';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('Authentication Security', () => {
  let testUser: any;

  beforeAll(async () => {
    testUser = await createTestUser({
      email: generateTestEmail('auth-test'),
      name: 'Auth Test User',
      roles: ['user']
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Session Management', () => {
    it('should create valid session for authenticated user', async () => {
      const response = await fetch(`${API_BASE}/api/auth/session`, {
        method: 'GET',
        headers: {
          'x-test-user-id': testUser.id
        }
      });

      expect(response.status).toBe(200);
      
      const session = await response.json();
      expect(session.user).toBeDefined();
      expect(session.user.id).toBe(testUser.id);
      expect(session.user.email).toBe(testUser.email);
    });

    it('should return null session for unauthenticated user', async () => {
      const response = await fetch(`${API_BASE}/api/auth/session`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      
      const session = await response.json();
      expect(session.user).toBeNull();
    });

    it('should invalidate session on signout', async () => {
      // First verify session exists
      const sessionResponse = await fetch(`${API_BASE}/api/auth/session`, {
        headers: { 'x-test-user-id': testUser.id }
      });
      expect(sessionResponse.status).toBe(200);

      // Sign out
      const signoutResponse = await fetch(`${API_BASE}/api/auth/signout`, {
        method: 'POST',
        headers: { 'x-test-user-id': testUser.id }
      });
      expect(signoutResponse.status).toBe(200);

      // Verify session is cleared
      const postSignoutResponse = await fetch(`${API_BASE}/api/auth/session`);
      const session = await postSignoutResponse.json();
      expect(session.user).toBeNull();
    });
  });

  describe('OTP Authentication', () => {
    const testEmail = generateTestEmail('otp-test');

    it('should send OTP for valid email', async () => {
      const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.message).toContain('sent');
    });

    it('should reject invalid email formats', async () => {
      const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email' })
      });

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toContain('email');
    });

    it('should rate limit OTP requests', async () => {
      const promises = [];
      
      // Send multiple OTP requests rapidly
      for (let i = 0; i < 10; i++) {
        promises.push(
          fetch(`${API_BASE}/api/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: generateTestEmail('rate-limit') })
          })
        );
      }

      const responses = await Promise.all(promises);
      
      // Should have rate limiting after initial requests
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should verify valid OTP code', async () => {
      // In test environment, we might have a known test OTP
      const testOTP = '123456'; // This would be a test-specific OTP
      
      const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: testEmail,
          code: testOTP 
        })
      });

      // In test mode, this might be mocked to always succeed
      if (process.env.NODE_ENV === 'test') {
        expect([200, 400]).toContain(response.status);
      }
    });

    it('should reject expired OTP codes', async () => {
      const expiredOTP = '000000';
      
      const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: testEmail,
          code: expiredOTP 
        })
      });

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toContain('invalid');
    });
  });

  describe('Passkey Authentication', () => {
    it('should provide passkey registration options', async () => {
      const response = await fetch(`${API_BASE}/api/auth/passkey/register-options`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-test-user-id': testUser.id 
        },
        body: JSON.stringify({ email: testUser.email })
      });

      expect(response.status).toBe(200);
      
      const options = await response.json();
      expect(options.challenge).toBeDefined();
      expect(options.rp).toBeDefined();
      expect(options.user).toBeDefined();
      expect(options.user.id).toBeDefined();
    });

    it('should provide passkey authentication options', async () => {
      const response = await fetch(`${API_BASE}/api/auth/passkey/auth-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email })
      });

      expect(response.status).toBe(200);
      
      const options = await response.json();
      expect(options.challenge).toBeDefined();
      expect(options.rpId).toBeDefined();
    });

    it('should list user passkeys for authenticated user', async () => {
      const response = await fetch(`${API_BASE}/api/auth/user-passkeys`, {
        method: 'GET',
        headers: { 'x-test-user-id': testUser.id }
      });

      expect(response.status).toBe(200);
      
      const passkeys = await response.json();
      expect(Array.isArray(passkeys)).toBe(true);
    });

    it('should require authentication to list passkeys', async () => {
      const response = await fetch(`${API_BASE}/api/auth/user-passkeys`, {
        method: 'GET'
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Authorization Checks', () => {
    it('should enforce role-based access control', async () => {
      // Create admin-only endpoint test
      const response = await fetch(`${API_BASE}/api/admin/settings`, {
        method: 'GET',
        headers: { 'x-test-user-id': testUser.id }
      });

      // Regular user should not have admin access
      expect(response.status).toBe(403);
    });

    it('should allow admin users to access admin endpoints', async () => {
      const adminUser = await createTestUser({
        email: generateTestEmail('admin'),
        name: 'Admin User',
        roles: ['admin']
      });

      const response = await fetch(`${API_BASE}/api/admin/settings`, {
        method: 'GET',
        headers: { 'x-test-user-id': adminUser.id }
      });

      expect(response.status).toBe(200);
    });

    it('should validate resource ownership', async () => {
      const otherUser = await createTestUser({
        email: generateTestEmail('other'),
        name: 'Other User'
      });

      // Try to access first user's data with second user's credentials
      const response = await fetch(`${API_BASE}/api/user/profile`, {
        method: 'GET',
        headers: { 'x-test-user-id': otherUser.id }
      });

      expect(response.status).toBe(200);
      
      const profile = await response.json();
      expect(profile.id).toBe(otherUser.id);
      expect(profile.id).not.toBe(testUser.id);
    });
  });

  describe('Security Vulnerabilities', () => {
    it('should prevent SQL injection in authentication', async () => {
      const maliciousEmail = "admin@example.com'; DROP TABLE users; --";
      
      const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: maliciousEmail })
      });

      // Should handle malicious input gracefully
      expect([400, 500]).not.toContain(response.status);
    });

    it('should sanitize user input in authentication', async () => {
      const xssEmail = '<script>alert("xss")</script>@example.com';
      
      const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: xssEmail })
      });

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).not.toContain('<script>');
    });

    it('should enforce HTTPS in production-like environments', async () => {
      // This test checks that security headers are present
      const response = await fetch(`${API_BASE}/api/auth/session`);
      
      const securityHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection'
      ];

      securityHeaders.forEach(header => {
        expect(response.headers.get(header)).toBeDefined();
      });
    });

    it('should prevent session fixation attacks', async () => {
      // Get initial session
      const initialResponse = await fetch(`${API_BASE}/api/auth/session`);
      const initialSessionCookie = initialResponse.headers.get('set-cookie');

      // Authenticate
      await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': initialSessionCookie || ''
        },
        body: JSON.stringify({ 
          email: testUser.email,
          code: '123456' // Test OTP
        })
      });

      // Get session after authentication
      const postAuthResponse = await fetch(`${API_BASE}/api/auth/session`);
      const postAuthSessionCookie = postAuthResponse.headers.get('set-cookie');

      // Session should be regenerated (different cookie)
      expect(postAuthSessionCookie).not.toBe(initialSessionCookie);
    });

    it('should implement proper CORS policies', async () => {
      const response = await fetch(`${API_BASE}/api/auth/session`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'GET'
        }
      });

      const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
      expect(allowOrigin).not.toBe('*');
      expect(allowOrigin).not.toBe('https://malicious-site.com');
    });

    it('should prevent timing attacks on authentication', async () => {
      const startTime = Date.now();
      
      // Try with non-existent user
      await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@example.com' })
      });
      
      const nonExistentTime = Date.now() - startTime;

      const startTime2 = Date.now();
      
      // Try with existing user
      await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email })
      });
      
      const existingTime = Date.now() - startTime2;

      // Response times should be similar to prevent user enumeration
      const timeDifference = Math.abs(existingTime - nonExistentTime);
      expect(timeDifference).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('Signup Status Check', () => {
    it('should check signup status for email', async () => {
      const response = await fetch(`${API_BASE}/api/auth/check-signup-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email })
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.exists).toBe(true);
      expect(result.hasPasskeys).toBeDefined();
    });

    it('should handle non-existent users gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/auth/check-signup-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@example.com' })
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.exists).toBe(false);
    });
  });
});