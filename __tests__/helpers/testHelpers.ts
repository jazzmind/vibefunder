import { User } from '../../src/models/User';
import { SignJWT } from 'jose';

/**
 * Test helpers for user authentication and setup
 */

export interface CreateTestUserParams {
  email: string;
  username: string;
  password?: string;
  name?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
  role?: 'USER' | 'ADMIN';
}

/**
 * Create a test user in the database
 */
export async function createTestUser(params: CreateTestUserParams): Promise<User> {
  const {
    email,
    username,
    password = 'TestPassword123!',
    name = username,
    isEmailVerified = true,
    isActive = true,
    role = 'USER'
  } = params;

  // In a real implementation, this would use Prisma or your ORM
  // For now, return a mock user object that matches the expected structure
  const mockUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email,
    username,
    name,
    password,
    isEmailVerified,
    isActive,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    avatar: null,
    bio: null,
    socialLinks: {},
    isPublic: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
  } as User;

  return mockUser;
}

/**
 * Create authentication headers for testing
 */
export async function createAuthHeaders(user: User): Promise<Record<string, string>> {
  // Create a JWT token for the user
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-secret');
  
  const token = await new SignJWT({ sub: user.id, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(secret);

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Clean up test data after tests
 */
export async function cleanupTestData(): Promise<void> {
  // In a real implementation, this would clean up the test database
  // For now, this is a no-op since we're using mocks
  return Promise.resolve();
}

/**
 * Create mock request with user context
 */
export function createMockAuthenticatedRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {},
  user: User
): Request {
  const { method = 'GET', headers = {}, body } = options;
  
  const requestHeaders = {
    ...headers,
    'Authorization': `Bearer mock-token-${user.id}`,
    'Content-Type': 'application/json'
  };

  const init: RequestInit = {
    method,
    headers: requestHeaders
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  return new Request(url, init);
}

/**
 * Mock user data for tests
 */
export const mockUsers = {
  standardUser: {
    id: 'test-user-standard',
    email: 'standard@test.com',
    username: 'standarduser',
    name: 'Standard User',
    isEmailVerified: true,
    isActive: true,
    role: 'USER' as const,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    avatar: null,
    bio: null,
    socialLinks: {},
    isPublic: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
  },
  adminUser: {
    id: 'test-user-admin',
    email: 'admin@test.com',
    username: 'adminuser',
    name: 'Admin User',
    isEmailVerified: true,
    isActive: true,
    role: 'ADMIN' as const,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    avatar: null,
    bio: null,
    socialLinks: {},
    isPublic: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
  },
  unverifiedUser: {
    id: 'test-user-unverified',
    email: 'unverified@test.com',
    username: 'unverifieduser',
    name: 'Unverified User',
    isEmailVerified: false,
    isActive: true,
    role: 'USER' as const,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    avatar: null,
    bio: null,
    socialLinks: {},
    isPublic: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
  }
};

/**
 * Generate test session data
 */
export function createTestSession(userId: string) {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    token: `token_${Date.now()}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    ipAddress: '127.0.0.1',
    userAgent: 'Jest Test Runner',
    createdAt: new Date(),
  };
}

/**
 * Mock database transaction
 */
export async function withMockTransaction<T>(fn: () => Promise<T>): Promise<T> {
  // In a real implementation, this would wrap the function in a database transaction
  // For testing, just execute the function
  return await fn();
}

/**
 * Create mock audit log entry
 */
export function createMockAuditLog(userId: string, action: string, metadata: any = {}) {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId,
    action,
    metadata,
    severity: 'low' as const,
    ip_address: '127.0.0.1',
    user_agent: 'Jest Test Runner',
    created_at: new Date(),
  };
}

/**
 * Wait for async operations to complete
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate unique test email
 */
export function generateTestEmail(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`;
}

/**
 * Generate unique username
 */
export function generateTestUsername(prefix: string = 'user'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mock validation error
 */
export class MockValidationError extends Error {
  public errors: string[];
  
  constructor(errors: string[]) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Test data factories
 */
export const testDataFactory = {
  user: (overrides: Partial<CreateTestUserParams> = {}): CreateTestUserParams => ({
    email: generateTestEmail(),
    username: generateTestUsername(),
    password: 'SecurePass123!',
    name: 'Test User',
    isEmailVerified: true,
    isActive: true,
    role: 'USER',
    ...overrides
  }),
  
  userProfile: (userId: string, overrides: any = {}) => ({
    id: userId,
    name: 'Test User',
    email: 'test@example.com',
    bio: 'Test bio',
    avatar: null,
    socialLinks: {},
    isPublic: true,
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),
  
  userSettings: (userId: string, overrides: any = {}) => ({
    user_id: userId,
    notifications: {
      marketing: true,
      updates: true,
      alerts: true,
      campaigns: true,
      security: true,
    },
    privacy: {
      profileVisibility: 'public',
      dataSharing: true,
      searchable: true,
      showActivity: 'public',
      allowMessages: 'everyone',
    },
    theme: {
      mode: 'light',
      primaryColor: '#1976d2',
      fontSize: 'medium',
      highContrast: false,
    },
    ...overrides
  }),
  
  userPreferences: (userId: string, overrides: any = {}) => ({
    user_id: userId,
    campaignInterests: {
      categories: ['technology', 'environment'],
      subcategories: {
        technology: ['software', 'ai'],
        environment: ['climate']
      }
    },
    notificationFrequency: {
      email: {
        frequency: 'daily',
        quietHours: { start: '22:00', end: '08:00' },
        digest: true,
        batchSimilar: false
      },
      push: {
        frequency: 'immediate',
        quietHours: { start: '23:00', end: '07:00' },
        onlyImportant: false
      },
      sms: {
        frequency: 'never',
        emergencyOnly: true
      }
    },
    currency: {
      defaultCurrency: 'USD',
      displayFormat: 'symbol',
      decimalPlaces: 2,
      showExchangeRates: false
    },
    ...overrides
  })
};