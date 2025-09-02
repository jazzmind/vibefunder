import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn()
}));

const MockedPrismaClient = PrismaClient as jest.MockedClass<typeof PrismaClient>;

describe('db', () => {
  const originalEnv = process.env;
  let mockPrismaInstance: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Create a mock instance
    mockPrismaInstance = {
      $connect: jest.fn(),
      $disconnect: jest.fn()
    } as any;

    MockedPrismaClient.mockImplementation(() => mockPrismaInstance);

    // Clear global prisma instance
    delete (global as any).prisma;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
    delete (global as any).prisma;
  });

  describe('getDatabaseUrl', () => {
    it('should return TEST_DATABASE_URL in test environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.TEST_DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
      process.env.DATABASE_URL = 'postgresql://prod:prod@localhost:5432/prod_db';
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://test:test@localhost:5432/test_db'
          }
        },
        log: ['error']
      });
    });

    it('should fallback to DATABASE_URL in test environment when TEST_DATABASE_URL is not set', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.TEST_DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://fallback:fallback@localhost:5432/fallback_db';
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://fallback:fallback@localhost:5432/fallback_db'
          }
        },
        log: ['error']
      });
    });

    it('should return DATABASE_URL in non-test environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.TEST_DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
      process.env.DATABASE_URL = 'postgresql://prod:prod@localhost:5432/prod_db';
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://prod:prod@localhost:5432/prod_db'
          }
        },
        log: ['query', 'info', 'warn', 'error']
      });
    });

    it('should return DATABASE_URL in development environment', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://dev:dev@localhost:5432/dev_db';
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://dev:dev@localhost:5432/dev_db'
          }
        },
        log: ['query', 'info', 'warn', 'error']
      });
    });

    it('should handle undefined NODE_ENV', () => {
      delete process.env.NODE_ENV;
      process.env.DATABASE_URL = 'postgresql://undefined:undefined@localhost:5432/undefined_db';
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://undefined:undefined@localhost:5432/undefined_db'
          }
        },
        log: ['query', 'info', 'warn', 'error'] // Should use non-production logging
      });
    });
  });

  describe('Database URL validation', () => {
    it('should throw error when no database URL is configured in test environment', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.TEST_DATABASE_URL;
      delete process.env.DATABASE_URL;
      
      expect(() => require('@/lib/db')).toThrow(
        'Database URL not configured. Please set TEST_DATABASE_URL or DATABASE_URL'
      );
    });

    it('should throw error when no database URL is configured in production environment', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DATABASE_URL;
      
      expect(() => require('@/lib/db')).toThrow(
        'Database URL not configured. Please set DATABASE_URL'
      );
    });

    it('should throw error when database URL is empty string in test environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.TEST_DATABASE_URL = '';
      process.env.DATABASE_URL = '';
      
      expect(() => require('@/lib/db')).toThrow(
        'Database URL not configured. Please set TEST_DATABASE_URL or DATABASE_URL'
      );
    });

    it('should throw error when database URL is empty string in production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = '';
      
      expect(() => require('@/lib/db')).toThrow(
        'Database URL not configured. Please set DATABASE_URL'
      );
    });
  });

  describe('Logging configuration', () => {
    it('should use minimal logging in test environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledWith(
        expect.objectContaining({
          log: ['error']
        })
      );
    });

    it('should use full logging in production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://prod:prod@localhost:5432/prod_db';
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledWith(
        expect.objectContaining({
          log: ['query', 'info', 'warn', 'error']
        })
      );
    });

    it('should use full logging in development environment', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://dev:dev@localhost:5432/dev_db';
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledWith(
        expect.objectContaining({
          log: ['query', 'info', 'warn', 'error']
        })
      );
    });
  });

  describe('Global instance management', () => {
    it('should create new instance when global.prisma is undefined', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://dev:dev@localhost:5432/dev_db';
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledTimes(1);
      expect(prisma).toBe(mockPrismaInstance);
    });

    it('should reuse global instance in non-production environment', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://dev:dev@localhost:5432/dev_db';
      
      // Set global instance manually
      const existingInstance = new PrismaClient();
      (global as any).prisma = existingInstance;
      
      const { prisma } = require('@/lib/db');
      
      expect(prisma).toBe(existingInstance);
      expect(MockedPrismaClient).toHaveBeenCalledTimes(1); // Only the one we created manually
    });

    it('should not set global instance in production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://prod:prod@localhost:5432/prod_db';
      
      const { prisma } = require('@/lib/db');
      
      expect((global as any).prisma).toBeUndefined();
    });

    it('should set global instance in test environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
      
      const { prisma } = require('@/lib/db');
      
      expect((global as any).prisma).toBe(mockPrismaInstance);
    });

    it('should set global instance in development environment', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://dev:dev@localhost:5432/dev_db';
      
      const { prisma } = require('@/lib/db');
      
      expect((global as any).prisma).toBe(mockPrismaInstance);
    });
  });

  describe('Database URL formats', () => {
    it('should handle PostgreSQL URL format', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://username:password@host:5432/database';
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://username:password@host:5432/database'
          }
        },
        log: ['query', 'info', 'warn', 'error']
      });
    });

    it('should handle MySQL URL format', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'mysql://username:password@host:3306/database';
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'mysql://username:password@host:3306/database'
          }
        },
        log: ['query', 'info', 'warn', 'error']
      });
    });

    it('should handle SQLite URL format', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'file:./dev.db';
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'file:./dev.db'
          }
        },
        log: ['query', 'info', 'warn', 'error']
      });
    });

    it('should handle connection URLs with query parameters', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db?schema=public&connection_limit=5';
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://user:pass@host:5432/db?schema=public&connection_limit=5'
          }
        },
        log: ['query', 'info', 'warn', 'error']
      });
    });
  });

  describe('Module exports', () => {
    it('should export prisma instance', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://dev:dev@localhost:5432/dev_db';
      
      const exports = require('@/lib/db');
      
      expect(exports).toHaveProperty('prisma');
      expect(exports.prisma).toBe(mockPrismaInstance);
    });

    it('should export same instance on multiple imports in non-production', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://dev:dev@localhost:5432/dev_db';
      
      const exports1 = require('@/lib/db');
      const exports2 = require('@/lib/db');
      
      expect(exports1.prisma).toBe(exports2.prisma);
    });
  });

  describe('PrismaClient configuration', () => {
    it('should pass correct datasource configuration', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://prod:prod@localhost:5432/prod_db';
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://prod:prod@localhost:5432/prod_db'
          }
        },
        log: ['query', 'info', 'warn', 'error']
      });
    });

    it('should handle complex database URLs with special characters', () => {
      process.env.NODE_ENV = 'production';
      const complexUrl = 'postgresql://user%40domain:p%40ssw0rd@remote-host.com:5432/database-name?sslmode=require';
      process.env.DATABASE_URL = complexUrl;
      
      const { prisma } = require('@/lib/db');
      
      expect(MockedPrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: complexUrl
          }
        },
        log: ['query', 'info', 'warn', 'error']
      });
    });
  });

  describe('Error handling', () => {
    it('should propagate PrismaClient constructor errors', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://prod:prod@localhost:5432/prod_db';
      
      MockedPrismaClient.mockImplementation(() => {
        throw new Error('Prisma initialization failed');
      });
      
      expect(() => require('@/lib/db')).toThrow('Prisma initialization failed');
    });

    it('should handle edge case where DATABASE_URL exists but is whitespace only', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = '   \n\t   ';
      
      // Trimmed whitespace becomes empty string, should throw error
      expect(() => require('@/lib/db')).toThrow(
        'Database URL not configured. Please set DATABASE_URL'
      );
    });
  });

  describe('Type safety', () => {
    it('should export correctly typed prisma instance', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://dev:dev@localhost:5432/dev_db';
      
      const { prisma } = require('@/lib/db');
      
      // The instance should be recognized as PrismaClient
      expect(prisma).toBe(mockPrismaInstance);
      expect(MockedPrismaClient).toHaveBeenCalledTimes(1);
    });
  });
});