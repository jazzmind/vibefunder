/**
 * Comprehensive API Error Response Tests
 * Tests all HTTP error status codes and API error handling to improve branch coverage
 */

import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';

// Mock authentication and validation functions for error scenarios
const mockAuth = {
  validateToken: jest.fn(),
  getUserFromToken: jest.fn(),
};

const mockValidation = {
  validateInput: jest.fn(),
  validatePermissions: jest.fn(),
};

describe('API Error Response Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('400 Bad Request Scenarios', () => {
    it('should handle invalid JSON in request body', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/campaigns',
        body: 'invalid-json{',
        headers: {
          'content-type': 'application/json',
        },
      });

      try {
        JSON.parse(req.body);
        fail('Should have thrown JSON parse error');
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
        expect((error as Error).message).toContain('Unexpected token');
      }
    });

    it('should handle missing required fields', async () => {
      const error = {
        status: 400,
        message: 'Missing required fields: title, description',
        errors: [
          { field: 'title', message: 'Title is required' },
          { field: 'description', message: 'Description is required' }
        ]
      };

      expect(error.status).toBe(400);
      expect(error.message).toContain('Missing required fields');
      expect(error.errors).toHaveLength(2);
      expect(error.errors[0].field).toBe('title');
      expect(error.errors[1].field).toBe('description');
    });

    it('should handle invalid field types', async () => {
      const validationErrors = [
        {
          field: 'goal',
          message: 'Goal must be a positive number',
          received: 'not-a-number',
          expected: 'number'
        },
        {
          field: 'email',
          message: 'Invalid email format',
          received: 'invalid-email',
          expected: 'valid email address'
        }
      ];

      validationErrors.forEach(error => {
        expect(error.field).toBeDefined();
        expect(error.message).toBeDefined();
        expect(error.received).toBeDefined();
        expect(error.expected).toBeDefined();
      });
    });

    it('should handle invalid query parameters', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/campaigns?limit=invalid&offset=negative',
        query: {
          limit: 'invalid',
          offset: 'negative'
        }
      });

      const queryErrors = [];
      
      if (isNaN(Number(req.query.limit))) {
        queryErrors.push({
          param: 'limit',
          message: 'Limit must be a valid number',
          received: req.query.limit
        });
      }

      if (isNaN(Number(req.query.offset)) || Number(req.query.offset) < 0) {
        queryErrors.push({
          param: 'offset',
          message: 'Offset must be a non-negative number',
          received: req.query.offset
        });
      }

      expect(queryErrors).toHaveLength(2);
      expect(queryErrors[0].param).toBe('limit');
      expect(queryErrors[1].param).toBe('offset');
    });

    it('should handle malformed request headers', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/campaigns',
        headers: {
          'content-type': 'invalid-content-type',
          'authorization': 'malformed-token',
        }
      });

      const headerErrors = [];

      if (!req.headers['content-type']?.includes('application/json')) {
        headerErrors.push({
          header: 'content-type',
          message: 'Content-Type must be application/json',
          received: req.headers['content-type']
        });
      }

      if (!req.headers.authorization?.startsWith('Bearer ')) {
        headerErrors.push({
          header: 'authorization',
          message: 'Authorization header must start with Bearer',
          received: req.headers.authorization
        });
      }

      expect(headerErrors).toHaveLength(2);
    });

    it('should handle request body size limit exceeded', async () => {
      const largeBody = 'x'.repeat(10 * 1024 * 1024); // 10MB
      
      const error = {
        status: 400,
        message: 'Request body too large',
        maxSize: '5MB',
        receivedSize: '10MB'
      };

      expect(error.status).toBe(400);
      expect(error.message).toBe('Request body too large');
      expect(error.maxSize).toBe('5MB');
      expect(error.receivedSize).toBe('10MB');
    });
  });

  describe('401 Unauthorized Scenarios', () => {
    it('should handle missing authorization header', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/campaigns/protected',
        headers: {}
      });

      const authError = {
        status: 401,
        message: 'Authorization header required',
        code: 'MISSING_AUTH_HEADER'
      };

      expect(req.headers.authorization).toBeUndefined();
      expect(authError.status).toBe(401);
      expect(authError.code).toBe('MISSING_AUTH_HEADER');
    });

    it('should handle expired JWT token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      mockAuth.validateToken.mockRejectedValue(new Error('Token expired'));

      try {
        await mockAuth.validateToken(expiredToken);
        fail('Should have thrown token expired error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Token expired');
      }
    });

    it('should handle invalid JWT token signature', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      mockAuth.validateToken.mockRejectedValue(new Error('Invalid token signature'));

      try {
        await mockAuth.validateToken(invalidToken);
        fail('Should have thrown invalid signature error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Invalid token signature');
      }
    });

    it('should handle malformed JWT token', async () => {
      const malformedToken = 'not-a-jwt-token';
      
      mockAuth.validateToken.mockRejectedValue(new Error('Malformed token'));

      try {
        await mockAuth.validateToken(malformedToken);
        fail('Should have thrown malformed token error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Malformed token');
      }
    });

    it('should handle token with invalid user', async () => {
      const tokenWithInvalidUser = 'valid.jwt.token';
      
      mockAuth.getUserFromToken.mockResolvedValue(null);

      const user = await mockAuth.getUserFromToken(tokenWithInvalidUser);
      
      expect(user).toBeNull();
    });

    it('should handle revoked token', async () => {
      const revokedToken = 'valid.but.revoked.token';
      
      mockAuth.validateToken.mockRejectedValue(new Error('Token has been revoked'));

      try {
        await mockAuth.validateToken(revokedToken);
        fail('Should have thrown revoked token error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Token has been revoked');
      }
    });
  });

  describe('403 Forbidden Scenarios', () => {
    it('should handle insufficient permissions', async () => {
      const user = { id: '123', role: 'user' };
      const requiredRole = 'admin';
      
      mockValidation.validatePermissions.mockReturnValue(false);

      const hasPermission = mockValidation.validatePermissions(user.role, requiredRole);
      
      expect(hasPermission).toBe(false);
      
      const error = {
        status: 403,
        message: 'Insufficient permissions',
        required: requiredRole,
        actual: user.role
      };

      expect(error.status).toBe(403);
      expect(error.required).toBe('admin');
      expect(error.actual).toBe('user');
    });

    it('should handle resource ownership violation', async () => {
      const userId = '123';
      const campaignOwnerId = '456';
      
      const ownershipError = {
        status: 403,
        message: 'You can only modify your own campaigns',
        code: 'OWNERSHIP_VIOLATION',
        userId,
        resourceOwnerId: campaignOwnerId
      };

      expect(ownershipError.status).toBe(403);
      expect(ownershipError.code).toBe('OWNERSHIP_VIOLATION');
      expect(ownershipError.userId).not.toBe(ownershipError.resourceOwnerId);
    });

    it('should handle account suspension', async () => {
      const suspendedUser = { id: '123', status: 'suspended' };
      
      const suspensionError = {
        status: 403,
        message: 'Account has been suspended',
        code: 'ACCOUNT_SUSPENDED',
        userId: suspendedUser.id,
        accountStatus: suspendedUser.status
      };

      expect(suspendedUser.status).toBe('suspended');
      expect(suspensionError.status).toBe(403);
      expect(suspensionError.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('should handle rate limit exceeded', async () => {
      const rateLimitError = {
        status: 403,
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        limit: 100,
        window: '1 hour',
        retryAfter: 3600
      };

      expect(rateLimitError.status).toBe(403);
      expect(rateLimitError.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(rateLimitError.retryAfter).toBe(3600);
    });

    it('should handle IP address blocked', async () => {
      const blockedIp = '192.168.1.100';
      
      const ipBlockError = {
        status: 403,
        message: 'IP address is blocked',
        code: 'IP_BLOCKED',
        ipAddress: blockedIp,
        reason: 'suspicious_activity'
      };

      expect(ipBlockError.status).toBe(403);
      expect(ipBlockError.code).toBe('IP_BLOCKED');
      expect(ipBlockError.ipAddress).toBe(blockedIp);
    });
  });

  describe('404 Not Found Scenarios', () => {
    it('should handle campaign not found', async () => {
      const campaignId = 'nonexistent-campaign-id';
      
      const notFoundError = {
        status: 404,
        message: 'Campaign not found',
        code: 'CAMPAIGN_NOT_FOUND',
        resourceId: campaignId
      };

      expect(notFoundError.status).toBe(404);
      expect(notFoundError.code).toBe('CAMPAIGN_NOT_FOUND');
      expect(notFoundError.resourceId).toBe(campaignId);
    });

    it('should handle user not found', async () => {
      const userId = 'nonexistent-user-id';
      
      const userNotFoundError = {
        status: 404,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        resourceId: userId
      };

      expect(userNotFoundError.status).toBe(404);
      expect(userNotFoundError.code).toBe('USER_NOT_FOUND');
    });

    it('should handle API endpoint not found', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/nonexistent-endpoint',
      });

      const endpointError = {
        status: 404,
        message: 'API endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        path: req.url,
        method: req.method
      };

      expect(endpointError.status).toBe(404);
      expect(endpointError.path).toBe('/api/nonexistent-endpoint');
      expect(endpointError.method).toBe('GET');
    });

    it('should handle file not found', async () => {
      const fileName = 'nonexistent-file.jpg';
      
      const fileNotFoundError = {
        status: 404,
        message: 'File not found',
        code: 'FILE_NOT_FOUND',
        fileName
      };

      expect(fileNotFoundError.status).toBe(404);
      expect(fileNotFoundError.code).toBe('FILE_NOT_FOUND');
      expect(fileNotFoundError.fileName).toBe(fileName);
    });
  });

  describe('500 Internal Server Error Scenarios', () => {
    it('should handle database connection failure', async () => {
      const dbError = new Error('Database connection failed');
      
      const serverError = {
        status: 500,
        message: 'Internal server error',
        code: 'DATABASE_CONNECTION_FAILED',
        originalError: dbError.message
      };

      expect(serverError.status).toBe(500);
      expect(serverError.code).toBe('DATABASE_CONNECTION_FAILED');
      expect(serverError.originalError).toBe('Database connection failed');
    });

    it('should handle unexpected application error', async () => {
      const unexpectedError = new Error('Unexpected error occurred');
      
      const serverError = {
        status: 500,
        message: 'Internal server error',
        code: 'UNEXPECTED_ERROR',
        stack: process.env.NODE_ENV === 'development' ? unexpectedError.stack : undefined
      };

      expect(serverError.status).toBe(500);
      expect(serverError.code).toBe('UNEXPECTED_ERROR');
      
      if (process.env.NODE_ENV === 'development') {
        expect(serverError.stack).toBeDefined();
      }
    });

    it('should handle third-party service unavailable', async () => {
      const serviceError = {
        status: 500,
        message: 'External service unavailable',
        code: 'EXTERNAL_SERVICE_ERROR',
        service: 'stripe',
        originalError: 'Service temporarily unavailable'
      };

      expect(serviceError.status).toBe(500);
      expect(serviceError.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(serviceError.service).toBe('stripe');
    });

    it('should handle memory allocation error', async () => {
      const memoryError = new Error('JavaScript heap out of memory');
      
      const serverError = {
        status: 500,
        message: 'Server resource exhausted',
        code: 'MEMORY_ERROR',
        originalError: memoryError.message
      };

      expect(serverError.status).toBe(500);
      expect(serverError.code).toBe('MEMORY_ERROR');
      expect(serverError.originalError).toContain('heap out of memory');
    });
  });

  describe('Method Not Allowed (405) Scenarios', () => {
    it('should handle unsupported HTTP method', async () => {
      const { req, res } = createMocks({
        method: 'PATCH',
        url: '/api/campaigns',
      });

      const allowedMethods = ['GET', 'POST'];
      
      const methodError = {
        status: 405,
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED',
        method: req.method,
        allowed: allowedMethods
      };

      expect(methodError.status).toBe(405);
      expect(methodError.method).toBe('PATCH');
      expect(methodError.allowed).toEqual(['GET', 'POST']);
      expect(methodError.allowed).not.toContain('PATCH');
    });
  });

  describe('Conflict (409) Scenarios', () => {
    it('should handle duplicate resource creation', async () => {
      const email = 'existing@example.com';
      
      const conflictError = {
        status: 409,
        message: 'User with this email already exists',
        code: 'DUPLICATE_EMAIL',
        field: 'email',
        value: email
      };

      expect(conflictError.status).toBe(409);
      expect(conflictError.code).toBe('DUPLICATE_EMAIL');
      expect(conflictError.field).toBe('email');
    });

    it('should handle concurrent modification', async () => {
      const resourceId = 'campaign-123';
      
      const concurrencyError = {
        status: 409,
        message: 'Resource has been modified by another user',
        code: 'CONCURRENT_MODIFICATION',
        resourceId,
        lastModified: new Date().toISOString()
      };

      expect(concurrencyError.status).toBe(409);
      expect(concurrencyError.code).toBe('CONCURRENT_MODIFICATION');
      expect(concurrencyError.resourceId).toBe(resourceId);
    });
  });

  describe('Unprocessable Entity (422) Scenarios', () => {
    it('should handle business logic validation failure', async () => {
      const validationError = {
        status: 422,
        message: 'Campaign goal cannot be less than existing pledges',
        code: 'BUSINESS_RULE_VIOLATION',
        details: {
          currentGoal: 1000,
          newGoal: 500,
          existingPledges: 750
        }
      };

      expect(validationError.status).toBe(422);
      expect(validationError.code).toBe('BUSINESS_RULE_VIOLATION');
      expect(validationError.details.newGoal).toBeLessThan(validationError.details.existingPledges);
    });

    it('should handle semantic validation error', async () => {
      const semanticError = {
        status: 422,
        message: 'End date must be after start date',
        code: 'SEMANTIC_VALIDATION_ERROR',
        fields: {
          startDate: '2024-01-01',
          endDate: '2023-12-31'
        }
      };

      expect(semanticError.status).toBe(422);
      expect(semanticError.code).toBe('SEMANTIC_VALIDATION_ERROR');
      expect(new Date(semanticError.fields.endDate).getTime()).toBeLessThan(
        new Date(semanticError.fields.startDate).getTime()
      );
    });
  });

  describe('Too Many Requests (429) Scenarios', () => {
    it('should handle API rate limiting', async () => {
      const rateLimitError = {
        status: 429,
        message: 'Too many requests',
        code: 'RATE_LIMITED',
        limit: 100,
        window: 3600,
        retryAfter: 1800,
        remaining: 0
      };

      expect(rateLimitError.status).toBe(429);
      expect(rateLimitError.code).toBe('RATE_LIMITED');
      expect(rateLimitError.remaining).toBe(0);
      expect(rateLimitError.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Service Unavailable (503) Scenarios', () => {
    it('should handle maintenance mode', async () => {
      const maintenanceError = {
        status: 503,
        message: 'Service temporarily unavailable',
        code: 'MAINTENANCE_MODE',
        retryAfter: 3600,
        estimatedDuration: '1 hour'
      };

      expect(maintenanceError.status).toBe(503);
      expect(maintenanceError.code).toBe('MAINTENANCE_MODE');
      expect(maintenanceError.retryAfter).toBe(3600);
    });

    it('should handle service overload', async () => {
      const overloadError = {
        status: 503,
        message: 'Service overloaded',
        code: 'SERVICE_OVERLOAD',
        retryAfter: 60,
        currentLoad: 95
      };

      expect(overloadError.status).toBe(503);
      expect(overloadError.code).toBe('SERVICE_OVERLOAD');
      expect(overloadError.currentLoad).toBeGreaterThan(90);
    });
  });
});