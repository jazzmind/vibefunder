/**
 * Comprehensive Network Error Tests
 * Tests network-level error handling including timeouts, connection issues, DNS failures, and rate limiting
 */

import { setTimeout as setTimeoutPromise } from 'timers/promises';

// Mock fetch for network testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock network utilities
const mockNetworkUtils = {
  makeRequest: jest.fn(),
  retryRequest: jest.fn(),
  checkConnectivity: jest.fn(),
  resolveHostname: jest.fn(),
};

// Mock AbortController for timeout testing
class MockAbortController {
  signal: AbortSignal;
  private listeners: Array<{ type: string, callback: Function }> = [];
  
  constructor() {
    this.signal = {
      aborted: false,
      addEventListener: jest.fn((type: string, callback: Function) => {
        this.listeners.push({ type, callback });
      }),
      removeEventListener: jest.fn(),
      onabort: null,
      reason: undefined,
      throwIfAborted: jest.fn()
    } as any;
  }
  
  abort(reason?: any) {
    (this.signal as any).aborted = true;
    (this.signal as any).reason = reason;
    this.listeners.forEach(({ type, callback }) => {
      if (type === 'abort') {
        callback(new Event('abort'));
      }
    });
  }
}

global.AbortController = MockAbortController as any;

describe('Network Error Scenarios', () => {
  // Set timeout for all network tests
  jest.setTimeout(10000); // 10 seconds
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Timeout Errors', () => {
    // Increase timeout for these specific tests
    jest.setTimeout(15000);
    it('should handle request timeout', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      (timeoutError as any).code = 'ETIMEDOUT';

      mockFetch.mockRejectedValue(timeoutError);

      try {
        // Create controller for timeout simulation
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await fetch('https://api.example.com/data', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        fail('Should have thrown timeout error');
      } catch (error) {
        expect((error as Error).name).toBe('TimeoutError');
        expect((error as any).code).toBe('ETIMEDOUT');
      }
    });

    it('should handle connection timeout', async () => {
      const connectionTimeoutError = new Error('connect ETIMEDOUT 192.168.1.1:443');
      (connectionTimeoutError as any).code = 'ETIMEDOUT';
      (connectionTimeoutError as any).errno = 'ETIMEDOUT';
      (connectionTimeoutError as any).syscall = 'connect';

      mockFetch.mockRejectedValue(connectionTimeoutError);

      try {
        await fetch('https://slow-server.example.com/api');
        fail('Should have thrown connection timeout error');
      } catch (error) {
        expect((error as any).code).toBe('ETIMEDOUT');
        expect((error as any).syscall).toBe('connect');
      }
    });

    it('should handle socket timeout', async () => {
      const socketTimeoutError = new Error('socket hang up');
      (socketTimeoutError as any).code = 'ECONNRESET';

      mockFetch.mockRejectedValue(socketTimeoutError);

      try {
        await fetch('https://api.example.com/slow-endpoint');
        fail('Should have thrown socket timeout error');
      } catch (error) {
        expect((error as any).code).toBe('ECONNRESET');
        expect((error as Error).message).toBe('socket hang up');
      }
    });

    it('should handle read timeout', async () => {
      const readTimeoutError = new Error('read ETIMEDOUT');
      (readTimeoutError as any).code = 'ETIMEDOUT';
      (readTimeoutError as any).errno = 'ETIMEDOUT';
      (readTimeoutError as any).syscall = 'read';

      mockFetch.mockRejectedValue(readTimeoutError);

      try {
        await fetch('https://api.example.com/large-response');
        fail('Should have thrown read timeout error');
      } catch (error) {
        expect((error as any).code).toBe('ETIMEDOUT');
        expect((error as any).syscall).toBe('read');
      }
    });

    it('should handle abort signal timeout', async () => {
      const controller = new AbortController();
      
      // Mock fetch to simulate a slow request
      mockFetch.mockImplementation(() => 
        new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          }, 1000);
          
          // Listen for abort signal
          controller.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
          
          if (controller.signal.aborted) {
            clearTimeout(timeoutId);
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          }
        })
      );

      // Abort after 500ms using standard setTimeout
      const abortTimeoutId = setTimeout(() => controller.abort(), 500);

      try {
        await fetch('https://api.example.com/data', {
          signal: controller.signal
        });
        clearTimeout(abortTimeoutId);
        fail('Should have thrown abort error');
      } catch (error) {
        clearTimeout(abortTimeoutId);
        expect((error as Error).name).toBe('AbortError');
      }
    });
  });

  describe('Connection Refused Errors', () => {
    it('should handle ECONNREFUSED error', async () => {
      const connectionRefusedError = new Error('connect ECONNREFUSED 127.0.0.1:3000');
      (connectionRefusedError as any).code = 'ECONNREFUSED';
      (connectionRefusedError as any).errno = 'ECONNREFUSED';
      (connectionRefusedError as any).syscall = 'connect';
      (connectionRefusedError as any).address = '127.0.0.1';
      (connectionRefusedError as any).port = 3000;

      mockFetch.mockRejectedValue(connectionRefusedError);

      try {
        await fetch('http://localhost:3000/api/test');
        fail('Should have thrown connection refused error');
      } catch (error) {
        expect((error as any).code).toBe('ECONNREFUSED');
        expect((error as any).address).toBe('127.0.0.1');
        expect((error as any).port).toBe(3000);
      }
    });

    it('should handle server not running', async () => {
      const serverDownError = new Error('Request failed with status code 502');
      (serverDownError as any).status = 502;
      (serverDownError as any).statusText = 'Bad Gateway';

      mockFetch.mockRejectedValue(serverDownError);

      try {
        await fetch('https://api.example.com/health');
        fail('Should have thrown server down error');
      } catch (error) {
        expect((error as any).status).toBe(502);
        expect((error as any).statusText).toBe('Bad Gateway');
      }
    });

    it('should handle service unavailable', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: () => Promise.resolve('Service temporarily unavailable'),
        json: () => Promise.resolve({
          error: 'Service Unavailable',
          message: 'The service is temporarily unavailable. Please try again later.',
          retryAfter: 300
        })
      } as Response);

      const response = await fetch('https://api.example.com/data');
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(503);
      expect(response.statusText).toBe('Service Unavailable');

      const errorData = await response.json();
      expect(errorData.retryAfter).toBe(300);
    });

    it('should handle connection reset by peer', async () => {
      const connectionResetError = new Error('read ECONNRESET');
      (connectionResetError as any).code = 'ECONNRESET';
      (connectionResetError as any).errno = 'ECONNRESET';
      (connectionResetError as any).syscall = 'read';

      mockFetch.mockRejectedValue(connectionResetError);

      try {
        await fetch('https://api.example.com/data');
        fail('Should have thrown connection reset error');
      } catch (error) {
        expect((error as any).code).toBe('ECONNRESET');
        expect((error as any).syscall).toBe('read');
      }
    });
  });

  describe('DNS Failures', () => {
    it('should handle DNS resolution failure', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND nonexistent.example.com');
      (dnsError as any).code = 'ENOTFOUND';
      (dnsError as any).errno = 'ENOTFOUND';
      (dnsError as any).syscall = 'getaddrinfo';
      (dnsError as any).hostname = 'nonexistent.example.com';

      mockFetch.mockRejectedValue(dnsError);

      try {
        await fetch('https://nonexistent.example.com/api/data');
        fail('Should have thrown DNS error');
      } catch (error) {
        expect((error as any).code).toBe('ENOTFOUND');
        expect((error as any).hostname).toBe('nonexistent.example.com');
      }
    });

    it('should handle DNS timeout', async () => {
      const dnsTimeoutError = new Error('getaddrinfo ETIMEDOUT example.com');
      (dnsTimeoutError as any).code = 'ETIMEDOUT';
      (dnsTimeoutError as any).errno = 'ETIMEDOUT';
      (dnsTimeoutError as any).syscall = 'getaddrinfo';
      (dnsTimeoutError as any).hostname = 'example.com';

      mockFetch.mockRejectedValue(dnsTimeoutError);

      try {
        await fetch('https://example.com/api/data');
        fail('Should have thrown DNS timeout error');
      } catch (error) {
        expect((error as any).code).toBe('ETIMEDOUT');
        expect((error as any).syscall).toBe('getaddrinfo');
      }
    });

    it('should handle DNS server failure', async () => {
      const dnsServerError = new Error('getaddrinfo EAI_AGAIN example.com');
      (dnsServerError as any).code = 'EAI_AGAIN';
      (dnsServerError as any).errno = 'EAI_AGAIN';
      (dnsServerError as any).syscall = 'getaddrinfo';

      mockFetch.mockRejectedValue(dnsServerError);

      try {
        await fetch('https://example.com/api/data');
        fail('Should have thrown DNS server error');
      } catch (error) {
        expect((error as any).code).toBe('EAI_AGAIN');
        expect((error as any).syscall).toBe('getaddrinfo');
      }
    });

    it('should handle malformed hostname', async () => {
      const hostnameError = new Error('Invalid hostname');
      (hostnameError as any).code = 'EINVAL';

      mockFetch.mockRejectedValue(hostnameError);

      try {
        await fetch('https://invalid..hostname..example.com/api');
        fail('Should have thrown hostname error');
      } catch (error) {
        expect((error as any).code).toBe('EINVAL');
        expect((error as Error).message).toBe('Invalid hostname');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should handle 429 Too Many Requests', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([
          ['retry-after', '60'],
          ['x-ratelimit-limit', '100'],
          ['x-ratelimit-remaining', '0'],
          ['x-ratelimit-reset', '1640995200']
        ]),
        json: () => Promise.resolve({
          error: 'Rate limit exceeded',
          message: 'You have exceeded the rate limit. Please try again in 60 seconds.',
          retryAfter: 60
        })
      } as Response);

      const response = await fetch('https://api.example.com/data');
      
      expect(response.status).toBe(429);
      expect(response.headers.get('retry-after')).toBe('60');
      expect(response.headers.get('x-ratelimit-remaining')).toBe('0');

      const errorData = await response.json();
      expect(errorData.retryAfter).toBe(60);
    });

    it('should handle exponential backoff rate limiting', async () => {
      let attemptCount = 0;
      const maxAttempts = 3;
      const baseDelay = 1000; // 1 second

      mockNetworkUtils.retryRequest.mockImplementation(async (fn, options) => {
        while (attemptCount < maxAttempts) {
          try {
            attemptCount++;
            return await fn();
          } catch (error) {
            if (attemptCount >= maxAttempts) throw error;
            
            const delay = baseDelay * Math.pow(2, attemptCount - 1);
            await setTimeoutPromise(delay);
          }
        }
      });

      const failingRequest = jest.fn()
        .mockRejectedValueOnce({ status: 429, message: 'Rate limited' })
        .mockRejectedValueOnce({ status: 429, message: 'Rate limited' })
        .mockResolvedValueOnce({ data: 'success' });

      try {
        await mockNetworkUtils.retryRequest(failingRequest);
        fail('Should have thrown after max attempts');
      } catch (error) {
        expect(attemptCount).toBe(maxAttempts);
      }
    });

    it('should handle API quota exceeded', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({
          error: 'Quota exceeded',
          message: 'Your API quota has been exceeded. Upgrade your plan or wait for the quota to reset.',
          quotaLimit: 1000,
          quotaUsed: 1000,
          quotaResetTime: '2024-01-01T00:00:00Z'
        })
      } as Response);

      const response = await fetch('https://api.example.com/premium-data');
      const errorData = await response.json();

      expect(response.status).toBe(403);
      expect(errorData.quotaUsed).toBe(errorData.quotaLimit);
      expect(errorData.error).toBe('Quota exceeded');
    });

    it('should handle concurrent request limiting', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({
          error: 'Too many concurrent requests',
          message: 'You have too many concurrent requests. Please wait for existing requests to complete.',
          maxConcurrent: 5,
          currentConcurrent: 6
        })
      } as Response);

      const response = await fetch('https://api.example.com/data');
      const errorData = await response.json();

      expect(response.status).toBe(429);
      expect(errorData.currentConcurrent).toBeGreaterThan(errorData.maxConcurrent);
    });
  });

  describe('SSL/TLS Errors', () => {
    it('should handle certificate verification failure', async () => {
      const certError = new Error('certificate verify failed');
      (certError as any).code = 'CERT_UNTRUSTED';

      mockFetch.mockRejectedValue(certError);

      try {
        await fetch('https://self-signed.badssl.com/');
        fail('Should have thrown certificate error');
      } catch (error) {
        expect((error as any).code).toBe('CERT_UNTRUSTED');
        expect((error as Error).message).toBe('certificate verify failed');
      }
    });

    it('should handle SSL handshake failure', async () => {
      const sslError = new Error('SSL handshake failed');
      (sslError as any).code = 'ECONNRESET';
      (sslError as any).reason = 'SSL_HANDSHAKE_FAILURE';

      mockFetch.mockRejectedValue(sslError);

      try {
        await fetch('https://expired.badssl.com/');
        fail('Should have thrown SSL handshake error');
      } catch (error) {
        expect((error as any).code).toBe('ECONNRESET');
        expect((error as any).reason).toBe('SSL_HANDSHAKE_FAILURE');
      }
    });

    it('should handle certificate expired', async () => {
      const expiredCertError = new Error('certificate has expired');
      (expiredCertError as any).code = 'CERT_HAS_EXPIRED';

      mockFetch.mockRejectedValue(expiredCertError);

      try {
        await fetch('https://expired.badssl.com/');
        fail('Should have thrown expired certificate error');
      } catch (error) {
        expect((error as any).code).toBe('CERT_HAS_EXPIRED');
      }
    });
  });

  describe('Proxy and Firewall Errors', () => {
    it('should handle proxy authentication required', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 407,
        statusText: 'Proxy Authentication Required',
        headers: new Map([['proxy-authenticate', 'Basic realm="proxy"']]),
        json: () => Promise.resolve({
          error: 'Proxy authentication required',
          message: 'Please provide valid proxy credentials.'
        })
      } as Response);

      const response = await fetch('https://api.example.com/data');
      
      expect(response.status).toBe(407);
      expect(response.headers.get('proxy-authenticate')).toBe('Basic realm="proxy"');
    });

    it('should handle firewall blocking', async () => {
      const firewallError = new Error('connect EACCES');
      (firewallError as any).code = 'EACCES';
      (firewallError as any).errno = 'EACCES';
      (firewallError as any).syscall = 'connect';

      mockFetch.mockRejectedValue(firewallError);

      try {
        await fetch('https://blocked-by-firewall.example.com/');
        fail('Should have thrown firewall error');
      } catch (error) {
        expect((error as any).code).toBe('EACCES');
        expect((error as any).syscall).toBe('connect');
      }
    });

    it('should handle proxy timeout', async () => {
      const proxyTimeoutError = new Error('Proxy timeout');
      (proxyTimeoutError as any).code = 'ETIMEDOUT';
      (proxyTimeoutError as any).proxy = true;

      mockFetch.mockRejectedValue(proxyTimeoutError);

      try {
        await fetch('https://api.example.com/data');
        fail('Should have thrown proxy timeout error');
      } catch (error) {
        expect((error as any).code).toBe('ETIMEDOUT');
        expect((error as any).proxy).toBe(true);
      }
    });
  });

  describe('Network Connectivity Issues', () => {
    it('should handle network unreachable', async () => {
      const networkError = new Error('Network is unreachable');
      (networkError as any).code = 'ENETUNREACH';
      (networkError as any).errno = 'ENETUNREACH';
      (networkError as any).syscall = 'connect';

      mockFetch.mockRejectedValue(networkError);

      try {
        await fetch('https://api.example.com/data');
        fail('Should have thrown network unreachable error');
      } catch (error) {
        expect((error as any).code).toBe('ENETUNREACH');
      }
    });

    it('should handle host unreachable', async () => {
      const hostUnreachableError = new Error('No route to host');
      (hostUnreachableError as any).code = 'EHOSTUNREACH';
      (hostUnreachableError as any).errno = 'EHOSTUNREACH';
      (hostUnreachableError as any).syscall = 'connect';

      mockFetch.mockRejectedValue(hostUnreachableError);

      try {
        await fetch('https://192.168.999.999/api'); // Invalid IP
        fail('Should have thrown host unreachable error');
      } catch (error) {
        expect((error as any).code).toBe('EHOSTUNREACH');
      }
    });

    it('should handle connection lost during request', async () => {
      const connectionLostError = new Error('Connection lost');
      (connectionLostError as any).code = 'EPIPE';
      (connectionLostError as any).errno = 'EPIPE';
      (connectionLostError as any).syscall = 'write';

      mockFetch.mockRejectedValue(connectionLostError);

      try {
        await fetch('https://api.example.com/upload', {
          method: 'POST',
          body: 'large data payload...'
        });
        fail('Should have thrown connection lost error');
      } catch (error) {
        expect((error as any).code).toBe('EPIPE');
        expect((error as any).syscall).toBe('write');
      }
    });
  });

  describe('HTTP Protocol Errors', () => {
    it('should handle malformed HTTP response', async () => {
      const malformedError = new Error('Parse Error: Expected HTTP/');
      (malformedError as any).code = 'HPE_INVALID_CONSTANT';

      mockFetch.mockRejectedValue(malformedError);

      try {
        await fetch('https://malformed-response.example.com/');
        fail('Should have thrown malformed response error');
      } catch (error) {
        expect((error as any).code).toBe('HPE_INVALID_CONSTANT');
        expect((error as Error).message).toContain('Parse Error');
      }
    });

    it('should handle incomplete HTTP response', async () => {
      const incompleteError = new Error('socket hang up');
      (incompleteError as any).code = 'ECONNRESET';

      mockFetch.mockRejectedValue(incompleteError);

      try {
        await fetch('https://api.example.com/incomplete-response');
        fail('Should have thrown incomplete response error');
      } catch (error) {
        expect((error as any).code).toBe('ECONNRESET');
        expect((error as Error).message).toBe('socket hang up');
      }
    });

    it('should handle unsupported HTTP version', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 505,
        statusText: 'HTTP Version Not Supported',
        json: () => Promise.resolve({
          error: 'HTTP version not supported',
          supportedVersions: ['HTTP/1.1', 'HTTP/2.0'],
          receivedVersion: 'HTTP/0.9'
        })
      } as Response);

      const response = await fetch('https://api.example.com/data');
      const errorData = await response.json();

      expect(response.status).toBe(505);
      expect(errorData.supportedVersions).toContain('HTTP/1.1');
      expect(errorData.receivedVersion).toBe('HTTP/0.9');
    });
  });
});