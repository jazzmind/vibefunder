/**
 * Checkout API Branch Coverage Tests
 * 
 * This file focuses on testing all conditional branches in the checkout-session route
 * to improve branch coverage by testing complex validation and error conditions.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/payments/checkout-session/route';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/stripe');
jest.mock('@/lib/db');
jest.mock('@/lib/auth');

const mockStripe = stripe as jest.Mocked<typeof stripe>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('Checkout API Branch Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  describe('POST /api/payments/checkout-session - JSON Parsing Branches', () => {
    it('should handle invalid JSON in request body', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: 'invalid json content {'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({ error: 'Invalid JSON in request body' });
      expect(console.error).toHaveBeenCalledWith('JSON parsing error:', expect.any(Error));
    });

    it('should handle empty request body', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: ''
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({ error: 'Invalid JSON in request body' });
    });

    it('should handle null request body', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: 'null'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({ error: 'Invalid JSON in request body' });
    });

    it('should handle non-object JSON body', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: '"string-not-object"'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({ error: 'Invalid JSON in request body' });
    });

    it('should handle array JSON body', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: '[]'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({ error: 'Invalid JSON in request body' });
    });
  });

  describe('POST /api/payments/checkout-session - Campaign Status Branches', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
    });

    it('should return 404 when campaign not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'non-existent-campaign',
          pledgeAmount: 100
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData).toEqual({ error: 'Campaign not found' });
    });

    it('should return 400 when campaign is draft', async () => {
      const mockCampaign = {
        id: 'campaign-123',
        title: 'Test Campaign',
        status: 'draft',
        pledgeTiers: []
      };

      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign as any);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({ error: 'Campaign is not accepting pledges' });
    });

    it('should return 400 when campaign is cancelled', async () => {
      const mockCampaign = {
        id: 'campaign-123',
        title: 'Test Campaign',
        status: 'cancelled',
        pledgeTiers: []
      };

      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign as any);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.json()).resolves.toEqual({ error: 'Campaign is not accepting pledges' });
    });
  });

  describe('POST /api/payments/checkout-session - Pledge Tier Branches', () => {
    const mockCampaign = {
      id: 'campaign-123',
      title: 'Test Campaign',
      status: 'published',
      pledgeTiers: [
        { id: 'tier-1', title: 'Basic', isActive: true, description: 'Basic tier' },
        { id: 'tier-2', title: 'Premium', isActive: false, description: 'Premium tier' }
      ]
    };

    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign as any);
    });

    it('should proceed without pledge tier when not specified', async () => {
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'backer-123',
        email: 'test@example.com'
      } as any);

      const mockCheckoutSession = {
        id: 'session-123',
        url: 'https://checkout.stripe.com/session-123'
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockCheckoutSession);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100
          // No pledgeTierId
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
    });

    it('should return 404 when pledge tier not found', async () => {
      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeTierId: 'non-existent-tier',
          pledgeAmount: 100
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData).toEqual({ error: 'Pledge tier not found' });
    });

    it('should return 400 when pledge tier is not active', async () => {
      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeTierId: 'tier-2', // This tier has isActive: false
          pledgeAmount: 100
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({ error: 'Pledge tier is not active' });
    });

    it('should proceed with valid active pledge tier', async () => {
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'backer-123',
        email: 'test@example.com'
      } as any);

      const mockCheckoutSession = {
        id: 'session-123',
        url: 'https://checkout.stripe.com/session-123'
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockCheckoutSession);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeTierId: 'tier-1', // This tier has isActive: true
          pledgeAmount: 100
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                product_data: expect.objectContaining({
                  description: 'Basic - Basic tier'
                })
              })
            })
          ]
        })
      );
    });
  });

  describe('POST /api/payments/checkout-session - Email Branches', () => {
    const mockCampaign = {
      id: 'campaign-123',
      title: 'Test Campaign',
      status: 'published',
      pledgeTiers: []
    };

    beforeEach(() => {
      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign as any);
    });

    it('should use authenticated user email when available', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'authenticated@example.com' }
      } as any);

      mockPrisma.user.upsert.mockResolvedValue({
        id: 'backer-123',
        email: 'authenticated@example.com'
      } as any);

      const mockCheckoutSession = {
        id: 'session-123',
        url: 'https://checkout.stripe.com/session-123'
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockCheckoutSession);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100,
          backerEmail: 'provided@example.com' // Should be ignored
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: 'authenticated@example.com'
        })
      );
    });

    it('should use provided email when no authenticated user', async () => {
      mockAuth.mockResolvedValue(null);

      mockPrisma.user.upsert.mockResolvedValue({
        id: 'backer-123',
        email: 'provided@example.com'
      } as any);

      const mockCheckoutSession = {
        id: 'session-123',
        url: 'https://checkout.stripe.com/session-123'
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockCheckoutSession);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100,
          backerEmail: 'provided@example.com'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: 'provided@example.com'
        })
      );
    });

    it('should return 400 when no email available', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100
          // No backerEmail and no authenticated user
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({ error: 'Email is required for checkout' });
    });

    it('should return 400 when authenticated user has no email', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123' } // No email
      } as any);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/payments/checkout-session - Validation Branches', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
    });

    it('should return 400 for pledge amount below minimum', async () => {
      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 50 // Below minimum of 100
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid input data');
      expect(responseData.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Minimum payment amount is $100'
          })
        ])
      );
    });

    it('should return 400 for pledge amount above maximum', async () => {
      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 2000000 // Above maximum of 1,000,000
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for negative pledge amount', async () => {
      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: -100
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for infinite pledge amount', async () => {
      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: Infinity
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for NaN pledge amount', async () => {
      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: NaN
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for pledge amount with too many decimal places', async () => {
      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100.12345 // More than 3 decimal places
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should accept pledge amount with 3 decimal places', async () => {
      const mockCampaign = {
        id: 'campaign-123',
        title: 'Test Campaign',
        status: 'published',
        pledgeTiers: []
      };

      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign as any);
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'backer-123',
        email: 'test@example.com'
      } as any);

      const mockCheckoutSession = {
        id: 'session-123',
        url: 'https://checkout.stripe.com/session-123'
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockCheckoutSession);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100.123 // Exactly 3 decimal places
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid email format', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100,
          backerEmail: 'invalid-email-format'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid success URL', async () => {
      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100,
          successUrl: 'not-a-valid-url'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid cancel URL', async () => {
      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100,
          cancelUrl: 'not-a-valid-url'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/payments/checkout-session - Stripe Error Branches', () => {
    const mockCampaign = {
      id: 'campaign-123',
      title: 'Test Campaign',
      status: 'published',
      pledgeTiers: []
    };

    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign as any);
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'backer-123',
        email: 'test@example.com'
      } as any);
    });

    it('should return 500 when Stripe checkout session creation fails', async () => {
      (mockStripe.checkout.sessions.create as jest.Mock).mockRejectedValue(
        new Error('Stripe API error')
      );

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({ error: 'Failed to create checkout session' });
      expect(console.error).toHaveBeenCalledWith(
        'Stripe checkout session creation failed:', 
        expect.any(Error)
      );
    });
  });

  describe('POST /api/payments/checkout-session - Success with Custom URLs', () => {
    const mockCampaign = {
      id: 'campaign-123',
      title: 'Test Campaign',
      status: 'published',
      pledgeTiers: []
    };

    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign as any);
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'backer-123',
        email: 'test@example.com'
      } as any);
    });

    it('should use custom success and cancel URLs when provided', async () => {
      const mockCheckoutSession = {
        id: 'session-123',
        url: 'https://checkout.stripe.com/session-123'
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockCheckoutSession);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        })
      );
    });

    it('should use default URLs when custom URLs not provided', async () => {
      const mockCheckoutSession = {
        id: 'session-123',
        url: 'https://checkout.stripe.com/session-123'
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockCheckoutSession);

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'http://localhost/campaigns/campaign-123?payment=success',
          cancel_url: 'http://localhost/campaigns/campaign-123?payment=cancelled'
        })
      );
    });
  });

  describe('POST /api/payments/checkout-session - Database Error Branches', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
    });

    it('should return 500 when campaign lookup fails', async () => {
      mockPrisma.campaign.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should return 500 when user upsert fails', async () => {
      const mockCampaign = {
        id: 'campaign-123',
        title: 'Test Campaign',
        status: 'published',
        pledgeTiers: []
      };

      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign as any);
      mockPrisma.user.upsert.mockRejectedValue(new Error('User creation failed'));

      const request = new NextRequest('http://localhost/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-123',
          pledgeAmount: 100
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
});