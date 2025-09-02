// Global test setup for VibeFunder
import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';

// Ensure TEST_DATABASE_URL is properly set before any database operations
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  console.log('🔄 Jest Setup: Using TEST_DATABASE_URL for all database operations');
} else {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/vibefunder_test';
  console.warn('⚠️ Jest Setup: TEST_DATABASE_URL not set, using fallback database URL');
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