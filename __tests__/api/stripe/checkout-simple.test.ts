/**
 * Simplified Stripe Checkout Session Tests
 * Focuses on core functionality without complex helpers
 */

import { NextRequest } from 'next/server';
import { jest } from '@jest/globals';

// Create mock implementations
const mockStripeCreate = jest.fn();
const mockCampaignFindUnique = jest.fn();
const mockUserUpsert = jest.fn();
const mockAuth = jest.fn();

// Mock all dependencies before any imports
jest.mock('@/lib/stripe', () => ({
  __esModule: true,
  stripe: {
    checkout: {
      sessions: {
        create: mockStripeCreate,
      },
    },
  },
  STRIPE_CURRENCY: 'usd',
  STRIPE_PRICE_DOLLARS: 1,
  STRIPE_APP_FEE_BPS: 500,
  DEST_ACCOUNT: 'acct_test_destination',
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  prisma: {
    campaign: {
      findUnique: mockCampaignFindUnique,
    },
    user: {
      upsert: mockUserUpsert,
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  __esModule: true,
  auth: mockAuth,
}));

// Import the route handler after mocks are set up
const { POST } = require('@/app/api/payments/checkout-session/route');

describe('Stripe Checkout Session - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful responses for all tests
    mockAuth.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }
    });

    // Default successful campaign
    mockCampaignFindUnique.mockResolvedValue({
      id: 'campaign-123',
      title: 'Test Campaign',
      status: 'published',
      pledgeTiers: [{
        id: 'tier-123',
        title: 'Basic Tier',
        description: 'Basic tier description',
        amountDollars: 100,
        isActive: true,
      }],
    });

    mockUserUpsert.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    });

    mockStripeCreate.mockResolvedValue({
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
    
    // Verify mocks were called correctly
    expect(mockCampaignFindUnique).toHaveBeenCalledWith({
      where: { id: 'campaign-123' },
      include: { pledgeTiers: true }
    });
    expect(mockStripeCreate).toHaveBeenCalled();
  });

  it('should return 404 for non-existent campaign', async () => {
    mockCampaignFindUnique.mockResolvedValue(null);

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
    mockCampaignFindUnique.mockResolvedValue({
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
    
    expect(response.status).toBe(400); // JSON parsing error returns 400
    const data = await response.json();
    expect(data.error).toBe('Invalid JSON in request body');
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