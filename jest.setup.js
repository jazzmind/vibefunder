// Global test setup for VibeFunder
require('@testing-library/jest-dom');

// Global mock for AIService to handle abstract class issues
jest.mock('./lib/ai/aiService', () => {
  const original = jest.requireActual('./lib/ai/aiService');
  
  // Create a concrete mock class that can be extended
  class MockAIService {
    constructor(config = {}) {
      this.config = {
        logPrefix: config.logPrefix || 'Mock',
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 4000,
        model: config.model || 'gpt-3.5-turbo',
        ...config
      };
      this.client = {};
      this.sessionId = config.sessionId || 'test-session-' + Math.random().toString(36).substring(7);
    }

    // Mock all the methods that AIService implementations use
    callAI = jest.fn();
    log = jest.fn();
    logInfo = jest.fn();
    logError = jest.fn();
    logWarning = jest.fn();
    createPrompt = jest.fn();
    formatResponse = jest.fn();
    
    // Mock protected methods
    validateInput = jest.fn();
    processResponse = jest.fn();
    retryRequest = jest.fn();
  }

  return {
    ...original,
    AIService: MockAIService,
  };
});

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';

// Force Node.js environment detection for Prisma
if (typeof global !== 'undefined') {
  global.process = global.process || process;
  global.Buffer = global.Buffer || Buffer;
}

// Ensure TEST_DATABASE_URL is properly set before any database operations
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  console.log('🔄 Jest Setup: Using TEST_DATABASE_URL for all database operations');
} else {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/vibefunder_test';
  console.warn('⚠️ Jest Setup: TEST_DATABASE_URL not set, using fallback database URL');
}

// Ensure Prisma uses Node.js client, not browser client
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';

// Polyfill Web APIs for Node.js test environment
// Polyfills for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  const util = require('util');
  global.TextEncoder = util.TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  const util = require('util');
  global.TextDecoder = util.TextDecoder;
}

// These are needed for Next.js API route testing
if (typeof global.Request === 'undefined') {
  const { Request } = require('undici');
  global.Request = Request;
}

if (typeof global.Response === 'undefined') {
  const { Response } = require('undici');
  global.Response = Response;
}

if (typeof global.Headers === 'undefined') {
  const { Headers } = require('undici');
  global.Headers = Headers;
}

if (typeof global.FormData === 'undefined') {
  const { FormData } = require('undici');
  global.FormData = FormData;
}

// Polyfill TextEncoder/TextDecoder if not available
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder } = require('util');
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  const { TextDecoder } = require('util');
  global.TextDecoder = TextDecoder;
}

// Mock crypto.subtle for Web Crypto API if not available
if (typeof global.crypto === 'undefined') {
  const { webcrypto } = require('crypto');
  global.crypto = webcrypto;
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Global AIService mock to fix inheritance issues
global.mockCallAI = jest.fn();

// Mock both path variants - with and without @/ alias
jest.mock('./lib/ai/aiService.ts', () => {
  class MockAIService {
    constructor(config = {}) {
      this.config = {
        maxRetries: 3,
        timeoutMs: 30000,
        backoffMultiplier: 2,
        enableLogging: false,
        logPrefix: this.constructor.name,
        enableDebugLogging: false,
        ...config,
      };
      this.sessionId = config.sessionId || 'test-session-123';
      this.client = {};
    }
    
    callAI = global.mockCallAI;
    log = jest.fn();
    validateInput = jest.fn().mockImplementation((data, schema) => schema.parse(data));
    executeWithRetry = jest.fn().mockImplementation(async (operation) => {
      const result = await operation();
      return { data: result, metadata: { executionTimeMs: 100, retries: 0 } };
    });
    createFileInput = jest.fn((fileId) => ({ type: 'input_file', file_id: fileId }));
    createTextInput = jest.fn((text) => ({ type: 'input_text', text }));
    extractTokenUsage = jest.fn();
    extractModel = jest.fn();
    generateImage = jest.fn();
    callAIWithFiles = jest.fn();
  }
  
  const AIErrorType = {
    API_ERROR: 'api_error',
    RATE_LIMIT: 'rate_limit',
    TIMEOUT: 'timeout',
    VALIDATION: 'validation',
    PROCESSING: 'processing',
    NETWORK: 'network',
  };
  
  class MockAIError extends Error {
    constructor(type, message, originalError, retryable = false) {
      super(message);
      this.name = 'AIError';
      this.type = type;
      this.originalError = originalError;
      this.retryable = retryable;
    }
    
    static fromOpenAIError(error) {
      const message = error?.message || 'Unknown OpenAI error';
      return new MockAIError(AIErrorType.API_ERROR, message, error, false);
    }
  }
  
  return {
    AIService: MockAIService,
    default: MockAIService,
    AIError: MockAIError,
    AIErrorType,
  };
});




// Mock fetch globally for API tests
// Note: Disabled for now to allow real API testing
// global.fetch = require('jest-fetch-mock');

// Console configuration for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress known warnings during tests
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: componentWillReceiveProps') ||
       args[0].includes('act() wrapped'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('OpenAI API key not configured') ||
       args[0].includes('Could not read .env.local'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test timeout
jest.setTimeout(30000);

// Mock OpenAI for tests that don't need real AI calls
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    images: {
      generate: jest.fn().mockResolvedValue({
        data: [{
          url: 'https://example.com/test-image.png'
        }]
      })
    }
  }));
});

// Custom matchers
expect.extend({
  toBeValidUrl(received) {
    const pass = /^https?:\/\//.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      };
    }
  },
  
  toHaveValidImageFormat(received) {
    const pass = /\.(jpg|jpeg|png|gif|webp)$/i.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to have valid image format`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have valid image format`,
        pass: false,
      };
    }
  }
});