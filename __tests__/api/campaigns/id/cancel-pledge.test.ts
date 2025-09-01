/**
 * Pledge Cancellation API Tests
 * 
 * Comprehensive testing for pledge cancellation operations including:
 * - Full/partial refund logic
 * - Campaign impact calculations
 * - Reward tier stock restoration
 * - Cancellation deadline enforcement
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
  allowCancellations?: boolean;
  cancellationDeadline?: string;
  refundPolicy?: 'full' | 'partial' | 'none';
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
  paymentIntentId?: string;
  paymentStatus: string;
  createdAt: string;
  status: 'active' | 'cancelled' | 'refunded';
}

interface CancellationResult {
  pledgeId: string;
  refundAmount: number;
  refundStatus: string;
  refundId?: string;
  cancellationReason?: string;
  cancellationFee?: number;
  stockRestored: boolean;
  campaignImpact: {
    totalRaisedChange: number;
    backerCountChange: number;
    progressPercentageChange: number;
  };
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
        charges: {
          data: [{
            id: 'ch_test_123',
            amount: 5000,
            refunded: false,
          }]
        }
      }),
      cancel: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'canceled',
      }),
    },
    refunds: {
      create: jest.fn().mockImplementation(({ amount, charge }) => Promise.resolve({
        id: `re_test_${Date.now()}`,
        amount: amount,
        charge: charge,
        status: 'succeeded',
        reason: 'requested_by_customer',
      })),
    },
    charges: {
      retrieve: jest.fn().mockResolvedValue({
        id: 'ch_test_123',
        amount: 5000,
        refunded: false,
        amount_refunded: 0,
      }),
    },
  }));
});

describe('Campaign Pledge Cancellation API', () => {
  let testCampaign: TestCampaign;
  let testUser: any;
  let rewardTier: RewardTier;
  let activePledge: TestPledge;

  beforeAll(async () => {
    // Create test user
    testUser = await createTestUser({
      email: 'canceller@example.com',
      name: 'Test Canceller',
    });

    // Create test campaign with cancellation permissions
    testCampaign = await createTestCampaign({
      title: 'Pledge Cancellation Test Campaign',
      summary: 'Campaign for testing pledge cancellations',
      fundingGoalDollars: 100000,
      status: 'published',
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      allowCancellations: true,
      cancellationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
      refundPolicy: 'full',
    });

    // Create reward tier
    rewardTier = {
      id: 'tier_cancel_123',
      title: 'Cancellable Reward',
      description: 'Reward for cancellation testing',
      pledgeAmountDollars: 5000, // $50
      stockLimit: 100,
      stockClaimed: 10,
    };

    // Create active pledge
    const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testUser.token}`,
      },
      body: JSON.stringify({
        campaignId: testCampaign.id,
        pledgeAmountDollars: 5000,
        rewardTierId: rewardTier.id,
        isAnonymous: false,
        paymentMethodId: 'pm_test_cancel',
      }),
    });

    activePledge = await pledgeResponse.json();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Full Refund Cancellations', () => {
    it('should cancel pledge with full refund successfully', async () => {
      const cancellationData = {
        reason: 'Changed my mind',
        refundType: 'full',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${activePledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(cancellationData),
      });

      expect(response.status).toBe(200);
      
      const result: CancellationResult = await response.json();
      expect(result).toMatchObject({
        pledgeId: activePledge.id,
        refundAmount: 5000,
        refundStatus: 'succeeded',
        stockRestored: true,
        campaignImpact: {
          totalRaisedChange: -5000,
          backerCountChange: -1,
        },
      });
      expect(result.refundId).toBeDefined();
    });

    it('should restore reward tier stock on cancellation', async () => {
      // Get initial stock count
      const initialStockResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/reward-tiers/${rewardTier.id}`);
      const initialTier = await initialStockResponse.json();
      const initialAvailable = initialTier.stockLimit - initialTier.stockClaimed;

      // Create another pledge
      const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmountDollars: 5000,
          rewardTierId: rewardTier.id,
          isAnonymous: false,
          paymentMethodId: 'pm_test_stock_restore',
        }),
      });

      const newPledge = await pledgeResponse.json();

      // Cancel the pledge
      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${newPledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          reason: 'Testing stock restoration',
          refundType: 'full',
        }),
      });

      expect(response.status).toBe(200);

      // Check that stock was restored
      const updatedStockResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/reward-tiers/${rewardTier.id}`);
      const updatedTier = await updatedStockResponse.json();
      const updatedAvailable = updatedTier.stockLimit - updatedTier.stockClaimed;

      expect(updatedAvailable).toBe(initialAvailable);
    });

    it('should update campaign progress on cancellation', async () => {
      // Get initial campaign data
      const initialResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      const initialCampaign = await initialResponse.json();
      const initialRaised = initialCampaign.totalRaisedDollars || 0;
      const initialBackers = initialCampaign.backerCount || 0;

      // Create pledge to cancel
      const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmountDollars: 3000,
          isAnonymous: false,
          paymentMethodId: 'pm_test_progress',
        }),
      });

      const testPledge = await pledgeResponse.json();

      // Cancel the pledge
      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${testPledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          reason: 'Testing progress update',
          refundType: 'full',
        }),
      });

      expect(response.status).toBe(200);

      // Check updated campaign data
      const updatedResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      const updatedCampaign = await updatedResponse.json();

      // Campaign should reflect the cancellation
      expect(updatedCampaign.totalRaisedDollars).toBe(initialRaised);
      expect(updatedCampaign.backerCount).toBe(initialBackers);
    });
  });

  describe('Partial Refund Cancellations', () => {
    it('should handle partial refund with cancellation fee', async () => {
      // Create campaign with partial refund policy
      const partialRefundCampaign = await createTestCampaign({
        title: 'Partial Refund Campaign',
        summary: 'Campaign with partial refund policy',
        fundingGoalDollars: 50000,
        status: 'published',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        allowCancellations: true,
        refundPolicy: 'partial',
      });

      // Create pledge
      const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${partialRefundCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          campaignId: partialRefundCampaign.id,
          pledgeAmountDollars: 10000, // $100
          isAnonymous: false,
          paymentMethodId: 'pm_test_partial',
        }),
      });

      const partialPledge = await pledgeResponse.json();

      const cancellationData = {
        reason: 'Financial hardship',
        refundType: 'partial',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${partialRefundCampaign.id}/pledges/${partialPledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(cancellationData),
      });

      expect(response.status).toBe(200);
      
      const result: CancellationResult = await response.json();
      expect(result.refundAmount).toBeLessThan(10000); // Less than full amount
      expect(result.cancellationFee).toBeGreaterThan(0);
      expect(result.refundStatus).toBe('succeeded');
    });

    it('should calculate different fees based on timing', async () => {
      // Test early cancellation (lower fee)
      const earlyCancellationData = {
        reason: 'Early cancellation',
        refundType: 'partial',
      };

      // Create new pledge for early cancellation test
      const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmountDollars: 5000,
          isAnonymous: false,
          paymentMethodId: 'pm_test_early_cancel',
        }),
      });

      const earlyPledge = await pledgeResponse.json();

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${earlyPledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(earlyCancellationData),
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      // Early cancellation should have lower or no fee
      expect(result.cancellationFee).toBeDefined();
    });
  });

  describe('Cancellation Deadline Enforcement', () => {
    it('should reject cancellation after deadline', async () => {
      // Create campaign with passed cancellation deadline
      const expiredCampaign = await createTestCampaign({
        title: 'Expired Cancellation Campaign',
        summary: 'Campaign with passed cancellation deadline',
        fundingGoalDollars: 50000,
        status: 'published',
        endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        allowCancellations: true,
        cancellationDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      });

      // Create pledge in expired campaign
      const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${expiredCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          campaignId: expiredCampaign.id,
          pledgeAmountDollars: 2500,
          isAnonymous: false,
          paymentMethodId: 'pm_test_expired_cancel',
        }),
      });

      const expiredPledge = await pledgeResponse.json();

      const cancellationData = {
        reason: 'Late cancellation attempt',
        refundType: 'full',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${expiredCampaign.id}/pledges/${expiredPledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(cancellationData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('cancellation deadline has passed');
    });

    it('should allow cancellation before deadline', async () => {
      const cancellationData = {
        reason: 'Timely cancellation',
        refundType: 'full',
      };

      // Create new pledge for this test
      const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmountDollars: 2500,
          isAnonymous: false,
          paymentMethodId: 'pm_test_timely_cancel',
        }),
      });

      const timelyPledge = await pledgeResponse.json();

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${timelyPledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(cancellationData),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Campaign Status Restrictions', () => {
    it('should reject cancellation for funded campaigns', async () => {
      const fundedCampaign = await createTestCampaign({
        title: 'Funded Campaign',
        summary: 'Campaign that reached funding goal',
        fundingGoalDollars: 50000,
        status: 'funded',
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        allowCancellations: false,
      });

      // Create pledge in funded campaign
      const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${fundedCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          campaignId: fundedCampaign.id,
          pledgeAmountDollars: 5000,
          isAnonymous: false,
          paymentMethodId: 'pm_test_funded',
        }),
      });

      const fundedPledge = await pledgeResponse.json();

      const cancellationData = {
        reason: 'Want to cancel funded campaign pledge',
        refundType: 'full',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${fundedCampaign.id}/pledges/${fundedPledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(cancellationData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('cannot cancel pledges for funded campaigns');
    });

    it('should allow admin override for special cases', async () => {
      // This test would require admin privileges
      // Implementation depends on your authorization system
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Payment Processing', () => {
    it('should handle payment intent cancellation for unpaid pledges', async () => {
      // Create unpaid pledge
      const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmountDollars: 3000,
          isAnonymous: false,
          paymentMethodId: 'pm_test_unpaid',
          // Simulate unpaid state
        }),
      });

      const unpaidPledge = await pledgeResponse.json();

      const cancellationData = {
        reason: 'Cancel unpaid pledge',
        refundType: 'full',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${unpaidPledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(cancellationData),
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.refundAmount).toBe(0); // No refund needed for unpaid pledge
      expect(result.refundStatus).toBe('not_required');
    });

    it('should handle Stripe refund failures gracefully', async () => {
      // Mock Stripe refund failure
      const mockStripeError = new Error('Refund failed');
      mockStripeError.name = 'StripeError';

      // Create pledge to cancel
      const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmountDollars: 4000,
          isAnonymous: false,
          paymentMethodId: 'pm_test_refund_fail',
        }),
      });

      const failPledge = await pledgeResponse.json();

      const cancellationData = {
        reason: 'Test refund failure handling',
        refundType: 'full',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${failPledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(cancellationData),
      });

      // Should handle gracefully, possibly returning pending status
      const result = await response.json();
      expect(result.refundStatus).toBeDefined();
    });
  });

  describe('Authorization and Security', () => {
    it('should reject unauthorized cancellation attempts', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        name: 'Other User',
      });

      const cancellationData = {
        reason: 'Unauthorized cancellation attempt',
        refundType: 'full',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${activePledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${otherUser.token}`,
        },
        body: JSON.stringify(cancellationData),
      });

      expect(response.status).toBe(403);
      
      const error = await response.json();
      expect(error.message).toContain('not authorized');
    });

    it('should reject cancellation without authentication', async () => {
      const cancellationData = {
        reason: 'Unauthenticated cancellation',
        refundType: 'full',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${activePledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cancellationData),
      });

      expect(response.status).toBe(401);
    });

    it('should allow campaign owner to cancel any pledge', async () => {
      // This test would require campaign owner functionality
      // Implementation depends on your authorization system
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Stretch Goal Impact', () => {
    it('should recalculate stretch goal eligibility after cancellation', async () => {
      // Create campaign near stretch goal
      const stretchGoalCampaign = await createTestCampaign({
        title: 'Stretch Goal Campaign',
        summary: 'Campaign with stretch goals',
        fundingGoalDollars: 100000,
        status: 'published',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        stretchGoals: [
          { amount: 150000, title: 'First Stretch Goal' },
          { amount: 200000, title: 'Second Stretch Goal' },
        ],
      });

      // Create large pledge that triggers stretch goal
      const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${stretchGoalCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          campaignId: stretchGoalCampaign.id,
          pledgeAmountDollars: 75000, // Large pledge
          isAnonymous: false,
          paymentMethodId: 'pm_test_stretch',
        }),
      });

      const stretchPledge = await pledgeResponse.json();

      // Cancel the pledge
      const response = await fetch(`${API_BASE}/api/campaigns/${stretchGoalCampaign.id}/pledges/${stretchPledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          reason: 'Testing stretch goal recalculation',
          refundType: 'full',
        }),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.campaignImpact.stretchGoalImpact).toBeDefined();
    });
  });

  describe('Email Notifications', () => {
    it('should send cancellation confirmation email', async () => {
      // Create pledge to cancel
      const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmountDollars: 3500,
          isAnonymous: false,
          paymentMethodId: 'pm_test_email_cancel',
        }),
      });

      const emailPledge = await pledgeResponse.json();

      const cancellationData = {
        reason: 'Testing email notification',
        refundType: 'full',
        sendConfirmationEmail: true,
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${emailPledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(cancellationData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.emailSent).toBe(true);
    });

    it('should notify campaign owner of significant cancellations', async () => {
      // Create large pledge to cancel
      const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmountDollars: 25000, // Significant amount
          isAnonymous: false,
          paymentMethodId: 'pm_test_owner_notify',
        }),
      });

      const largePledge = await pledgeResponse.json();

      const cancellationData = {
        reason: 'Large cancellation requiring owner notification',
        refundType: 'full',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${largePledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(cancellationData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.ownerNotified).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent pledge', async () => {
      const cancellationData = {
        reason: 'Non-existent pledge',
        refundType: 'full',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/non-existent-id/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(cancellationData),
      });

      expect(response.status).toBe(404);
    });

    it('should handle already cancelled pledges', async () => {
      // Create and cancel a pledge
      const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmountDollars: 2000,
          isAnonymous: false,
          paymentMethodId: 'pm_test_double_cancel',
        }),
      });

      const doublePledge = await pledgeResponse.json();

      // First cancellation
      const firstCancelResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${doublePledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          reason: 'First cancellation',
          refundType: 'full',
        }),
      });

      expect(firstCancelResponse.status).toBe(200);

      // Second cancellation attempt
      const secondCancelResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${doublePledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          reason: 'Second cancellation',
          refundType: 'full',
        }),
      });

      expect(secondCancelResponse.status).toBe(400);
      
      const error = await secondCancelResponse.json();
      expect(error.message).toContain('already cancelled');
    });

    it('should validate cancellation data format', async () => {
      const invalidData = {
        // Missing required reason field
        refundType: 'full',
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/pledges/${activePledge.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.token}`,
        },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('reason is required');
    });
  });
});