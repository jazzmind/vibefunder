/**
 * Simplified Stripe Checkout Session Tests
 * Focuses on core functionality without complex helpers
 */

import { NextRequest } from 'next/server';
import { jest } from '@jest/globals';
import { createTestRequest, createAuthenticatedRequest } from '../../utils/api-test-helpers';

// Mock Stripe before importing the route
const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn(),
    },
  },
};

jest.mock('@/lib/stripe', () => ({
  stripe: mockStripe,
  STRIPE_CURRENCY: 'usd',
  STRIPE_PRICE_DOLLARS: 1,
  STRIPE_APP_FEE_BPS: 500,
  DEST_ACCOUNT: 'acct_test_destination',
}));

// Mock Prisma
const mockPrisma = {
  campaign: {
    findUnique: jest.fn(),
  },
  user: {
    upsert: jest.fn(),
  },
};

jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

// Mock auth
const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  auth: mockAuth,
}));

// Import after mocks are set up
import { POST } from '@/app/api/payments/checkout-session/route';

describe('Stripe Checkout Session - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful responses
    mockAuth.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }
    });

    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'campaign-123',
      title: 'Test Campaign',
      status: 'published',
      pledgeTiers: [{
        id: 'tier-123',
        title: 'Basic Tier',
        amountDollars: 100,
        isActive: true,
      }],
    });

    mockPrisma.user.upsert.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    });

    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/test_123',
    });
  });

  it('should create checkout session for valid request', async () => {
    const requestData = {
      campaignId: 'campaign-123',
      pledgeTierId: 'tier-123',
      pledgeAmount: 100,
    };

    const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
      method: 'POST',
      body: JSON.stringify(requestData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('checkoutUrl');
    expect(data).toHaveProperty('sessionId');
  });

  it('should return 404 for non-existent campaign', async () => {
    mockPrisma.campaign.findUnique.mockResolvedValue(null);

    const requestData = {
      campaignId: 'non-existent',
      pledgeAmount: 100,
    };

    const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
      method: 'POST',
      body: JSON.stringify(requestData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Campaign not found');
  });

  it('should return 400 for unpublished campaign', async () => {
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'campaign-123',
      title: 'Test Campaign',
      status: 'draft', // Not published
      pledgeTiers: [],
    });

    const requestData = {
      campaignId: 'campaign-123',
      pledgeAmount: 100,
    };

    const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
      method: 'POST',
      body: JSON.stringify(requestData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Campaign is not accepting pledges');
  });

  it('should validate minimum pledge amount', async () => {
    const requestData = {
      campaignId: 'campaign-123',
      pledgeAmount: 50, // Below minimum of $100
    };

    const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
      method: 'POST',
      body: JSON.stringify(requestData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input data');
  });

  it('should handle missing request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
      method: 'POST',
      // No body
    });

    const response = await POST(request);
    
    expect(response.status).toBe(500); // JSON parsing error
  });

  it('should require email for anonymous users', async () => {
    mockAuth.mockResolvedValue(null); // No authenticated user

    const requestData = {
      campaignId: 'campaign-123',
      pledgeAmount: 100,
      // No backerEmail provided
    };

    const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
      method: 'POST',
      body: JSON.stringify(requestData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Email is required for checkout');
  });
});