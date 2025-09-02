import Stripe from "stripe";

// Mock Stripe
jest.mock("stripe");

const mockStripe = Stripe as jest.MockedClass<typeof Stripe>;

describe('stripe', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Set default environment variables
    process.env.STRIPE_SECRET_KEY = 'sk_test_123456789';
    process.env.STRIPE_CURRENCY = 'usd';
    process.env.STRIPE_PRICE_DOLLARS = '2000000';
    process.env.STRIPE_APPLICATION_FEE_BPS = '500';
    process.env.STRIPE_DESTINATION_ACCOUNT_ID = 'acct_test123';
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  describe('Stripe initialization', () => {
    it('should initialize Stripe with correct API key and version', () => {
      // Import after setting environment variables
      require('@/lib/stripe');

      expect(Stripe).toHaveBeenCalledWith('sk_test_123456789', { apiVersion: "2024-06-20" });
    });

    it('should handle missing STRIPE_SECRET_KEY', () => {
      delete process.env.STRIPE_SECRET_KEY;
      
      jest.resetModules();
      
      // This should still work, but will pass undefined as the key
      require('@/lib/stripe');
      
      expect(Stripe).toHaveBeenCalledWith(undefined, { apiVersion: "2024-06-20" });
    });
  });

  describe('STRIPE_CURRENCY', () => {
    it('should use currency from environment variable', () => {
      process.env.STRIPE_CURRENCY = 'eur';
      
      const { STRIPE_CURRENCY } = require('@/lib/stripe');
      
      expect(STRIPE_CURRENCY).toBe('eur');
    });

    it('should default to "usd" when not set', () => {
      delete process.env.STRIPE_CURRENCY;
      
      const { STRIPE_CURRENCY } = require('@/lib/stripe');
      
      expect(STRIPE_CURRENCY).toBe('usd');
    });

    it('should handle empty string currency', () => {
      process.env.STRIPE_CURRENCY = '';
      
      const { STRIPE_CURRENCY } = require('@/lib/stripe');
      
      expect(STRIPE_CURRENCY).toBe('usd'); // Should fallback to default
    });

    it('should handle various currency codes', () => {
      const currencies = ['gbp', 'cad', 'aud', 'jpy', 'chf'];
      
      currencies.forEach(currency => {
        jest.resetModules();
        process.env.STRIPE_CURRENCY = currency;
        
        const { STRIPE_CURRENCY } = require('@/lib/stripe');
        expect(STRIPE_CURRENCY).toBe(currency);
      });
    });
  });

  describe('STRIPE_PRICE_DOLLARS', () => {
    it('should use price from environment variable', () => {
      process.env.STRIPE_PRICE_DOLLARS = '5000000';
      
      const { STRIPE_PRICE_DOLLARS } = require('@/lib/stripe');
      
      expect(STRIPE_PRICE_DOLLARS).toBe(5000000);
    });

    it('should default to 2000000 when not set', () => {
      delete process.env.STRIPE_PRICE_DOLLARS;
      
      const { STRIPE_PRICE_DOLLARS } = require('@/lib/stripe');
      
      expect(STRIPE_PRICE_DOLLARS).toBe(2000000);
    });

    it('should handle string numbers correctly', () => {
      process.env.STRIPE_PRICE_DOLLARS = '1500000';
      
      const { STRIPE_PRICE_DOLLARS } = require('@/lib/stripe');
      
      expect(STRIPE_PRICE_DOLLARS).toBe(1500000);
      expect(typeof STRIPE_PRICE_DOLLARS).toBe('number');
    });

    it('should handle invalid number strings', () => {
      process.env.STRIPE_PRICE_DOLLARS = 'not-a-number';
      
      const { STRIPE_PRICE_DOLLARS } = require('@/lib/stripe');
      
      // Number('not-a-number') returns NaN, so we expect NaN or handle it
      expect(STRIPE_PRICE_DOLLARS).toBeNaN();
    });

    it('should handle zero value', () => {
      process.env.STRIPE_PRICE_DOLLARS = '0';
      
      const { STRIPE_PRICE_DOLLARS } = require('@/lib/stripe');
      
      expect(STRIPE_PRICE_DOLLARS).toBe(0);
    });

    it('should handle negative values', () => {
      process.env.STRIPE_PRICE_DOLLARS = '-1000000';
      
      const { STRIPE_PRICE_DOLLARS } = require('@/lib/stripe');
      
      expect(STRIPE_PRICE_DOLLARS).toBe(-1000000);
    });

    it('should handle decimal values', () => {
      process.env.STRIPE_PRICE_DOLLARS = '1500000.50';
      
      const { STRIPE_PRICE_DOLLARS } = require('@/lib/stripe');
      
      expect(STRIPE_PRICE_DOLLARS).toBe(1500000.5);
    });
  });

  describe('STRIPE_APP_FEE_BPS', () => {
    it('should use app fee from environment variable', () => {
      process.env.STRIPE_APPLICATION_FEE_BPS = '750';
      
      const { STRIPE_APP_FEE_BPS } = require('@/lib/stripe');
      
      expect(STRIPE_APP_FEE_BPS).toBe(750);
    });

    it('should default to 500 when not set', () => {
      delete process.env.STRIPE_APPLICATION_FEE_BPS;
      
      const { STRIPE_APP_FEE_BPS } = require('@/lib/stripe');
      
      expect(STRIPE_APP_FEE_BPS).toBe(500);
    });

    it('should handle string numbers correctly', () => {
      process.env.STRIPE_APPLICATION_FEE_BPS = '250';
      
      const { STRIPE_APP_FEE_BPS } = require('@/lib/stripe');
      
      expect(STRIPE_APP_FEE_BPS).toBe(250);
      expect(typeof STRIPE_APP_FEE_BPS).toBe('number');
    });

    it('should handle invalid number strings', () => {
      process.env.STRIPE_APPLICATION_FEE_BPS = 'invalid';
      
      const { STRIPE_APP_FEE_BPS } = require('@/lib/stripe');
      
      // Number('invalid') returns NaN, so we expect NaN
      expect(STRIPE_APP_FEE_BPS).toBeNaN();
    });

    it('should handle edge case values', () => {
      const testCases = [
        { input: '0', expected: 0 },
        { input: '10000', expected: 10000 }, // Maximum BPS value
        { input: '1', expected: 1 },
        { input: '9999', expected: 9999 }
      ];

      testCases.forEach(({ input, expected }) => {
        jest.resetModules();
        process.env.STRIPE_APPLICATION_FEE_BPS = input;
        
        const { STRIPE_APP_FEE_BPS } = require('@/lib/stripe');
        expect(STRIPE_APP_FEE_BPS).toBe(expected);
      });
    });
  });

  describe('DEST_ACCOUNT', () => {
    it('should use destination account from environment variable', () => {
      process.env.STRIPE_DESTINATION_ACCOUNT_ID = 'acct_custom123';
      
      const { DEST_ACCOUNT } = require('@/lib/stripe');
      
      expect(DEST_ACCOUNT).toBe('acct_custom123');
    });

    it('should default to empty string when not set', () => {
      delete process.env.STRIPE_DESTINATION_ACCOUNT_ID;
      
      const { DEST_ACCOUNT } = require('@/lib/stripe');
      
      expect(DEST_ACCOUNT).toBe('');
    });

    it('should handle empty string account ID', () => {
      process.env.STRIPE_DESTINATION_ACCOUNT_ID = '';
      
      const { DEST_ACCOUNT } = require('@/lib/stripe');
      
      expect(DEST_ACCOUNT).toBe('');
    });

    it('should preserve various account ID formats', () => {
      const accountIds = [
        'acct_1234567890123456',
        'acct_test_long_account_id',
        'acct_prod_123',
        'custom-account-format'
      ];

      accountIds.forEach(accountId => {
        jest.resetModules();
        process.env.STRIPE_DESTINATION_ACCOUNT_ID = accountId;
        
        const { DEST_ACCOUNT } = require('@/lib/stripe');
        expect(DEST_ACCOUNT).toBe(accountId);
      });
    });
  });

  describe('Module exports', () => {
    it('should export all required constants and stripe instance', () => {
      const exports = require('@/lib/stripe');
      
      expect(exports).toHaveProperty('stripe');
      expect(exports).toHaveProperty('STRIPE_CURRENCY');
      expect(exports).toHaveProperty('STRIPE_PRICE_DOLLARS');
      expect(exports).toHaveProperty('STRIPE_APP_FEE_BPS');
      expect(exports).toHaveProperty('DEST_ACCOUNT');
    });

    it('should have correct types for all exports', () => {
      const {
        stripe,
        STRIPE_CURRENCY,
        STRIPE_PRICE_DOLLARS,
        STRIPE_APP_FEE_BPS,
        DEST_ACCOUNT
      } = require('@/lib/stripe');

      expect(typeof STRIPE_CURRENCY).toBe('string');
      expect(typeof STRIPE_PRICE_DOLLARS).toBe('number');
      expect(typeof STRIPE_APP_FEE_BPS).toBe('number');
      expect(typeof DEST_ACCOUNT).toBe('string');
      // stripe is a mocked instance, just check it exists
      expect(stripe).toBeDefined();
    });
  });

  describe('Environment variable precedence', () => {
    it('should prioritize explicit environment variables over defaults', () => {
      process.env.STRIPE_CURRENCY = 'gbp';
      process.env.STRIPE_PRICE_DOLLARS = '3000000';
      process.env.STRIPE_APPLICATION_FEE_BPS = '750';
      process.env.STRIPE_DESTINATION_ACCOUNT_ID = 'acct_explicit123';

      const {
        STRIPE_CURRENCY,
        STRIPE_PRICE_DOLLARS,
        STRIPE_APP_FEE_BPS,
        DEST_ACCOUNT
      } = require('@/lib/stripe');

      expect(STRIPE_CURRENCY).toBe('gbp');
      expect(STRIPE_PRICE_DOLLARS).toBe(3000000);
      expect(STRIPE_APP_FEE_BPS).toBe(750);
      expect(DEST_ACCOUNT).toBe('acct_explicit123');
    });

    it('should use defaults when environment variables are undefined', () => {
      delete process.env.STRIPE_CURRENCY;
      delete process.env.STRIPE_PRICE_DOLLARS;
      delete process.env.STRIPE_APPLICATION_FEE_BPS;
      delete process.env.STRIPE_DESTINATION_ACCOUNT_ID;

      const {
        STRIPE_CURRENCY,
        STRIPE_PRICE_DOLLARS,
        STRIPE_APP_FEE_BPS,
        DEST_ACCOUNT
      } = require('@/lib/stripe');

      expect(STRIPE_CURRENCY).toBe('usd');
      expect(STRIPE_PRICE_DOLLARS).toBe(2000000);
      expect(STRIPE_APP_FEE_BPS).toBe(500);
      expect(DEST_ACCOUNT).toBe('');
    });
  });
});