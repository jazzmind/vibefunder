/**
 * Payment Flow Integration Tests
 * 
 * Tests complete payment processing workflows:
 * - Stripe checkout session creation
 * - Payment processing and webhook handling
 * - Pledge confirmation and notifications
 * - Payment failures and retry logic
 * - Refund processing
 * - Subscription handling for recurring pledges
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import {
  createTestUser,
  createTestCampaign,
  createTestOrganization,
  createTestPledgeTier,
  generateTestEmail,
  createAuthHeaders,
  setupTestEnvironment,
  teardownTestEnvironment,
  testPrisma,
} from '../utils/test-helpers';
import emailMock from '../mocks/email.mock';
import stripeMock, { createMockWebhookEvent } from '../mocks/stripe.mock';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('Payment Flow Integration Tests', () => {
  let creatorUser: any;
  let backerUser: any;
  let vipBacker: any;
  let testOrganization: any;
  let testCampaign: any;
  let pledgeTiers: any[];

  beforeAll(async () => {
    await setupTestEnvironment();
    
    // Create test users
    creatorUser = await createTestUser({
      email: generateTestEmail('creator'),
      name: 'Campaign Creator',
      roles: ['user'],
    });
    
    backerUser = await createTestUser({
      email: generateTestEmail('backer'),
      name: 'Regular Backer',
      roles: ['user'],
    });
    
    vipBacker = await createTestUser({
      email: generateTestEmail('vip'),
      name: 'VIP Backer',
      roles: ['user'],
    });
    
    // Create organization and campaign
    testOrganization = await createTestOrganization({
      name: 'Payment Test Startup',
      ownerId: creatorUser.id,
      stripeAccountId: 'acct_test_payments',
    });
    
    testCampaign = await createTestCampaign({
      title: 'Payment Integration Test Campaign',
      summary: 'Testing payment flows and processing',
      fundingGoalDollars: 25000,
      status: 'published',
      organizationId: testOrganization.id,
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }, creatorUser.id);
    
    // Create pledge tiers
    const tierData = [
      { title: 'Supporter', amountDollars: 25, maxBackers: 100 },
      { title: 'Enthusiast', amountDollars: 100, maxBackers: 50 },
      { title: 'Champion', amountDollars: 500, maxBackers: 20 },
      { title: 'Partner', amountDollars: 2500, maxBackers: 5 },
    ];
    
    pledgeTiers = [];
    for (const tier of tierData) {
      const createdTier = await createTestPledgeTier(testCampaign.id, tier);
      pledgeTiers.push(createdTier);
    }
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(() => {
    emailMock.reset();
    stripeMock.reset();
  });

  describe('Checkout Session Creation', () => {
    it('should create checkout session for regular pledge', async () => {
      const pledgeAmount = 100;
      const tier = pledgeTiers.find(t => t.amountDollars === pledgeAmount);
      
      const checkoutResponse = await fetch(`${API_BASE}/api/stripe/checkout`, {
        method: 'POST',
        headers: createAuthHeaders(backerUser),
        body: JSON.stringify({
          campaignId: testCampaign.id,
          amountDollars: pledgeAmount,
          pledgeTierId: tier.id,
        }),
      });

      expect(checkoutResponse.status).toBe(200);
      const checkoutData = await checkoutResponse.json();
      expect(checkoutData.sessionId).toBeDefined();
      expect(checkoutData.url).toBeDefined();
      expect(checkoutData.url).toContain('checkout.stripe.com');

      // Verify Stripe session was created with correct parameters
      expect(stripeMock.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          line_items: expect.arrayContaining([{
            price_data: expect.objectContaining({
              currency: 'usd',
              unit_amount: pledgeAmount * 100, // Amount in cents
              product_data: expect.objectContaining({
                name: expect.stringContaining(testCampaign.title),
              }),
            }),
            quantity: 1,
          }]),
          metadata: expect.objectContaining({
            campaignId: testCampaign.id,
            userId: backerUser.id,
            pledgeTierId: tier.id,
          }),
          success_url: expect.stringContaining('success'),
          cancel_url: expect.stringContaining('cancel'),
        })
      );
    });

    it('should create checkout session for custom amount', async () => {
      const customAmount = 250; // Custom amount between tiers
      
      const checkoutResponse = await fetch(`${API_BASE}/api/stripe/checkout`, {
        method: 'POST',
        headers: createAuthHeaders(backerUser),
        body: JSON.stringify({
          campaignId: testCampaign.id,
          amountDollars: customAmount,
          // No pledgeTierId for custom amount
        }),
      });

      expect(checkoutResponse.status).toBe(200);
      const checkoutData = await checkoutResponse.json();
      expect(checkoutData.sessionId).toBeDefined();

      // Verify custom amount was used
      expect(stripeMock.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([{
            price_data: expect.objectContaining({
              unit_amount: customAmount * 100,
            }),
          }]),
          metadata: expect.objectContaining({
            pledgeTierId: null,
          }),
        })
      );
    });

    it('should handle minimum pledge amount validation', async () => {
      const tooSmallAmount = 5; // Below minimum
      
      const checkoutResponse = await fetch(`${API_BASE}/api/stripe/checkout`, {
        method: 'POST',
        headers: createAuthHeaders(backerUser),
        body: JSON.stringify({
          campaignId: testCampaign.id,
          amountDollars: tooSmallAmount,
        }),
      });

      expect(checkoutResponse.status).toBe(400);
      const errorData = await checkoutResponse.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('minimum');
    });

    it('should handle campaign funding limit validation', async () => {
      // Set campaign as nearly funded to test limit
      await testPrisma.campaign.update({
        where: { id: testCampaign.id },
        data: { raisedDollars: 24950 }, // Only $50 left to goal
      });
      
      const excessiveAmount = 1000; // More than remaining
      
      const checkoutResponse = await fetch(`${API_BASE}/api/stripe/checkout`, {
        method: 'POST',
        headers: createAuthHeaders(backerUser),
        body: JSON.stringify({
          campaignId: testCampaign.id,
          amountDollars: excessiveAmount,
        }),
      });

      // Should still allow (overfunding is typically allowed)
      expect(checkoutResponse.status).toBe(200);
      
      // Reset for other tests
      await testPrisma.campaign.update({
        where: { id: testCampaign.id },
        data: { raisedDollars: 0 },
      });
    });
  });

  describe('Payment Processing and Webhooks', () => {
    let testSessionId: string;
    
    beforeEach(() => {
      testSessionId = `cs_test_${Date.now()}`;
    });

    it('should process successful payment webhook', async () => {
      const pledgeAmount = 500;
      const tier = pledgeTiers.find(t => t.amountDollars === pledgeAmount);
      
      // Create webhook event for successful payment
      const webhookEvent = createMockWebhookEvent(
        'checkout.session.completed',
        {
          id: testSessionId,
          payment_status: 'paid',
          status: 'complete',
          amount_total: pledgeAmount * 100,
          customer_details: {
            email: backerUser.email,
            name: backerUser.name,
          },
        },
        {
          campaignId: testCampaign.id,
          userId: backerUser.id,
          pledgeTierId: tier.id,
        }
      );

      const webhookResponse = await fetch(`${API_BASE}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature',
        },
        body: JSON.stringify(webhookEvent),
      });

      expect(webhookResponse.status).toBe(200);
      const webhookResult = await webhookResponse.json();
      expect(webhookResult.success).toBe(true);

      // Verify pledge was created in database
      const pledge = await testPrisma.pledge.findFirst({
        where: {
          campaignId: testCampaign.id,
          backerId: backerUser.id,
          amountDollars: pledgeAmount,
        },
        include: {
          campaign: true,
          backer: true,
          pledgeTier: true,
        },
      });

      expect(pledge).toBeDefined();
      expect(pledge?.status).toBe('completed');
      expect(pledge?.paymentRef).toBeDefined();
      expect(pledge?.pledgeTierId).toBe(tier.id);

      // Verify campaign raised amount was updated
      const updatedCampaign = await testPrisma.campaign.findUnique({
        where: { id: testCampaign.id },
      });
      expect(updatedCampaign?.raisedDollars).toBe(pledgeAmount);
    });

    it('should send confirmation emails after successful payment', async () => {
      // Check that confirmation emails were sent
      const confirmationEmails = emailMock.getEmailsBySubject('Pledge Confirmed');
      expect(confirmationEmails.length).toBeGreaterThan(0);
      
      // Should send email to backer
      const backerEmail = confirmationEmails.find(e => e.to === backerUser.email);
      expect(backerEmail).toBeDefined();
      expect(backerEmail?.html).toContain('500'); // Amount
      expect(backerEmail?.html).toContain(testCampaign.title);

      // Check that creator notification was sent
      const creatorEmails = emailMock.getEmailsBySubject('New Pledge');
      expect(creatorEmails.length).toBeGreaterThan(0);
      
      const creatorEmail = creatorEmails.find(e => e.to === creatorUser.email);
      expect(creatorEmail).toBeDefined();
    });

    it('should handle failed payment webhook', async () => {
      const failedSessionId = `cs_failed_${Date.now()}`;
      
      const failedWebhook = createMockWebhookEvent(
        'checkout.session.async_payment_failed',
        {
          id: failedSessionId,
          payment_status: 'unpaid',
          status: 'open',
          last_payment_error: {
            code: 'card_declined',
            decline_code: 'insufficient_funds',
            message: 'Your card has insufficient funds.',
          },
        },
        {
          campaignId: testCampaign.id,
          userId: backerUser.id,
        }
      );

      const webhookResponse = await fetch(`${API_BASE}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature',
        },
        body: JSON.stringify(failedWebhook),
      });

      expect(webhookResponse.status).toBe(200);
      
      // Should not create a completed pledge
      const failedPledge = await testPrisma.pledge.findFirst({
        where: {
          paymentRef: failedSessionId,
        },
      });
      
      if (failedPledge) {
        expect(failedPledge.status).toBe('failed');
      }
    });

    it('should handle payment intent succeeded for complex payments', async () => {
      const paymentIntentId = `pi_test_${Date.now()}`;
      const pledgeAmount = 2500; // VIP tier
      const vipTier = pledgeTiers.find(t => t.amountDollars === pledgeAmount);
      
      const paymentIntentEvent = createMockWebhookEvent(
        'payment_intent.succeeded',
        {
          id: paymentIntentId,
          status: 'succeeded',
          amount: pledgeAmount * 100,
          currency: 'usd',
          charges: {
            data: [{
              id: 'ch_test_123',
              status: 'succeeded',
              receipt_url: 'https://stripe.com/receipts/test',
            }],
          },
        },
        {
          campaignId: testCampaign.id,
          userId: vipBacker.id,
          pledgeTierId: vipTier.id,
        }
      );

      const webhookResponse = await fetch(`${API_BASE}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature',
        },
        body: JSON.stringify(paymentIntentEvent),
      });

      expect(webhookResponse.status).toBe(200);
      
      // Verify high-value pledge was created
      const vipPledge = await testPrisma.pledge.findFirst({
        where: {
          campaignId: testCampaign.id,
          backerId: vipBacker.id,
          amountDollars: pledgeAmount,
        },
      });

      expect(vipPledge).toBeDefined();
      expect(vipPledge?.status).toBe('completed');
    });
  });

  describe('Pledge Management', () => {
    it('should allow backers to view their pledge history', async () => {
      const pledgeHistoryResponse = await fetch(`${API_BASE}/api/users/${backerUser.id}/pledges`, {
        headers: createAuthHeaders(backerUser),
      });

      expect(pledgeHistoryResponse.status).toBe(200);
      const pledgeHistory = await pledgeHistoryResponse.json();
      expect(Array.isArray(pledgeHistory)).toBe(true);
      expect(pledgeHistory.length).toBeGreaterThan(0);
      
      const testPledge = pledgeHistory.find((p: any) => p.campaignId === testCampaign.id);
      expect(testPledge).toBeDefined();
      expect(testPledge.campaign).toBeDefined();
      expect(testPledge.pledgeTier).toBeDefined();
    });

    it('should allow pledge updates before campaign ends', async () => {
      // Get an existing pledge
      const existingPledge = await testPrisma.pledge.findFirst({
        where: {
          campaignId: testCampaign.id,
          backerId: backerUser.id,
        },
      });

      if (!existingPledge) {
        throw new Error('No existing pledge found for update test');
      }

      const newAmount = existingPledge.amountDollars + 100;
      
      const updateResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/update-pledge`, {
        method: 'POST',
        headers: createAuthHeaders(backerUser),
        body: JSON.stringify({
          pledgeId: existingPledge.id,
          newAmountDollars: newAmount,
        }),
      });

      expect(updateResponse.status).toBe(200);
      const updateResult = await updateResponse.json();
      expect(updateResult.success).toBe(true);

      // This would create a new checkout session for the difference
      expect(stripeMock.stripe.checkout.sessions.create).toHaveBeenCalled();
    });

    it('should handle pledge cancellation requests', async () => {
      // Create a new pledge specifically for cancellation
      const cancelPledge = await testPrisma.pledge.create({
        data: {
          campaignId: testCampaign.id,
          backerId: backerUser.id,
          amountDollars: 75,
          status: 'completed',
          paymentRef: `test-cancel-${Date.now()}`,
        },
      });

      const cancelResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/cancel-pledge`, {
        method: 'POST',
        headers: createAuthHeaders(backerUser),
        body: JSON.stringify({
          pledgeId: cancelPledge.id,
          reason: 'Changed mind about the project direction',
        }),
      });

      expect(cancelResponse.status).toBe(200);
      const cancelResult = await cancelResponse.json();
      expect(cancelResult.success).toBe(true);

      // Verify pledge status updated
      const updatedPledge = await testPrisma.pledge.findUnique({
        where: { id: cancelPledge.id },
      });
      expect(updatedPledge?.status).toBe('cancelled');
    });
  });

  describe('Refund Processing', () => {
    it('should process refund requests', async () => {
      const refundPledge = await testPrisma.pledge.findFirst({
        where: {
          campaignId: testCampaign.id,
          status: 'completed',
        },
      });

      if (!refundPledge) {
        throw new Error('No completed pledge found for refund test');
      }

      const refundResponse = await fetch(`${API_BASE}/api/admin/pledges/${refundPledge.id}/refund`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser), // Creator can initiate refunds
        body: JSON.stringify({
          reason: 'Customer requested refund within policy period',
          amount: refundPledge.amountDollars,
        }),
      });

      expect(refundResponse.status).toBe(200);
      const refundResult = await refundResponse.json();
      expect(refundResult.success).toBe(true);

      // In a real implementation, this would create a Stripe refund
      // For now, we check the pledge status is updated
      const refundedPledge = await testPrisma.pledge.findUnique({
        where: { id: refundPledge.id },
      });
      expect(refundedPledge?.status).toBe('refunded');
    });

    it('should handle partial refunds', async () => {
      const partialRefundPledge = await testPrisma.pledge.create({
        data: {
          campaignId: testCampaign.id,
          backerId: vipBacker.id,
          amountDollars: 1000,
          status: 'completed',
          paymentRef: `test-partial-refund-${Date.now()}`,
        },
      });

      const partialAmount = 300; // Partial refund
      
      const partialRefundResponse = await fetch(`${API_BASE}/api/admin/pledges/${partialRefundPledge.id}/refund`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          reason: 'Partial refund for reduced tier benefits',
          amount: partialAmount,
          isPartial: true,
        }),
      });

      expect(partialRefundResponse.status).toBe(200);
      const result = await partialRefundResponse.json();
      expect(result.success).toBe(true);
    });
  });

  describe('Payment Error Handling', () => {
    it('should handle webhook signature validation failures', async () => {
      const invalidWebhook = createMockWebhookEvent(
        'checkout.session.completed',
        { id: 'cs_invalid' },
        {}
      );

      // Mock signature validation to fail
      stripeMock.stripe.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });

      const webhookResponse = await fetch(`${API_BASE}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'invalid-signature',
        },
        body: JSON.stringify(invalidWebhook),
      });

      expect(webhookResponse.status).toBe(400);
      const errorResult = await webhookResponse.json();
      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toContain('signature');
    });

    it('should handle duplicate webhook events', async () => {
      const duplicateSessionId = `cs_duplicate_${Date.now()}`;
      
      const webhookEvent = createMockWebhookEvent(
        'checkout.session.completed',
        {
          id: duplicateSessionId,
          payment_status: 'paid',
          status: 'complete',
          amount_total: 10000, // $100
        },
        {
          campaignId: testCampaign.id,
          userId: backerUser.id,
        }
      );

      // Send the same webhook twice
      const firstResponse = await fetch(`${API_BASE}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature',
        },
        body: JSON.stringify(webhookEvent),
      });

      expect(firstResponse.status).toBe(200);

      const secondResponse = await fetch(`${API_BASE}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature',
        },
        body: JSON.stringify(webhookEvent),
      });

      expect(secondResponse.status).toBe(200); // Should handle gracefully
      
      // Should not create duplicate pledges
      const duplicatePledges = await testPrisma.pledge.findMany({
        where: {
          paymentRef: duplicateSessionId,
        },
      });
      expect(duplicatePledges.length).toBe(1); // Only one pledge should exist
    });

    it('should handle network failures during payment processing', async () => {
      // Simulate database failure during webhook processing
      const networkFailureEvent = createMockWebhookEvent(
        'checkout.session.completed',
        {
          id: `cs_network_fail_${Date.now()}`,
          payment_status: 'paid',
        },
        {
          campaignId: 'invalid-campaign-id', // This will cause a database error
          userId: backerUser.id,
        }
      );

      const failureResponse = await fetch(`${API_BASE}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature',
        },
        body: JSON.stringify(networkFailureEvent),
      });

      // Should return error status but not crash
      expect(failureResponse.status).toBe(500);
      const errorResult = await failureResponse.json();
      expect(errorResult.success).toBe(false);
    });
  });

  describe('Payment Analytics and Reporting', () => {
    it('should provide payment analytics for campaign creators', async () => {
      const analyticsResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/payment-analytics`, {
        headers: createAuthHeaders(creatorUser),
      });

      expect(analyticsResponse.status).toBe(200);
      const analytics = await analyticsResponse.json();
      
      expect(analytics).toHaveProperty('totalPledges');
      expect(analytics).toHaveProperty('totalAmount');
      expect(analytics).toHaveProperty('averagePledge');
      expect(analytics).toHaveProperty('paymentMethods');
      expect(analytics).toHaveProperty('pledgesByTier');
      expect(analytics).toHaveProperty('dailyPledges');
    });

    it('should track payment conversion rates', async () => {
      const conversionResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/conversion-metrics`, {
        headers: createAuthHeaders(creatorUser),
      });

      expect(conversionResponse.status).toBe(200);
      const conversion = await conversionResponse.json();
      
      expect(conversion).toHaveProperty('checkoutStarted');
      expect(conversion).toHaveProperty('checkoutCompleted');
      expect(conversion).toHaveProperty('conversionRate');
      expect(conversion).toHaveProperty('abandonmentRate');
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle high-volume concurrent payments', async () => {
      const concurrentPayments = [];
      
      // Simulate 10 concurrent successful payments
      for (let i = 0; i < 10; i++) {
        const sessionId = `cs_concurrent_${i}_${Date.now()}`;
        const webhookEvent = createMockWebhookEvent(
          'checkout.session.completed',
          {
            id: sessionId,
            payment_status: 'paid',
            status: 'complete',
            amount_total: 2500, // $25 each
          },
          {
            campaignId: testCampaign.id,
            userId: backerUser.id,
          }
        );

        concurrentPayments.push(
          fetch(`${API_BASE}/api/stripe/webhook`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'stripe-signature': 'test-signature',
            },
            body: JSON.stringify(webhookEvent),
          })
        );
      }

      const responses = await Promise.all(concurrentPayments);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify all pledges were created
      const concurrentPledges = await testPrisma.pledge.findMany({
        where: {
          campaignId: testCampaign.id,
          paymentRef: {
            contains: 'cs_concurrent',
          },
        },
      });
      expect(concurrentPledges.length).toBe(10);
    });

    it('should handle payment processing timeouts gracefully', async () => {
      // Simulate slow webhook processing
      emailMock.simulateDelay(5000); // 5 second delay
      
      const timeoutEvent = createMockWebhookEvent(
        'checkout.session.completed',
        {
          id: `cs_timeout_${Date.now()}`,
          payment_status: 'paid',
        },
        {
          campaignId: testCampaign.id,
          userId: backerUser.id,
        }
      );

      const timeoutResponse = await fetch(`${API_BASE}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature',
        },
        body: JSON.stringify(timeoutEvent),
      });

      // Should still succeed even with email delays
      expect(timeoutResponse.status).toBe(200);
    });
  });
});
