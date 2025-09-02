/**
 * Mock models for testing - replaces the non-existent src/models imports
 * These are simplified versions that match the expected structure for tests
 */

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  password?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
  avatar: string | null;
  bio: string | null;
  socialLinks: Record<string, string>;
  isPublic: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  metadata: Record<string, any>;
  severity: 'low' | 'medium' | 'high';
  ip_address: string;
  user_agent: string;
  created_at: Date;
}

// Mock implementations for testing
export const User = {
  /**
   * Mock implementation of User.findOne for testing
   */
  findOne: jest.fn(),
  
  /**
   * Mock implementation of User.create for testing
   */
  create: jest.fn(),
  
  /**
   * Mock implementation of User.update for testing
   */
  update: jest.fn(),
  
  /**
   * Mock implementation of User.delete for testing
   */
  delete: jest.fn(),
};

export const AuditLog = {
  /**
   * Mock implementation of AuditLog.findOne for testing
   */
  findOne: jest.fn().mockImplementation((query: any) => {
    // Return different audit logs based on the action
    if (query.action === 'ENABLE_2FA') {
      return Promise.resolve({
        id: 'test-audit-log-2fa',
        user_id: 'test-user',
        action: 'ENABLE_2FA',
        metadata: { enabled: true },
        severity: 'high' as const,
        ip_address: '127.0.0.1',
        user_agent: 'Jest Test Runner',
        created_at: new Date(),
      });
    }
    
    return Promise.resolve({
      id: 'test-audit-log',
      user_id: 'test-user',
      action: 'UPDATE_EMAIL_PREFERENCES',
      metadata: { marketing: false, alerts: true },
      severity: 'medium' as const,
      ip_address: '127.0.0.1',
      user_agent: 'Jest Test Runner',
      created_at: new Date(),
    });
  }),
  
  /**
   * Mock implementation of AuditLog.find for testing
   */
  find: jest.fn().mockResolvedValue([
    {
      id: 'test-audit-log-1',
      user_id: 'test-user',
      action: 'UPDATE_PRIVACY_SETTINGS',
      metadata: { 
        old_value: { profileVisibility: 'public' },
        new_value: { profileVisibility: 'private' }
      },
      severity: 'medium' as const,
      ip_address: '127.0.0.1',
      user_agent: 'Jest Test Runner',
      created_at: new Date(),
    }
  ]),
  
  /**
   * Mock implementation of AuditLog.create for testing
   */
  create: jest.fn(),
};

// Export types for TypeScript
export type { User as UserType, AuditLog as AuditLogType };