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
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    confirm: jest.fn(),
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
    list: jest.fn(),
  },
  invoices: {
    create: jest.fn(),
    retrieve: jest.fn(),
    retrieveUpcoming: jest.fn(),
    pay: jest.fn(),
    sendInvoice: jest.fn(),
    list: jest.fn(),
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
  STRIPE_CURRENCY: 'usd',
  STRIPE_PRICE_DOLLARS: 1,
  STRIPE_APP_FEE_BPS: 500,
  DEST_ACCOUNT: 'acct_test_destination',
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
 * Setup default mock responses with enhanced webhook support
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
      raisedDollars: 25000, // Fixed property name
      status: 'published',
      makerId: 'user-123',
      organizationId: 'org-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      pledgeTiers: [
        {
          id: 'tier-123',
          title: 'Basic Tier',
          description: 'Basic support level',
          amountDollars: 100,
          isActive: true
        }
      ]
    },
    pledge: {
      id: 'pledge-123',
      campaignId: 'campaign-123',
      backerId: 'user-123',
      pledgeTierId: 'tier-123',
      amountDollars: 100,
      currency: 'USD',
      status: 'pending',
      paymentRef: 'pi_test_123',
      stripeSessionId: 'cs_test_123',
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
      payment_intent: 'pi_test_123',
      metadata: {
        campaignId: 'campaign-123',
        backerId: 'user-123',
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

  // Setup pledge mocks
  prismaMock.pledge.create.mockResolvedValue({
    ...defaults.pledge,
    backer: defaults.user,
    campaign: defaults.campaign
  } as any);
  prismaMock.pledge.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.pledge.findFirst.mockResolvedValue({
    ...defaults.pledge,
    backer: defaults.user,
    campaign: defaults.campaign
  } as any);

  // Setup Stripe mocks with enhanced webhook support
  stripeMock.checkout.sessions.create.mockResolvedValue(defaults.session as any);
  stripeMock.checkout.sessions.retrieve.mockResolvedValue(defaults.session as any);
  
  // Setup webhook constructEvent to return passed event by default
  stripeMock.webhooks.constructEvent.mockImplementation((body, signature, secret) => {
    // Basic signature validation mock
    if (!signature) {
      throw new Error('No signatures found matching the expected signature for payload');
    }
    if (signature === 'invalid_signature') {
      throw new Error('Invalid signature');
    }
    if (signature.includes('expired')) {
      throw new Error('Timestamp outside the tolerance zone');
    }
    if (!signature.includes('t=') && !signature.includes('v1=')) {
      throw new Error('Unable to extract timestamp and signatures from header');
    }
    
    // Parse the body and return it as the event
    try {
      return typeof body === 'string' ? JSON.parse(body) : body;
    } catch (e) {
      throw new Error('Invalid JSON payload');
    }
  });

  // Setup email mocks to resolve successfully by default
  emailMock.sendPledgeConfirmationEmail.mockResolvedValue(undefined);
  emailMock.sendEmail.mockResolvedValue(undefined);
  emailMock.sendWelcomeEmail.mockResolvedValue(undefined);
  emailMock.sendPasswordResetEmail.mockResolvedValue(undefined);
  emailMock.sendPaymentConfirmation.mockResolvedValue(undefined);
  emailMock.sendPaymentFailure.mockResolvedValue(undefined);

  return defaults;
}

// Export Stripe constants for tests
export const STRIPE_CURRENCY = 'usd';
export const STRIPE_PRICE_DOLLARS = 1;
export const STRIPE_APP_FEE_BPS = 500;
export const DEST_ACCOUNT = 'acct_test_destination';

export default {
  prismaMock,
  authMock,
  stripeMock,
  emailMock,
  resetAllMocks,
  setupDefaultMocks,
  STRIPE_CURRENCY,
  STRIPE_PRICE_DOLLARS,
  STRIPE_APP_FEE_BPS,
  DEST_ACCOUNT,
};