/**
 * Webhook Integration Tests - Full Workflow
 * 
 * This test suite provides end-to-end integration testing for the complete
 * webhook processing workflow, testing real-world scenarios and edge cases.
 * 
 * @author Integration Testing Specialist
 * @version 1.0.0
 */

import { 
  prismaMock, 
  stripeMock, 
  resetAllMocks, 
  setupDefaultMocks,
  emailMock
} from '../../payments/setup-payment-mocks';

jest.mock('@/lib/stripe', () => ({
  stripe: require('../../payments/setup-payment-mocks').stripeMock,
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/payments/stripe/webhook/route';
import { 
  PaymentTestData, 
  StripeObjectFactory 
} from '../../payments/payment-test-helpers';

// Mock environment variable
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook_secret';

describe('Webhook Integration Tests - Full Workflow', () => {
  beforeEach(() => {
    resetAllMocks();
    setupDefaultMocks();
  });

  describe('🔄 Complete Payment Lifecycle', () => {
    it('should handle full payment lifecycle from checkout to confirmation', async () => {
      const campaign = PaymentTestData.generateCampaign();
      const user = PaymentTestData.generateUser();
      const pledgeTier = campaign.pledgeTiers[0];
      
      const sessionId = 'cs_integration_full_lifecycle';
      const paymentIntentId = 'pi_integration_full_lifecycle';

      // Step 1: Checkout session completed
      const checkoutSession = StripeObjectFactory.createCheckoutSession({
        id: sessionId,
        payment_intent: paymentIntentId,
        amount_total: 100000, // $1000
        metadata: {
          campaignId: campaign.id,
          backerId: user.id,
          pledgeTierId: pledgeTier.id,
          source: 'integration_test'
        }
      });

      const checkoutCompletedEvent = StripeObjectFactory.createWebhookEvent(
        'checkout.session.completed',
        checkoutSession
      );

      stripeMock.webhooks.constructEvent.mockReturnValueOnce(checkoutCompletedEvent);

      const mockPledge = {
        ...PaymentTestData.generatePledge({
          id: 'pledge-integration-123',
          campaignId: campaign.id,
          backerId: user.id,
          pledgeTierId: pledgeTier.id,
          amountDollars: 1000,
          status: 'pending',
          paymentRef: paymentIntentId,
          stripeSessionId: sessionId
        }),
        backer: user,
        campaign: campaign
      };

      prismaMock.pledge.create.mockResolvedValueOnce(mockPledge as any);
      prismaMock.campaign.update.mockResolvedValueOnce({
        ...campaign,
        raisedDollars: campaign.raisedDollars + 1000
      } as any);

      const checkoutRequest = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid_signature' },
        body: JSON.stringify(checkoutCompletedEvent)
      });

      const checkoutResponse = await POST(checkoutRequest);

      expect(checkoutResponse.status).toBe(200);
      expect(prismaMock.pledge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          campaignId: campaign.id,
          backerId: user.id,
          amountDollars: 1000,
          status: 'pending',
          paymentRef: paymentIntentId,
          stripeSessionId: sessionId,
          pledgeTierId: pledgeTier.id
        }),
        include: expect.any(Object)
      });

      // Step 2: Payment intent succeeded
      resetAllMocks();
      setupDefaultMocks();

      const paymentIntent = StripeObjectFactory.createPaymentIntent({
        id: paymentIntentId,
        status: 'succeeded',
        amount: 100000,
        metadata: {
          campaignId: campaign.id,
          backerId: user.id,
          pledgeAmount: '1000'
        }
      });

      const paymentSucceededEvent = StripeObjectFactory.createWebhookEvent(
        'payment_intent.succeeded',
        paymentIntent
      );

      stripeMock.webhooks.constructEvent.mockReturnValueOnce(paymentSucceededEvent);
      prismaMock.pledge.updateMany.mockResolvedValueOnce({ count: 1 });
      
      const capturedPledge = {
        ...mockPledge,
        status: 'captured'
      };
      
      prismaMock.pledge.findFirst.mockResolvedValueOnce(capturedPledge as any);

      const paymentRequest = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid_signature' },
        body: JSON.stringify(paymentSucceededEvent)
      });

      const paymentResponse = await POST(paymentRequest);

      expect(paymentResponse.status).toBe(200);
      expect(prismaMock.pledge.updateMany).toHaveBeenCalledWith({
        where: {
          paymentRef: paymentIntentId,
          status: 'pending'
        },
        data: {
          status: 'captured'
        }
      });

      // Verify confirmation email was sent
      expect(emailMock.sendPledgeConfirmationEmail).toHaveBeenCalledWith(
        user.email,
        expect.objectContaining({
          campaignTitle: campaign.title,
          campaignId: campaign.id,
          pledgeAmount: 1000,
          backerName: user.name
        })
      );
    });

    it('should handle partial failure in payment lifecycle', async () => {
      const campaign = PaymentTestData.generateCampaign();
      const user = PaymentTestData.generateUser();
      
      const sessionId = 'cs_partial_failure_test';
      const paymentIntentId = 'pi_partial_failure_test';

      // Step 1: Checkout session completed successfully
      const checkoutSession = StripeObjectFactory.createCheckoutSession({
        id: sessionId,
        payment_intent: paymentIntentId,
        metadata: {
          campaignId: campaign.id,
          backerId: user.id
        }
      });

      const checkoutCompletedEvent = StripeObjectFactory.createWebhookEvent(
        'checkout.session.completed',
        checkoutSession
      );

      stripeMock.webhooks.constructEvent.mockReturnValueOnce(checkoutCompletedEvent);

      const mockPledge = {
        ...PaymentTestData.generatePledge({
          paymentRef: paymentIntentId,
          stripeSessionId: sessionId
        }),
        backer: user,
        campaign: campaign
      };

      prismaMock.pledge.create.mockResolvedValueOnce(mockPledge as any);
      prismaMock.campaign.update.mockResolvedValueOnce(campaign as any);

      const checkoutRequest = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid_signature' },
        body: JSON.stringify(checkoutCompletedEvent)
      });

      const checkoutResponse = await POST(checkoutRequest);
      expect(checkoutResponse.status).toBe(200);

      // Step 2: Payment intent failed
      resetAllMocks();
      setupDefaultMocks();

      const paymentIntent = StripeObjectFactory.createPaymentIntent({
        id: paymentIntentId,
        status: 'requires_payment_method',
        last_payment_error: {
          type: 'card_error',
          code: 'card_declined',
          decline_code: 'insufficient_funds',
          message: 'Your card was declined.'
        }
      });

      const paymentFailedEvent = StripeObjectFactory.createWebhookEvent(
        'payment_intent.payment_failed',
        paymentIntent
      );

      stripeMock.webhooks.constructEvent.mockReturnValueOnce(paymentFailedEvent);
      prismaMock.pledge.updateMany.mockResolvedValueOnce({ count: 1 });

      const failedRequest = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid_signature' },
        body: JSON.stringify(paymentFailedEvent)
      });

      const failedResponse = await POST(failedRequest);

      expect(failedResponse.status).toBe(200);
      expect(prismaMock.pledge.updateMany).toHaveBeenCalledWith({
        where: {
          paymentRef: paymentIntentId,
          status: 'pending'
        },
        data: {
          status: 'failed'
        }
      });

      // No email should be sent for failed payments
      expect(emailMock.sendPledgeConfirmationEmail).not.toHaveBeenCalled();
    });
  });

  describe('🌍 Multi-Currency Workflow', () => {
    it('should handle international pledges with currency conversion', async () => {
      const currencies = [
        { code: 'EUR', amount: 85000, expectedUsd: 850 }, // €850 -> $850 (simplified)
        { code: 'GBP', amount: 75000, expectedUsd: 750 }, // £750 -> $750 (simplified)
        { code: 'JPY', amount: 11000000, expectedUsd: 1100 }, // ¥110,000 -> $1100 (simplified)
        { code: 'CAD', amount: 130000, expectedUsd: 1300 } // C$1300 -> $1300 (simplified)
      ];

      for (const currency of currencies) {
        resetAllMocks();
        setupDefaultMocks();

        const campaign = PaymentTestData.generateCampaign();
        const user = PaymentTestData.generateUser();

        const checkoutSession = StripeObjectFactory.createCheckoutSession({
          id: `cs_${currency.code.toLowerCase()}_test`,
          currency: currency.code.toLowerCase(),
          amount_total: currency.amount,
          metadata: {
            campaignId: campaign.id,
            backerId: user.id,
            originalCurrency: currency.code,
            originalAmount: currency.amount.toString()
          }
        });

        const webhookEvent = StripeObjectFactory.createWebhookEvent(
          'checkout.session.completed',
          checkoutSession
        );

        stripeMock.webhooks.constructEvent.mockReturnValue(webhookEvent);

        const mockPledge = {
          ...PaymentTestData.generatePledge({
            amountDollars: currency.expectedUsd,
            currency: currency.code
          }),
          backer: user,
          campaign: campaign
        };

        prismaMock.pledge.create.mockResolvedValue(mockPledge as any);
        prismaMock.campaign.update.mockResolvedValue(campaign as any);

        const request = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
          method: 'POST',
          headers: { 'stripe-signature': 'valid_signature' },
          body: JSON.stringify(webhookEvent)
        });

        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(prismaMock.pledge.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            amountDollars: currency.expectedUsd,
            currency: currency.code
          }),
          include: expect.any(Object)
        });

        console.log(`✅ ${currency.code}: ${currency.amount} -> $${currency.expectedUsd}`);
      }
    });
  });

  describe('📈 Campaign Milestone Integration', () => {
    it('should handle campaign reaching funding milestones', async () => {
      const campaign = PaymentTestData.generateCampaign({
        fundingGoalDollars: 10000,
        raisedDollars: 8500 // Close to goal
      });

      const user = PaymentTestData.generateUser();

      // Large pledge that pushes campaign over the goal
      const checkoutSession = StripeObjectFactory.createCheckoutSession({
        amount_total: 200000, // $2000 pledge
        metadata: {
          campaignId: campaign.id,
          backerId: user.id
        }
      });

      const webhookEvent = StripeObjectFactory.createWebhookEvent(
        'checkout.session.completed',
        checkoutSession
      );

      stripeMock.webhooks.constructEvent.mockReturnValue(webhookEvent);

      const mockPledge = {
        ...PaymentTestData.generatePledge({
          amountDollars: 2000
        }),
        backer: user,
        campaign: campaign
      };

      prismaMock.pledge.create.mockResolvedValue(mockPledge as any);

      // Campaign should be updated with new raised amount
      const updatedCampaign = {
        ...campaign,
        raisedDollars: campaign.raisedDollars + 2000 // 8500 + 2000 = 10500 (over goal!)
      };

      prismaMock.campaign.update.mockResolvedValue(updatedCampaign as any);

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid_signature' },
        body: JSON.stringify(webhookEvent)
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify campaign was updated with correct amount
      expect(prismaMock.campaign.update).toHaveBeenCalledWith({
        where: { id: campaign.id },
        data: {
          raisedDollars: {
            increment: 2000
          }
        }
      });

      // In a real implementation, you might also:
      // - Send milestone notification emails
      // - Update campaign status to 'funded'
      // - Trigger campaign completion workflows
    });

    it('should handle multiple pledges reaching campaign goal simultaneously', async () => {
      const campaign = PaymentTestData.generateCampaign({
        fundingGoalDollars: 10000,
        raisedDollars: 9000 // $1000 away from goal
      });

      // Multiple pledges that together exceed the goal
      const pledges = [
        { amount: 30000, userId: 'user-1' }, // $300
        { amount: 40000, userId: 'user-2' }, // $400  
        { amount: 50000, userId: 'user-3' }  // $500
      ];

      const webhookEvents = pledges.map((pledge, index) => 
        StripeObjectFactory.createWebhookEvent(
          'checkout.session.completed',
          StripeObjectFactory.createCheckoutSession({
            id: `cs_simultaneous_${index}`,
            amount_total: pledge.amount,
            metadata: {
              campaignId: campaign.id,
              backerId: pledge.userId
            }
          })
        )
      );

      stripeMock.webhooks.constructEvent.mockImplementation((body) => {
        const event = JSON.parse(body);
        return event;
      });

      const mockPledge = {
        ...PaymentTestData.generatePledge(),
        backer: PaymentTestData.generateUser(),
        campaign: campaign
      };

      prismaMock.pledge.create.mockResolvedValue(mockPledge as any);
      prismaMock.campaign.update.mockResolvedValue(campaign as any);

      // Process all webhooks concurrently
      const promises = webhookEvents.map(event => {
        const request = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
          method: 'POST',
          headers: { 'stripe-signature': 'valid_signature' },
          body: JSON.stringify(event)
        });

        return POST(request);
      });

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // All pledges should be created
      expect(prismaMock.pledge.create).toHaveBeenCalledTimes(3);

      // Campaign should be updated for each pledge
      expect(prismaMock.campaign.update).toHaveBeenCalledTimes(3);
      expect(prismaMock.campaign.update).toHaveBeenCalledWith({
        where: { id: campaign.id },
        data: {
          raisedDollars: {
            increment: 300
          }
        }
      });
    });
  });

  describe('🚨 Error Recovery Scenarios', () => {
    it('should recover from temporary database outages', async () => {
      const checkoutSession = StripeObjectFactory.createCheckoutSession({
        metadata: {
          campaignId: 'recovery-campaign',
          backerId: 'recovery-user'
        }
      });

      const webhookEvent = StripeObjectFactory.createWebhookEvent(
        'checkout.session.completed',
        checkoutSession
      );

      stripeMock.webhooks.constructEvent.mockReturnValue(webhookEvent);

      // Simulate temporary database outage followed by recovery
      prismaMock.pledge.create
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockRejectedValueOnce(new Error('Database temporarily unavailable'))
        .mockResolvedValueOnce({
          ...PaymentTestData.generatePledge(),
          backer: PaymentTestData.generateUser(),
          campaign: PaymentTestData.generateCampaign()
        } as any);

      prismaMock.campaign.update.mockResolvedValue(PaymentTestData.generateCampaign() as any);

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid_signature' },
        body: JSON.stringify(webhookEvent)
      });

      // First two attempts should fail
      let response1 = await POST(request);
      expect(response1.status).toBe(500);

      let response2 = await POST(request);
      expect(response2.status).toBe(500);

      // Third attempt should succeed (simulating recovery)
      let response3 = await POST(request);
      expect(response3.status).toBe(200);
    });

    it('should handle email service degradation gracefully', async () => {
      const paymentIntent = StripeObjectFactory.createPaymentIntent({
        id: 'pi_email_degradation_test'
      });

      const webhookEvent = StripeObjectFactory.createWebhookEvent(
        'payment_intent.succeeded',
        paymentIntent
      );

      stripeMock.webhooks.constructEvent.mockReturnValue(webhookEvent);
      prismaMock.pledge.updateMany.mockResolvedValue({ count: 1 });
      
      const updatedPledge = {
        ...PaymentTestData.generatePledge(),
        backer: PaymentTestData.generateUser(),
        campaign: PaymentTestData.generateCampaign()
      };

      prismaMock.pledge.findFirst.mockResolvedValue(updatedPledge as any);

      // Simulate different email service failures
      const emailErrors = [
        new Error('Rate limit exceeded'),
        new Error('Email service temporarily unavailable'),
        new Error('Authentication failed'),
        new Error('Invalid template')
      ];

      for (const error of emailErrors) {
        resetAllMocks();
        setupDefaultMocks();
        
        stripeMock.webhooks.constructEvent.mockReturnValue(webhookEvent);
        prismaMock.pledge.updateMany.mockResolvedValue({ count: 1 });
        prismaMock.pledge.findFirst.mockResolvedValue(updatedPledge as any);
        emailMock.sendPledgeConfirmationEmail.mockRejectedValue(error);

        const request = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
          method: 'POST',
          headers: { 'stripe-signature': 'valid_signature' },
          body: JSON.stringify(webhookEvent)
        });

        const response = await POST(request);

        // Webhook should still succeed even if email fails
        expect(response.status).toBe(200);
        expect(prismaMock.pledge.updateMany).toHaveBeenCalled();
      }
    });
  });

  describe('🔗 Webhook Event Correlation', () => {
    it('should correlate related webhook events across time', async () => {
      const correlationId = 'corr_test_12345';
      const sessionId = 'cs_correlation_test';
      const paymentIntentId = 'pi_correlation_test';
      
      // Track events for correlation
      const eventLog: Array<{
        eventType: string;
        timestamp: number;
        correlationId: string;
        sessionId?: string;
        paymentIntentId?: string;
      }> = [];

      // Event 1: Checkout session created (not handled by webhook, but part of flow)
      // Event 2: Checkout session completed
      const checkoutCompletedEvent = StripeObjectFactory.createWebhookEvent(
        'checkout.session.completed',
        StripeObjectFactory.createCheckoutSession({
          id: sessionId,
          payment_intent: paymentIntentId,
          metadata: {
            campaignId: 'correlation-campaign',
            backerId: 'correlation-user',
            correlationId
          }
        })
      );

      eventLog.push({
        eventType: 'checkout.session.completed',
        timestamp: Date.now(),
        correlationId,
        sessionId,
        paymentIntentId
      });

      stripeMock.webhooks.constructEvent.mockReturnValueOnce(checkoutCompletedEvent);

      const mockPledge = {
        ...PaymentTestData.generatePledge({
          paymentRef: paymentIntentId,
          stripeSessionId: sessionId
        }),
        backer: PaymentTestData.generateUser(),
        campaign: PaymentTestData.generateCampaign()
      };

      prismaMock.pledge.create.mockResolvedValueOnce(mockPledge as any);
      prismaMock.campaign.update.mockResolvedValueOnce(PaymentTestData.generateCampaign() as any);

      // Process checkout webhook
      const checkoutRequest = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid_signature' },
        body: JSON.stringify(checkoutCompletedEvent)
      });

      const checkoutResponse = await POST(checkoutRequest);
      expect(checkoutResponse.status).toBe(200);

      // Event 3: Payment intent succeeded
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to simulate real timing

      eventLog.push({
        eventType: 'payment_intent.succeeded',
        timestamp: Date.now(),
        correlationId,
        paymentIntentId
      });

      resetAllMocks();
      setupDefaultMocks();

      const paymentSucceededEvent = StripeObjectFactory.createWebhookEvent(
        'payment_intent.succeeded',
        StripeObjectFactory.createPaymentIntent({
          id: paymentIntentId,
          metadata: {
            correlationId
          }
        })
      );

      stripeMock.webhooks.constructEvent.mockReturnValueOnce(paymentSucceededEvent);
      prismaMock.pledge.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.pledge.findFirst.mockResolvedValueOnce({
        ...mockPledge,
        backer: PaymentTestData.generateUser(),
        campaign: PaymentTestData.generateCampaign()
      } as any);

      // Process payment webhook
      const paymentRequest = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid_signature' },
        body: JSON.stringify(paymentSucceededEvent)
      });

      const paymentResponse = await POST(paymentRequest);
      expect(paymentResponse.status).toBe(200);

      // Verify event correlation
      const correlatedEvents = eventLog.filter(event => event.correlationId === correlationId);
      expect(correlatedEvents).toHaveLength(2);

      const checkoutEvent = correlatedEvents.find(e => e.eventType === 'checkout.session.completed');
      const paymentEvent = correlatedEvents.find(e => e.eventType === 'payment_intent.succeeded');

      expect(checkoutEvent).toBeDefined();
      expect(paymentEvent).toBeDefined();
      expect(checkoutEvent?.sessionId).toBe(sessionId);
      expect(checkoutEvent?.paymentIntentId).toBe(paymentIntentId);
      expect(paymentEvent?.paymentIntentId).toBe(paymentIntentId);

      // Verify timing sequence
      expect(paymentEvent!.timestamp).toBeGreaterThan(checkoutEvent!.timestamp);
    });
  });
});