/**
 * Centralized payment test mocking utilities
 * Provides proper Prisma client mocking for payment tests
 */

import { jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

// Create a deep mock of Prisma Client
export const prismaMock = mockDeep<PrismaClient>();

// Mock the entire db module
jest.mock('@/lib/db', () => ({
  __esModule: true,
  prisma: prismaMock,
}));

// Mock auth module
export const authMock = jest.fn();
jest.mock('@/lib/auth', () => ({
  __esModule: true,
  auth: authMock,
  // Add other auth functions if needed
  findOrCreateUser: jest.fn(),
  createOtpCode: jest.fn(),
  verifyOtpCode: jest.fn(),
}));

// Mock Stripe
export const stripeMock = {
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn(),
      listLineItems: jest.fn(),
    },
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
  paymentIntents: {
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    capture: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
    retrieve: jest.fn(),
    list: jest.fn(),
  },
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
  },
  paymentMethods: {
    attach: jest.fn(),
    detach: jest.fn(),
    list: jest.fn(),
  },
  prices: {
    create: jest.fn(),
    retrieve: jest.fn(),
    list: jest.fn(),
  },
  products: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
  },
  invoices: {
    create: jest.fn(),
    retrieve: jest.fn(),
    pay: jest.fn(),
    sendInvoice: jest.fn(),
  },
  balanceTransactions: {
    retrieve: jest.fn(),
    list: jest.fn(),
  },
  charges: {
    retrieve: jest.fn(),
    list: jest.fn(),
  },
  disputes: {
    retrieve: jest.fn(),
    update: jest.fn(),
    close: jest.fn(),
  },
  events: {
    retrieve: jest.fn(),
    list: jest.fn(),
  },
  transfers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
  },
  accounts: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@/lib/stripe', () => ({
  __esModule: true,
  stripe: stripeMock,
}));

// Mock email module
export const emailMock = {
  sendEmail: jest.fn(),
  sendWelcomeEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendPaymentConfirmation: jest.fn(),
  sendPaymentFailure: jest.fn(),
  sendPledgeConfirmationEmail: jest.fn(),
};

jest.mock('@/lib/email', () => ({
  __esModule: true,
  ...emailMock,
}));

/**
 * Reset all mocks between tests
 */
export function resetAllMocks() {
  mockReset(prismaMock);
  authMock.mockReset();
  Object.values(stripeMock).forEach(category => {
    if (typeof category === 'object' && category !== null) {
      Object.values(category).forEach(method => {
        if (typeof method === 'function' && 'mockReset' in method) {
          (method as jest.Mock).mockReset();
        }
      });
    }
  });
  Object.values(emailMock).forEach(method => {
    if (typeof method === 'function' && 'mockReset' in method) {
      (method as jest.Mock).mockReset();
    }
  });
}

/**
 * Setup default mock responses
 */
export function setupDefaultMocks(overrides = {}) {
  const defaults = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      roles: ['user'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    campaign: {
      id: 'campaign-123',
      title: 'Test Campaign',
      summary: 'Test Summary',
      description: 'Test Description',
      fundingGoalDollars: 50000,
      raisedAmountDollars: 25000,
      status: 'published',
      makerId: 'user-123',
      organizationId: 'org-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: 'cs_test_123',
      object: 'checkout.session',
      customer: 'cus_test_123',
      payment_status: 'paid',
      status: 'complete',
      mode: 'payment',
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
      amount_total: 10000,
      currency: 'usd',
      metadata: {
        campaignId: 'campaign-123',
        userId: 'user-123',
      },
    },
    ...overrides,
  };

  // Setup auth mock
  authMock.mockResolvedValue({ user: defaults.user });

  // Setup Prisma mocks
  prismaMock.user.findUnique.mockResolvedValue(defaults.user as any);
  prismaMock.user.create.mockResolvedValue(defaults.user as any);
  prismaMock.user.update.mockResolvedValue(defaults.user as any);
  prismaMock.user.upsert.mockResolvedValue(defaults.user as any);

  prismaMock.campaign.findUnique.mockResolvedValue(defaults.campaign as any);
  prismaMock.campaign.create.mockResolvedValue(defaults.campaign as any);
  prismaMock.campaign.update.mockResolvedValue(defaults.campaign as any);

  // Setup Stripe mocks
  stripeMock.checkout.sessions.create.mockResolvedValue(defaults.session as any);
  stripeMock.checkout.sessions.retrieve.mockResolvedValue(defaults.session as any);

  return defaults;
}

export default {
  prismaMock,
  authMock,
  stripeMock,
  emailMock,
  resetAllMocks,
  setupDefaultMocks,
};