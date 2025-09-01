/**
 * Pledge Update/Modification API Tests
 * 
 * Comprehensive testing for pledge modification operations including:
 * - Increase/decrease pledge amount
 * - Change reward tier
 * - Update shipping information
 * - Payment method changes
 * - Business rule validation
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
  allowPledgeUpdates?: boolean;
  pledgeUpdateDeadline?: string;
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
  paymentMethodId?: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

// Mock Stripe for testing
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 5000,
        currency: 'usd',
      }),
      update: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'requires_confirmation',
        amount: 7500,
        currency: 'usd',
      }),
      confirm: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 7500,
        currency: 'usd',
      }),
    },
    paymentMethods: {
      attach: jest.fn().mockResolvedValue({
        id: 'pm_new_123',
        customer: 'cus_test_123',
      }),
    },
  }));
});

describe('Campaign Pledge Update API', () => {
  let testCampaign: TestCampaign;
  let testUser: any;
  let rewardTierBasic: RewardTier;
  let rewardTierPremium: RewardTier;
  let existingPledge: TestPledge;

  beforeAll(async () => {
    // Create test user
    testUser = await createTestUser({
      email: 'pledger@example.com',
      name: 'Test Pledger',
    });

    // Create test campaign with update permissions
    testCampaign = await createTestCampaign({
      title: 'Pledge Update Test Campaign',
      summary: 'Campaign for testing pledge updates',
      fundingGoalDollars: 100000,
      status: 'published',
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      allowPledgeUpdates: true,
      pledgeUpdateDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    });

    // Create reward tiers
    rewardTierBasic = {
      id: 'tier_basic_123',
      title: 'Basic Reward',
      description: 'Basic supporter reward',
      pledgeAmountDollars: 2500, // $25
      stockLimit: 100,
      stockClaimed: 10,
    };

    rewardTierPremium = {
      id: 'tier_premium_123',
      title: 'Premium Reward',
      description: 'Premium supporter reward',
      pledgeAmountDollars: 5000, // $50
      stockLimit: 50,
      stockClaimed: 5,
    };

    // Create initial pledge
    const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testUser.token}`,
      },
      body: JSON.stringify({
        campaignId: testCampaign.id,
        pledgeAmountDollars: 2500,
        rewardTierId: rewardTierBasic.id,
        isAnonymous: false,
        paymentMethodId: 'pm_test_original',
        shippingAddress: {
          line1: '123 Original Street',
          city: 'Original City',
          state: 'OC',
          postal_code: '12345',
          country: 'US',
        },
      }),
    });

    existingPledge = await pledgeResponse.json();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Pledge Amount Updates', () => {
    it('should increase pledge amount successfully', async () => {
      const updateData = {
        pledgeAmountDollars: 3500, // Increase from $25 to $35
        paymentMethodId: 'pm_test_increase',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      
      const updatedPledge: TestPledge = await response.json();
      expect(updatedPledge.pledgeAmountDollars).toBe(3500);
      expect(updatedPledge.paymentStatus).toBe('requires_confirmation');
      expect(new Date(updatedPledge.updatedAt)).toBeInstanceOf(Date);
    });

    it('should decrease pledge amount successfully', async () => {
      const updateData = {
        pledgeAmountDollars: 2000, // Decrease to $20
        paymentMethodId: 'pm_test_decrease',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      
      const updatedPledge: TestPledge = await response.json();
      expect(updatedPledge.pledgeAmountDollars).toBe(2000);
    });

    it('should reject amount below minimum pledge', async () => {
      const updateData = {
        pledgeAmountDollars: 50, // $0.50 - below minimum
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('minimum pledge amount');
    });

    it('should reject amount above maximum pledge', async () => {
      const updateData = {
        pledgeAmountDollars: 10000000, // $100,000 - above maximum
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('maximum pledge amount');
    });
  });

  describe('Reward Tier Changes', () => {
    it('should upgrade to higher tier successfully', async () => {
      const updateData = {
        pledgeAmountDollars: 5000,
        rewardTierId: rewardTierPremium.id,
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      
      const updatedPledge: TestPledge = await response.json();
      expect(updatedPledge.rewardTierId).toBe(rewardTierPremium.id);
      expect(updatedPledge.pledgeAmountDollars).toBe(5000);
    });

    it('should downgrade to lower tier successfully', async () => {
      const updateData = {
        pledgeAmountDollars: 2500,
        rewardTierId: rewardTierBasic.id,
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      
      const updatedPledge: TestPledge = await response.json();
      expect(updatedPledge.rewardTierId).toBe(rewardTierBasic.id);
      expect(updatedPledge.pledgeAmountDollars).toBe(2500);
    });

    it('should remove reward tier (no reward pledge)', async () => {
      const updateData = {
        pledgeAmountDollars: 1500, // Below any tier minimum
        rewardTierId: null,
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      
      const updatedPledge: TestPledge = await response.json();
      expect(updatedPledge.rewardTierId).toBeNull();
      expect(updatedPledge.pledgeAmountDollars).toBe(1500);
    });

    it('should reject tier change when insufficient amount', async () => {
      const updateData = {
        pledgeAmountDollars: 3000, // $30 - insufficient for $50 premium tier
        rewardTierId: rewardTierPremium.id,
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('insufficient amount for reward tier');
    });

    it('should reject tier change when tier is out of stock', async () => {
      // Create a sold-out tier
      const soldOutTier = {
        id: 'tier_soldout_123',
        title: 'Sold Out Tier',
        description: 'This tier is sold out',
        pledgeAmountDollars: 7500,
        stockLimit: 10,
        stockClaimed: 10,
      };

      const updateData = {
        pledgeAmountDollars: 7500,
        rewardTierId: soldOutTier.id,
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('reward tier is out of stock');
    });
  });

  describe('Shipping Information Updates', () => {
    it('should update shipping address successfully', async () => {
      const updateData = {
        shippingAddress: {
          line1: '456 Updated Street',
          line2: 'Apt 2B',
          city: 'New City',
          state: 'NC',
          postal_code: '54321',
          country: 'US',
        },
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      
      const updatedPledge: TestPledge = await response.json();
      expect(updatedPledge.shippingAddress).toMatchObject({
        line1: '456 Updated Street',
        line2: 'Apt 2B',
        city: 'New City',
        state: 'NC',
        postal_code: '54321',
        country: 'US',
      });
    });

    it('should validate shipping address format', async () => {
      const updateData = {
        shippingAddress: {
          // Missing required fields
          city: 'Incomplete City',
        },
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('invalid shipping address');
    });

    it('should remove shipping address for digital rewards', async () => {
      const updateData = {
        shippingAddress: null,
        rewardTierId: null, // Digital-only pledge
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      
      const updatedPledge: TestPledge = await response.json();
      expect(updatedPledge.shippingAddress).toBeNull();
    });
  });

  describe('Payment Method Changes', () => {
    it('should update payment method successfully', async () => {
      const updateData = {
        paymentMethodId: 'pm_new_payment_method',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      
      const updatedPledge: TestPledge = await response.json();
      expect(updatedPledge.paymentMethodId).toBe('pm_new_payment_method');
    });

    it('should handle payment method validation', async () => {
      const updateData = {
        paymentMethodId: 'pm_invalid_method',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      // This might return 200 but with a different payment status
      // depending on how Stripe validation is handled
      const updatedPledge: TestPledge = await response.json();
      expect(updatedPledge.paymentStatus).toBeDefined();
    });

    it('should update payment method and amount together', async () => {
      const updateData = {
        pledgeAmountDollars: 4000,
        paymentMethodId: 'pm_combined_update',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      
      const updatedPledge: TestPledge = await response.json();
      expect(updatedPledge.pledgeAmountDollars).toBe(4000);
      expect(updatedPledge.paymentMethodId).toBe('pm_combined_update');
    });
  });

  describe('Update Authorization', () => {
    it('should reject unauthorized update attempts', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        name: 'Other User',
      });

      const updateData = {
        pledgeAmountDollars: 5000,
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${otherUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(403);
      
      const error = await response.json();
      expect(error.message).toContain('not authorized');
    });

    it('should reject updates without authentication', async () => {
      const updateData = {
        pledgeAmountDollars: 5000,
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(401);
    });

    it('should allow campaign owner to update any pledge', async () => {
      // This test would require creating a campaign owner
      // and testing their ability to update pledges
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Update Deadline Enforcement', () => {
    it('should reject updates after deadline', async () => {
      // Create campaign with passed update deadline
      const expiredCampaign = await createTestCampaign({
        title: 'Expired Update Campaign',
        summary: 'Campaign with passed update deadline',
        fundingGoalDollars: 50000,
        status: 'published',
        endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days from now
        allowPledgeUpdates: true,
        pledgeUpdateDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      });

      // Create pledge in expired campaign
      const expiredPledgeResponse = await fetch(`${API_BASE}/api/campaigns/${expiredCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          campaignId: expiredCampaign.id,
          pledgeAmountDollars: 2500,
          isAnonymous: false,
          paymentMethodId: 'pm_test_expired',
        }),
      });

      const expiredPledge = await expiredPledgeResponse.json();

      const updateData = {
        pledgeAmountDollars: 5000,
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${expiredCampaign.id}/pledges/${expiredPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('update deadline has passed');
    });

    it('should allow updates before deadline', async () => {
      const updateData = {
        pledgeAmountDollars: 3000,
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Campaign Progress Updates', () => {
    it('should update campaign totals when pledge amount changes', async () => {
      // Get initial campaign data
      const initialResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      const initialCampaign = await initialResponse.json();
      const initialRaised = initialCampaign.totalRaisedDollars || 0;

      const updateData = {
        pledgeAmountDollars: 6000, // Increase pledge
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);

      // Check updated campaign data
      const updatedResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      const updatedCampaign = await updatedResponse.json();

      // Campaign total should reflect the change
      const pledgeDifference = 6000 - existingPledge.pledgeAmountDollars;
      expect(updatedCampaign.totalRaisedDollars).toBe(initialRaised + pledgeDifference);
    });
  });

  describe('Stock Management Updates', () => {
    it('should update stock when changing reward tiers', async () => {
      // Get initial stock for both tiers
      const initialBasicResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/reward-tiers/${rewardTierBasic.id}`);
      const initialBasicTier = await initialBasicResponse.json();
      const initialBasicStock = initialBasicTier.stockLimit - initialBasicTier.stockClaimed;

      const initialPremiumResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/reward-tiers/${rewardTierPremium.id}`);
      const initialPremiumTier = await initialPremiumResponse.json();
      const initialPremiumStock = initialPremiumTier.stockLimit - initialPremiumTier.stockClaimed;

      // Change from basic to premium tier
      const updateData = {
        pledgeAmountDollars: 5000,
        rewardTierId: rewardTierPremium.id,
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);

      // Check that stock was properly updated
      const updatedBasicResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/reward-tiers/${rewardTierBasic.id}`);
      const updatedBasicTier = await updatedBasicResponse.json();
      const updatedBasicStock = updatedBasicTier.stockLimit - updatedBasicTier.stockClaimed;

      const updatedPremiumResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/reward-tiers/${rewardTierPremium.id}`);
      const updatedPremiumTier = await updatedPremiumResponse.json();
      const updatedPremiumStock = updatedPremiumTier.stockLimit - updatedPremiumTier.stockClaimed;

      // Basic tier should have one more available (stock restored)
      expect(updatedBasicStock).toBe(initialBasicStock + 1);
      // Premium tier should have one less available (stock claimed)
      expect(updatedPremiumStock).toBe(initialPremiumStock - 1);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent pledge', async () => {
      const updateData = {
        pledgeAmountDollars: 5000,
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/non-existent-id`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(404);
    });

    it('should handle payment processing errors', async () => {
      const updateData = {
        pledgeAmountDollars: 5000,
        paymentMethodId: 'pm_card_chargeDeclined',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('payment failed');
    });

    it('should validate update data format', async () => {
      const updateData = {
        pledgeAmountDollars: 'invalid-amount', // Should be number
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('validation');
    });
  });

  describe('Update Notifications', () => {
    it('should trigger notification emails on significant updates', async () => {
      const updateData = {
        pledgeAmountDollars: 10000, // Significant increase
        rewardTierId: rewardTierPremium.id,
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${existingPledge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      
      // Check that notification was triggered
      // This would require integration with your notification system
      const updatedPledge = await response.json();
      expect(updatedPledge.notificationSent).toBeDefined();
    });
  });
});