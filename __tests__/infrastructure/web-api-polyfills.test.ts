/**
 * Web API Polyfills Test
 * 
 * Verifies that all required Web APIs are available in the test environment
 * and that our API test helpers work correctly with these polyfills.
 */

import { createTestRequest, createWebhookRequest, createAuthenticatedRequest } from '../utils/api-test-helpers';

describe('Web API Polyfills', () => {
  test('should have Request API available', () => {
    expect(typeof Request).toBe('function');
    expect(typeof global.Request).toBe('function');
  });

  test('should have Response API available', () => {
    expect(typeof Response).toBe('function');
    expect(typeof global.Response).toBe('function');
  });

  test('should have Headers API available', () => {
    expect(typeof Headers).toBe('function');
    expect(typeof global.Headers).toBe('function');
  });

  test('should have FormData API available', () => {
    expect(typeof FormData).toBe('function');
    expect(typeof global.FormData).toBe('function');
  });

  test('should have TextEncoder/TextDecoder available', () => {
    expect(typeof TextEncoder).toBe('function');
    expect(typeof TextDecoder).toBe('function');
  });

  test('should have crypto API available', () => {
    expect(typeof crypto).toBe('object');
    expect(crypto).toBeTruthy();
  });

  describe('API Test Helpers', () => {
    test('should create basic test request', () => {
      const request = createTestRequest('/api/test', {
        method: 'GET'
      });
      
      expect(request).toBeInstanceOf(Request);
      expect(request.url).toContain('/api/test');
      expect(request.method).toBe('GET');
    });

    test('should create POST request with JSON body', () => {
      const testData = { message: 'test' };
      const request = createTestRequest('/api/test', {
        method: 'POST',
        body: testData
      });
      
      expect(request).toBeInstanceOf(Request);
      expect(request.method).toBe('POST');
      expect(request.headers.get('Content-Type')).toBe('application/json');
    });

    test('should create authenticated request', () => {
      const request = createAuthenticatedRequest('/api/protected', {
        method: 'GET'
      }, 'test-token');
      
      expect(request).toBeInstanceOf(Request);
      expect(request.headers.get('Authorization')).toBe('Bearer test-token');
    });

    test('should create webhook request', () => {
      const webhookEvent = {
        id: 'evt_test',
        type: 'test.event',
        data: { message: 'test' }
      };
      
      const request = createWebhookRequest(webhookEvent, 'test-signature');
      
      expect(request).toBeInstanceOf(Request);
      expect(request.method).toBe('POST');
      expect(request.headers.get('stripe-signature')).toBe('test-signature');
      expect(request.headers.get('content-type')).toBe('application/json');
    });

    test('should create webhook request without signature', () => {
      const webhookEvent = {
        id: 'evt_test',
        type: 'test.event',
        data: { message: 'test' }
      };
      
      const request = createWebhookRequest(webhookEvent, null);
      
      expect(request).toBeInstanceOf(Request);
      expect(request.method).toBe('POST');
      expect(request.headers.get('stripe-signature')).toBeNull();
      expect(request.headers.get('content-type')).toBe('application/json');
    });

    test('should handle request with custom headers', () => {
      const request = createTestRequest('/api/test', {
        method: 'PUT',
        headers: {
          'X-Custom-Header': 'custom-value',
          'Content-Type': 'text/plain'
        },
        body: 'plain text body'
      });
      
      expect(request).toBeInstanceOf(Request);
      expect(request.method).toBe('PUT');
      expect(request.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(request.headers.get('Content-Type')).toBe('text/plain');
    });

    test('should parse response JSON correctly', async () => {
      const testData = { success: true, message: 'test' };
      const response = new Response(JSON.stringify(testData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const { parseResponse } = await import('../utils/api-test-helpers');
      const parsedData = await parseResponse(response);
      
      expect(parsedData).toEqual(testData);
    });

    test('should parse response text correctly', async () => {
      const testText = 'plain text response';
      const response = new Response(testText, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
      
      const { parseResponse } = await import('../utils/api-test-helpers');
      const parsedData = await parseResponse(response);
      
      expect(parsedData).toBe(testText);
    });
  });

  describe('Error Handling', () => {
    test('should handle relative URLs gracefully', () => {
      // Should create a valid URL with localhost prefix for relative URLs
      const request = createTestRequest('/api/test');
      expect(request.url).toMatch(/^http:\/\/localhost:/);
    });

    test('should handle empty headers', () => {
      const request = createTestRequest('/api/test', {
        headers: {}
      });
      
      expect(request).toBeInstanceOf(Request);
      expect(request.headers).toBeInstanceOf(Headers);
    });

    test('should handle undefined body', () => {
      const request = createTestRequest('/api/test', {
        method: 'POST',
        body: undefined
      });
      
      expect(request).toBeInstanceOf(Request);
      expect(request.method).toBe('POST');
    });
  });
});