/**
 * Stripe Service Mock for Integration Tests
 * Provides realistic Stripe behavior without actual API calls
 */

import { jest } from '@jest/globals';

// Mock Stripe objects
export const mockStripeCustomer = {
  id: 'cus_test_123',
  email: 'test@example.com',
  name: 'Test Customer',
  created: Math.floor(Date.now() / 1000),
  metadata: {},
};

export const mockCheckoutSession = {
  id: 'cs_test_123',
  payment_status: 'unpaid',
  status: 'open',
  amount_total: 10000, // $100.00
  currency: 'usd',
  customer: mockStripeCustomer.id,
  url: 'https://checkout.stripe.com/c/pay/test_session',
  metadata: {
    campaignId: 'test-campaign-id',
    userId: 'test-user-id',
  },
  payment_intent: 'pi_test_123',
  success_url: 'http://localhost:3000/success',
  cancel_url: 'http://localhost:3000/cancel',
};

export const mockPaymentIntent = {
  id: 'pi_test_123',
  status: 'succeeded',
  amount: 10000,
  currency: 'usd',
  customer: mockStripeCustomer.id,
  charges: {
    data: [{
      id: 'ch_test_123',
      status: 'succeeded',
      amount: 10000,
      receipt_url: 'https://stripe.com/receipts/test',
    }],
  },
  metadata: {
    campaignId: 'test-campaign-id',
    userId: 'test-user-id',
  },
};

export const mockWebhookEvent = {
  id: 'evt_test_123',
  type: 'checkout.session.completed',
  data: {
    object: {
      ...mockCheckoutSession,
      payment_status: 'paid',
      status: 'complete',
    },
  },
  created: Math.floor(Date.now() / 1000),
};

// Mock Stripe instance
export const mockStripe = {
  customers: {
    create: jest.fn().mockResolvedValue(mockStripeCustomer),
    retrieve: jest.fn().mockResolvedValue(mockStripeCustomer),
  },
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue(mockCheckoutSession),
      retrieve: jest.fn().mockResolvedValue(mockCheckoutSession),
    },
  },
  paymentIntents: {
    retrieve: jest.fn().mockResolvedValue(mockPaymentIntent),
  },
  webhooks: {
    constructEvent: jest.fn().mockReturnValue(mockWebhookEvent),
  },
};

// Mock webhook signature verification
export const mockValidateStripeSignature = jest.fn().mockReturnValue(true);

// Utility function to create webhook events
export function createMockWebhookEvent(type: string, data: any, metadata: any = {}) {
  return {
    id: `evt_test_${Date.now()}`,
    type,
    data: {
      object: {
        id: `obj_test_${Date.now()}`,
        ...data,
        metadata,
      },
    },
    created: Math.floor(Date.now() / 1000),
  };
}

// Reset all mocks
export function resetStripeMocks() {
  Object.values(mockStripe.customers).forEach(mock => mock.mockClear?.());
  Object.values(mockStripe.checkout.sessions).forEach(mock => mock.mockClear?.());
  Object.values(mockStripe.paymentIntents).forEach(mock => mock.mockClear?.());
  Object.values(mockStripe.webhooks).forEach(mock => mock.mockClear?.());
  mockValidateStripeSignature.mockClear();
}

// Mock failed payment scenarios
export const mockFailedPayment = {
  ...mockPaymentIntent,
  status: 'payment_failed',
  last_payment_error: {
    code: 'card_declined',
    decline_code: 'insufficient_funds',
    message: 'Your card has insufficient funds.',
  },
};

export const mockCancelledSession = {
  ...mockCheckoutSession,
  payment_status: 'unpaid',
  status: 'expired',
};

// Export default mock configuration
export default {
  stripe: mockStripe,
  customer: mockStripeCustomer,
  session: mockCheckoutSession,
  payment: mockPaymentIntent,
  webhook: mockWebhookEvent,
  validateSignature: mockValidateStripeSignature,
  reset: resetStripeMocks,
};
