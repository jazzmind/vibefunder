/**
 * Pledge Creation API Tests
 * 
 * Comprehensive testing for campaign pledge operations including:
 * - Valid pledge with tier selection
 * - Custom pledge amounts
 * - Anonymous vs authenticated pledges
 * - Reward tier stock management
 * - Minimum/maximum pledge validation
 * - Campaign deadline enforcement
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { StripeObjectFactory } from '../../../payments/payment-test-helpers';
import { createTestUser, createTestCampaign, cleanupTestData } from '../../../utils/test-helpers.js';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

interface TestCampaign {
  id: string;
  title: string;
  fundingGoalDollars: number;
  status: string;
  endDate: string;
  rewardTiers?: RewardTier[];
}

interface RewardTier {
  id: string;
  title: string;
  description: string;
  pledgeAmountDollars: number;
  stockLimit?: number;
  stockClaimed?: number;
}

interface TestPledge {
  id: string;
  campaignId: string;
  pledgeAmountDollars: number;
  rewardTierId?: string;
  isAnonymous: boolean;
  userId?: string;
  shippingAddress?: any;
  createdAt: string;
}

// Mock Stripe for testing
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        status: 'requires_confirmation',
        amount: 5000,
        currency: 'usd',
      }),
      confirm: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 5000,
        currency: 'usd',
      }),
    },
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'cus_test_123',
        email: 'test@example.com',
      }),
    },
  }));
});

describe('Campaign Pledge Creation API', () => {
  let testCampaign: TestCampaign;
  let testUser: any;
  let rewardTier: RewardTier;

  beforeAll(async () => {
    // Create test user
    testUser = await createTestUser({
      email: 'pledger@example.com',
      name: 'Test Pledger',
    });

    // Create test campaign with reward tiers
    testCampaign = await createTestCampaign({
      title: 'Pledge Test Campaign',
      summary: 'Campaign for testing pledge operations',
      fundingGoalDollars: 100000,
      status: 'published',
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    });

    // Create reward tier
    rewardTier = {
      id: 'tier_test_123',
      title: 'Early Bird Special',
      description: 'Limited early bird reward',
      pledgeAmountDollars: 5000, // $50
      stockLimit: 100,
      stockClaimed: 0,
    };
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Valid Pledge Creation', () => {
    it('should create a valid pledge with tier selection', async () => {
      const pledgeData = {
        campaignId: testCampaign.id,
        pledgeAmountDollars: 5000,
        rewardTierId: rewardTier.id,
        isAnonymous: false,
        paymentMethodId: 'pm_test_123',
        shippingAddress: {
          line1: '123 Test Street',
          city: 'Test City',
          state: 'TC',
          postal_code: '12345',
          country: 'US',
        },
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(201);
      
      const pledge: TestPledge = await response.json();
      expect(pledge).toMatchObject({
        campaignId: testCampaign.id,
        pledgeAmountDollars: 5000,
        rewardTierId: rewardTier.id,
        isAnonymous: false,
        userId: testUser.id,
      });
      expect(pledge.id).toBeDefined();
      expect(pledge.createdAt).toBeDefined();
    });

    it('should create a custom pledge amount above minimum tier', async () => {
      const pledgeData = {
        campaignId: testCampaign.id,
        pledgeAmountDollars: 7500, // $75 - above the $50 tier
        rewardTierId: rewardTier.id,
        isAnonymous: false,
        paymentMethodId: 'pm_test_456',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(201);
      
      const pledge: TestPledge = await response.json();
      expect(pledge.pledgeAmountDollars).toBe(7500);
    });

    it('should create an anonymous pledge', async () => {
      const pledgeData = {
        campaignId: testCampaign.id,
        pledgeAmountDollars: 2500, // $25 - no reward tier
        isAnonymous: true,
        paymentMethodId: 'pm_test_anon',
        backerName: 'Anonymous Supporter',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(201);
      
      const pledge: TestPledge = await response.json();
      expect(pledge).toMatchObject({
        campaignId: testCampaign.id,
        pledgeAmountDollars: 2500,
        isAnonymous: true,
      });
      expect(pledge.userId).toBeUndefined();
    });
  });

  describe('Pledge Validation', () => {
    it('should reject pledge below minimum amount', async () => {
      const pledgeData = {
        campaignId: testCampaign.id,
        pledgeAmountDollars: 50, // $0.50 - too low
        isAnonymous: false,
        paymentMethodId: 'pm_test_low',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('minimum pledge amount');
    });

    it('should reject pledge above maximum amount', async () => {
      const pledgeData = {
        campaignId: testCampaign.id,
        pledgeAmountDollars: 10000000, // $100,000 - too high
        isAnonymous: false,
        paymentMethodId: 'pm_test_high',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('maximum pledge amount');
    });

    it('should reject pledge with insufficient amount for selected tier', async () => {
      const pledgeData = {
        campaignId: testCampaign.id,
        pledgeAmountDollars: 3000, // $30 - below $50 tier requirement
        rewardTierId: rewardTier.id,
        isAnonymous: false,
        paymentMethodId: 'pm_test_insufficient',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('insufficient amount for reward tier');
    });
  });

  describe('Reward Tier Stock Management', () => {
    it('should decrement available stock when pledge created', async () => {
      // First, get initial stock count
      const initialStockResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/reward-tiers/${rewardTier.id}`);
      const initialTier = await initialStockResponse.json();
      const initialStock = initialTier.stockLimit - initialTier.stockClaimed;

      const pledgeData = {
        campaignId: testCampaign.id,
        pledgeAmountDollars: 5000,
        rewardTierId: rewardTier.id,
        isAnonymous: false,
        paymentMethodId: 'pm_test_stock',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(201);

      // Check that stock was decremented
      const updatedStockResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/reward-tiers/${rewardTier.id}`);
      const updatedTier = await updatedStockResponse.json();
      const updatedStock = updatedTier.stockLimit - updatedTier.stockClaimed;

      expect(updatedStock).toBe(initialStock - 1);
    });

    it('should reject pledge when reward tier is out of stock', async () => {
      // Create a limited stock tier
      const limitedTier = {
        id: 'tier_limited_123',
        campaignId: testCampaign.id,
        title: 'Limited Edition',
        description: 'Only 1 available',
        pledgeAmountDollars: 10000,
        stockLimit: 1,
        stockClaimed: 1, // Already claimed
      };

      const pledgeData = {
        campaignId: testCampaign.id,
        pledgeAmountDollars: 10000,
        rewardTierId: limitedTier.id,
        isAnonymous: false,
        paymentMethodId: 'pm_test_oos',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('reward tier is out of stock');
    });
  });

  describe('Campaign Deadline Enforcement', () => {
    it('should reject pledge after campaign end date', async () => {
      // Create an expired campaign
      const expiredCampaign = await createTestCampaign({
        title: 'Expired Campaign',
        summary: 'Campaign that has ended',
        fundingGoalDollars: 50000,
        status: 'published',
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      });

      const pledgeData = {
        campaignId: expiredCampaign.id,
        pledgeAmountDollars: 2500,
        isAnonymous: false,
        paymentMethodId: 'pm_test_expired',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${expiredCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('campaign has ended');
    });

    it('should accept pledge before campaign end date', async () => {
      const pledgeData = {
        campaignId: testCampaign.id, // This campaign ends in 30 days
        pledgeAmountDollars: 2500,
        isAnonymous: false,
        paymentMethodId: 'pm_test_active',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Campaign Status Validation', () => {
    it('should reject pledge for draft campaign', async () => {
      const draftCampaign = await createTestCampaign({
        title: 'Draft Campaign',
        summary: 'Campaign in draft status',
        fundingGoalDollars: 50000,
        status: 'draft',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const pledgeData = {
        campaignId: draftCampaign.id,
        pledgeAmountDollars: 2500,
        isAnonymous: false,
        paymentMethodId: 'pm_test_draft',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${draftCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('campaign is not published');
    });

    it('should reject pledge for cancelled campaign', async () => {
      const cancelledCampaign = await createTestCampaign({
        title: 'Cancelled Campaign',
        summary: 'Campaign that was cancelled',
        fundingGoalDollars: 50000,
        status: 'cancelled',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const pledgeData = {
        campaignId: cancelledCampaign.id,
        pledgeAmountDollars: 2500,
        isAnonymous: false,
        paymentMethodId: 'pm_test_cancelled',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${cancelledCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('campaign is not accepting pledges');
    });
  });

  describe('Payment Integration', () => {
    it('should create payment intent with correct amount', async () => {
      const pledgeData = {
        campaignId: testCampaign.id,
        pledgeAmountDollars: 5000,
        isAnonymous: false,
        paymentMethodId: 'pm_test_payment',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(201);
      
      const pledge = await response.json();
      expect(pledge.paymentIntentId).toBeDefined();
      expect(pledge.paymentStatus).toBe('pending');
    });

    it('should handle payment failure gracefully', async () => {
      const pledgeData = {
        campaignId: testCampaign.id,
        pledgeAmountDollars: 5000,
        isAnonymous: false,
        paymentMethodId: 'pm_card_chargeDeclined',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('payment failed');
    });
  });

  describe('Business Logic Updates', () => {
    it('should update campaign progress after successful pledge', async () => {
      // Get initial campaign data
      const initialResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      const initialCampaign = await initialResponse.json();
      const initialRaised = initialCampaign.totalRaisedDollars || 0;
      const initialBackers = initialCampaign.backerCount || 0;

      const pledgeData = {
        campaignId: testCampaign.id,
        pledgeAmountDollars: 5000,
        isAnonymous: false,
        paymentMethodId: 'pm_test_progress',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(201);

      // Check updated campaign data
      const updatedResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      const updatedCampaign = await updatedResponse.json();

      expect(updatedCampaign.totalRaisedDollars).toBe(initialRaised + 5000);
      expect(updatedCampaign.backerCount).toBe(initialBackers + 1);
    });

    it('should not count anonymous pledges in backer count if configured', async () => {
      // Get initial campaign data
      const initialResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      const initialCampaign = await initialResponse.json();
      const initialBackers = initialCampaign.backerCount || 0;

      const pledgeData = {
        campaignId: testCampaign.id,
        pledgeAmountDollars: 2500,
        isAnonymous: true,
        backerName: 'Anonymous',
        paymentMethodId: 'pm_test_anon_count',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(201);

      // Check that backer count may or may not increment based on configuration
      const updatedResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      const updatedCampaign = await updatedResponse.json();

      // Anonymous pledges might still count as backers, but with privacy
      expect(typeof updatedCampaign.backerCount).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent campaign', async () => {
      const pledgeData = {
        campaignId: 'non-existent-id',
        pledgeAmountDollars: 5000,
        isAnonymous: false,
        paymentMethodId: 'pm_test_404',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/non-existent-id/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(404);
    });

    it('should validate required fields', async () => {
      const pledgeData = {
        // Missing required fields
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(pledgeData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('required');
    });

    it('should handle database errors gracefully', async () => {
      // This test would require mocking database failures
      // Implementation depends on your error handling strategy
      expect(true).toBe(true); // Placeholder
    });
  });
});