import {
  getInstallUrl,
  signAppJwt,
  getInstallationToken
} from '@/lib/githubApp';
import { SignJWT } from 'jose';

// Mock jose library
jest.mock('jose', () => ({
  SignJWT: jest.fn()
}));

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockedSignJWT = SignJWT as jest.MockedClass<typeof SignJWT>;

// Mock console.warn to test warning messages
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

describe('githubApp', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Set default environment variables
    process.env.GH_APP_ID = '12345';
    process.env.GH_APP_PRIVATE_KEY = 'test-private-key\\nwith-newlines';
    process.env.GH_APP_INSTALL_URL = 'https://github.com/apps/test-app/installations/new';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment variable warnings', () => {
    it('should warn when GH_APP_ID is not set', () => {
      delete process.env.GH_APP_ID;
      
      // Re-import module to trigger warnings
      jest.resetModules();
      require('@/lib/githubApp');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('GH_APP_ID not set');
    });

    it('should warn when GH_APP_PRIVATE_KEY is not set', () => {
      delete process.env.GH_APP_PRIVATE_KEY;
      
      jest.resetModules();
      require('@/lib/githubApp');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('GH_APP_PRIVATE_KEY not set');
    });

    it('should warn when GH_APP_INSTALL_URL is not set', () => {
      delete process.env.GH_APP_INSTALL_URL;
      
      jest.resetModules();
      require('@/lib/githubApp');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('GH_APP_INSTALL_URL not set');
    });

    it('should not warn when all environment variables are set', () => {
      // All vars are set in beforeEach
      jest.resetModules();
      require('@/lib/githubApp');
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('getInstallUrl', () => {
    it('should return install URL without state', () => {
      const result = getInstallUrl();
      
      expect(result).toBe('https://github.com/apps/test-app/installations/new');
    });

    it('should return install URL with state parameter', () => {
      const state = 'user123_installation';
      const result = getInstallUrl(state);
      
      expect(result).toBe('https://github.com/apps/test-app/installations/new?state=user123_installation');
    });

    it('should handle special characters in state', () => {
      const state = 'user@example.com_redirect=/dashboard';
      const result = getInstallUrl(state);
      
      const expectedUrl = 'https://github.com/apps/test-app/installations/new?state=' + 
                         encodeURIComponent('user@example.com_redirect=/dashboard');
      expect(result).toBe(expectedUrl);
    });

    it('should handle empty state', () => {
      const result = getInstallUrl('');
      
      expect(result).toBe('https://github.com/apps/test-app/installations/new');
    });

    it('should handle undefined state', () => {
      const result = getInstallUrl(undefined);
      
      expect(result).toBe('https://github.com/apps/test-app/installations/new');
    });

    it('should handle missing GH_APP_INSTALL_URL', () => {
      delete process.env.GH_APP_INSTALL_URL;
      
      jest.resetModules();
      const { getInstallUrl: getInstallUrlMissing } = require('@/lib/githubApp');
      
      const result = getInstallUrlMissing('test-state');
      
      // Should still work but with empty base URL
      expect(result).toBe('?state=test-state');
    });

    it('should handle complex URL parameters', () => {
      process.env.GH_APP_INSTALL_URL = 'https://github.com/apps/test-app/installations/new?existing=param';
      
      jest.resetModules();
      const { getInstallUrl: getInstallUrlComplex } = require('@/lib/githubApp');
      
      const result = getInstallUrlComplex('additional-state');
      
      expect(result).toBe('https://github.com/apps/test-app/installations/new?existing=param&state=additional-state');
    });
  });

  describe('signAppJwt', () => {
    it('should create and sign JWT token successfully', async () => {
      const mockJwtInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue('signed_app_jwt_token')
      };

      mockedSignJWT.mockReturnValue(mockJwtInstance as any);

      const result = await signAppJwt();

      expect(SignJWT).toHaveBeenCalledWith({
        iat: expect.any(Number),
        exp: expect.any(Number),
        iss: '12345'
      });

      expect(mockJwtInstance.setProtectedHeader).toHaveBeenCalledWith({ alg: 'RS256' });
      expect(mockJwtInstance.setIssuedAt).toHaveBeenCalled();
      expect(mockJwtInstance.setExpirationTime).toHaveBeenCalledWith('7d');
      expect(result).toBe('signed_app_jwt_token');
    });

    it('should handle JWT signing errors', async () => {
      const mockJwtInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockRejectedValue(new Error('Private key invalid'))
      };

      mockedSignJWT.mockReturnValue(mockJwtInstance as any);

      await expect(signAppJwt()).rejects.toThrow('Private key invalid');
    });

    it('should use fallback private key when GH_APP_PRIVATE_KEY is not set', async () => {
      delete process.env.GH_APP_PRIVATE_KEY;
      
      jest.resetModules();
      const { signAppJwt: signAppJwtFallback } = require('@/lib/githubApp');

      const mockJwtInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue('fallback_jwt_token')
      };

      mockedSignJWT.mockReturnValue(mockJwtInstance as any);

      const result = await signAppJwtFallback();

      expect(result).toBe('fallback_jwt_token');
    });

    it('should create JWT with correct timing', async () => {
      const mockJwtInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue('timed_jwt_token')
      };

      mockedSignJWT.mockReturnValue(mockJwtInstance as any);

      const beforeTime = Math.floor(Date.now() / 1000);
      await signAppJwt();
      const afterTime = Math.floor(Date.now() / 1000);

      const callArgs = mockedSignJWT.mock.calls[0][0] as any;
      
      // iat should be around 60 seconds ago
      expect(callArgs.iat).toBeGreaterThanOrEqual(beforeTime - 60);
      expect(callArgs.iat).toBeLessThanOrEqual(afterTime - 60);
      
      // exp should be 9 minutes from iat
      expect(callArgs.exp).toBe(callArgs.iat + 9 * 60);
      
      // iss should be the app ID
      expect(callArgs.iss).toBe('12345');
    });

    it('should handle newlines in private key', async () => {
      process.env.GH_APP_PRIVATE_KEY = 'line1\\nline2\\nline3';
      
      jest.resetModules();
      const { signAppJwt: signAppJwtNewlines } = require('@/lib/githubApp');

      const mockJwtInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue('newline_jwt_token')
      };

      mockedSignJWT.mockReturnValue(mockJwtInstance as any);

      await signAppJwtNewlines();

      // The sign method should be called with TextEncoder that processes the key with newlines replaced
      expect(mockJwtInstance.sign).toHaveBeenCalledWith(expect.any(Uint8Array));
    });
  });

  describe('getInstallationToken', () => {
    it('should get installation token successfully', async () => {
      const installationId = '12345678';
      const mockAppJwt = 'mock_app_jwt_token';
      const mockInstallationToken = 'ghs_installation_token_123';

      // Mock signAppJwt
      const mockJwtInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue(mockAppJwt)
      };
      mockedSignJWT.mockReturnValue(mockJwtInstance as any);

      // Mock GitHub API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          token: mockInstallationToken,
          expires_at: '2023-12-31T23:59:59Z',
          permissions: {}
        })
      } as Response);

      const result = await getInstallationToken(installationId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {
          method: 'POST',
          headers: {
            'authorization': `Bearer ${mockAppJwt}`,
            'accept': 'application/vnd.github+json',
            'x-github-api-version': '2022-11-28'
          }
        }
      );

      expect(result).toBe(mockInstallationToken);
    });

    it('should handle GitHub API errors', async () => {
      const installationId = '12345678';
      const mockAppJwt = 'mock_app_jwt_token';

      // Mock signAppJwt
      const mockJwtInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue(mockAppJwt)
      };
      mockedSignJWT.mockReturnValue(mockJwtInstance as any);

      // Mock failed GitHub API response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Installation not found')
      } as Response);

      await expect(getInstallationToken(installationId))
        .rejects.toThrow('GitHub access_tokens failed: 404 Installation not found');
    });

    it('should handle network errors', async () => {
      const installationId = '12345678';
      const mockAppJwt = 'mock_app_jwt_token';

      // Mock signAppJwt
      const mockJwtInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue(mockAppJwt)
      };
      mockedSignJWT.mockReturnValue(mockJwtInstance as any);

      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(getInstallationToken(installationId))
        .rejects.toThrow('Network error');
    });

    it('should handle JWT signing failure', async () => {
      const installationId = '12345678';

      // Mock JWT signing failure
      const mockJwtInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockRejectedValue(new Error('JWT signing failed'))
      };
      mockedSignJWT.mockReturnValue(mockJwtInstance as any);

      await expect(getInstallationToken(installationId))
        .rejects.toThrow('JWT signing failed');
    });

    it('should handle malformed API response', async () => {
      const installationId = '12345678';
      const mockAppJwt = 'mock_app_jwt_token';

      // Mock signAppJwt
      const mockJwtInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue(mockAppJwt)
      };
      mockedSignJWT.mockReturnValue(mockJwtInstance as any);

      // Mock API response without token field
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          // Missing token field
          expires_at: '2023-12-31T23:59:59Z'
        })
      } as Response);

      const result = await getInstallationToken(installationId);

      // Should handle undefined token gracefully
      expect(result).toBeUndefined();
    });

    it('should use correct API version and headers', async () => {
      const installationId = '87654321';
      const mockAppJwt = 'specific_app_jwt_token';
      const mockInstallationToken = 'ghs_specific_token_456';

      // Mock signAppJwt
      const mockJwtInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue(mockAppJwt)
      };
      mockedSignJWT.mockReturnValue(mockJwtInstance as any);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: mockInstallationToken })
      } as Response);

      await getInstallationToken(installationId);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/app/installations/87654321/access_tokens',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'authorization': 'Bearer specific_app_jwt_token',
            'accept': 'application/vnd.github+json',
            'x-github-api-version': '2022-11-28'
          })
        })
      );
    });
  });

  describe('Module integration', () => {
    it('should export all required functions', () => {
      const exports = require('@/lib/githubApp');
      
      expect(exports).toHaveProperty('getInstallUrl');
      expect(exports).toHaveProperty('signAppJwt');
      expect(exports).toHaveProperty('getInstallationToken');
      
      expect(typeof exports.getInstallUrl).toBe('function');
      expect(typeof exports.signAppJwt).toBe('function');
      expect(typeof exports.getInstallationToken).toBe('function');
    });

    it('should work with all environment variables missing', () => {
      delete process.env.GH_APP_ID;
      delete process.env.GH_APP_PRIVATE_KEY;
      delete process.env.GH_APP_INSTALL_URL;
      
      jest.resetModules();
      const exports = require('@/lib/githubApp');
      
      // Functions should still be exported and callable
      expect(() => exports.getInstallUrl()).not.toThrow();
      
      // Should warn about missing variables
      expect(consoleWarnSpy).toHaveBeenCalledWith('GH_APP_ID not set');
      expect(consoleWarnSpy).toHaveBeenCalledWith('GH_APP_PRIVATE_KEY not set');
      expect(consoleWarnSpy).toHaveBeenCalledWith('GH_APP_INSTALL_URL not set');
    });
  });
});