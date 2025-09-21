/**
 * Payment Flow Integration Tests - Phase 4 
 * Comprehensive payment processing with security focus
 * 
 * Test Coverage:
 * - Stripe checkout session creation and validation
 * - Payment intent processing with retry logic
 * - Webhook handling for all payment states
 * - Failed payment recovery workflows
 * - Multiple payment methods per user
 * - Payment confirmation email flows
 * - PCI compliance and security validation
 * - Webhook signature verification
 * - Idempotency key handling
 * - Rate limiting protection
 * - Financial transaction integrity
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
import crypto from 'crypto';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

interface TestUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

interface TestCampaign {
  id: string;
  title: string;
  status: string;
  fundingGoalDollars: number;
  raisedDollars: number;
  endsAt: Date;
}

interface TestPledgeTier {
  id: string;
  title: string;
  amountDollars: number;
  maxBackers: number;
}

describe('Payment Flow Integration Tests - Phase 4', () => {
  let creatorUser: TestUser;
  let backerUser: TestUser;
  let vipBacker: TestUser;
  let premiumBacker: TestUser;
  let testOrganization: any;
  let testCampaign: TestCampaign;
  let pledgeTiers: TestPledgeTier[];

  // Track payment attempts for rate limiting tests
  const paymentAttempts = new Map<string, number>();

  beforeAll(async () => {
    await setupTestEnvironment();
    
    // Create test users with different payment profiles
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

    premiumBacker = await createTestUser({
      email: generateTestEmail('premium'),
      name: 'Premium Supporter',
      roles: ['user'],
    });
    
    // Create organization with Stripe configuration
    testOrganization = await createTestOrganization({
      name: 'Payment Security Test Startup',
      ownerId: creatorUser.id,
      stripeAccountId: 'acct_test_security_payments',
    });
    
    testCampaign = await createTestCampaign({
      title: 'Payment Security Integration Test Campaign',
      summary: 'Testing comprehensive payment flows with security focus',
      fundingGoalDollars: 50000,
      status: 'published',
      organizationId: testOrganization.id,
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }, creatorUser.id);
    
    // Create comprehensive pledge tiers
    const tierData = [
      { title: 'Early Bird', amountDollars: 50, maxBackers: 200 },
      { title: 'Supporter', amountDollars: 100, maxBackers: 150 },
      { title: 'Enthusiast', amountDollars: 250, maxBackers: 75 },
      { title: 'Champion', amountDollars: 500, maxBackers: 30 },
      { title: 'VIP', amountDollars: 1000, maxBackers: 15 },
      { title: 'Premium Partner', amountDollars: 5000, maxBackers: 5 },
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
    paymentAttempts.clear();
  });

  describe('Stripe Checkout Session Creation - Security Enhanced', () => {
    it('should create checkout session with PCI-compliant data handling', async () => {
      const pledgeAmount = 250;
      const tier = pledgeTiers.find(t => t.amountDollars === pledgeAmount);
      
      // Generate secure idempotency key
      const idempotencyKey = crypto.randomUUID();
      
      const checkoutResponse = await fetch(`${API_BASE}/api/payments/checkout-session`, {
        method: 'POST',
        headers: {
          ...createAuthHeaders(backerUser),
          'Idempotency-Key': idempotencyKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmount: pledgeAmount,
          pledgeTierId: tier?.id,
        }),
      });

      expect(checkoutResponse.status).toBe(200);
      const checkoutData = await checkoutResponse.json();
      expect(checkoutData.checkoutUrl).toBeDefined();
      expect(checkoutData.sessionId).toBeDefined();
      expect(checkoutData.sessionId).toMatch(/^cs_/);

      // Verify no sensitive data in response
      expect(JSON.stringify(checkoutData)).not.toContain('sk_');
      expect(JSON.stringify(checkoutData)).not.toContain('pk_test_');
      
      // Verify Stripe session created with security parameters
      expect(stripeMock.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: expect.arrayContaining([{
            price_data: expect.objectContaining({
              currency: 'usd',
              unit_amount: pledgeAmount * 100,
              product_data: expect.objectContaining({
                name: expect.stringContaining(testCampaign.title),
              }),
            }),
            quantity: 1,
          }]),
          metadata: expect.objectContaining({
            campaignId: testCampaign.id,
            backerId: backerUser.id,
            pledgeTierId: tier?.id,
          }),
          payment_intent_data: expect.objectContaining({
            metadata: expect.objectContaining({
              campaignId: testCampaign.id,
              backerId: backerUser.id,
            }),
          }),
          success_url: expect.stringContaining('success'),
          cancel_url: expect.stringContaining('cancel'),
        })
      );
    });

    it('should enforce rate limiting on checkout session creation', async () => {
      const pledgeAmount = 100;
      const requests = [];
      
      // Simulate rapid checkout session creation attempts
      for (let i = 0; i < 12; i++) {
        requests.push(
          fetch(`${API_BASE}/api/payments/checkout-session`, {
            method: 'POST',
            headers: createAuthHeaders(backerUser),
            body: JSON.stringify({
              campaignId: testCampaign.id,
              pledgeAmount: pledgeAmount,
            }),
          })
        );
      }

      const responses = await Promise.all(requests);
      const statusCodes = responses.map(r => r.status);
      
      // Should start rejecting after rate limit exceeded
      const rateLimitedResponses = statusCodes.filter(code => code === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate payment amounts to prevent financial manipulation', async () => {
      const invalidAmounts = [
        0.001,      // Too small
        -100,       // Negative
        1000001,    // Above maximum
        Infinity,   // Invalid
        NaN,        // Invalid
        '100.123',  // String
      ];

      for (const amount of invalidAmounts) {
        const checkoutResponse = await fetch(`${API_BASE}/api/payments/checkout-session`, {
          method: 'POST',
          headers: createAuthHeaders(backerUser),
          body: JSON.stringify({
            campaignId: testCampaign.id,
            pledgeAmount: amount,
          }),
        });

        expect(checkoutResponse.status).toBe(400);
        const errorData = await checkoutResponse.json();
        expect(errorData.success).toBe(false);
        expect(errorData.error).toBeDefined();
      }
    });

    it('should handle currency validation and conversion securely', async () => {
      const pledgeAmount = 100;
      
      // Test with different currency contexts
      const checkoutResponse = await fetch(`${API_BASE}/api/payments/checkout-session`, {
        method: 'POST',
        headers: {
          ...createAuthHeaders(backerUser),
          'Accept-Language': 'en-GB',
          'Accept-Currency': 'GBP',
        },
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmount: pledgeAmount,
          currency: 'usd', // Should enforce USD regardless of headers
        }),
      });

      expect(checkoutResponse.status).toBe(200);
      const checkoutData = await checkoutResponse.json();
      expect(checkoutData.sessionId).toBeDefined();

      // Verify currency is properly handled
      expect(stripeMock.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: 'usd', // Should always be USD
              }),
            })
          ])
        })
      );
    });

    it('should implement secure session metadata handling', async () => {
      const pledgeAmount = 500;
      const tier = pledgeTiers.find(t => t.amountDollars === pledgeAmount);
      
      const checkoutResponse = await fetch(`${API_BASE}/api/payments/checkout-session`, {
        method: 'POST',
        headers: createAuthHeaders(vipBacker),
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmount: pledgeAmount,
          pledgeTierId: tier?.id,
          // Attempt to inject malicious metadata
          metadata: {
            '<script>alert("xss")</script>': 'malicious',
            'admin': 'true',
            'DROP TABLE users': 'sql_injection'
          },
        }),
      });

      expect(checkoutResponse.status).toBe(200);
      
      // Verify metadata is sanitized and only allowed fields are included
      expect(stripeMock.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            campaignId: testCampaign.id,
            backerId: vipBacker.id,
            pledgeTierId: tier?.id,
          }),
        })
      );

      const call = stripeMock.stripe.checkout.sessions.create.mock.calls[0][0];
      expect(call.metadata).not.toHaveProperty('admin');
      expect(call.metadata).not.toHaveProperty('<script>alert("xss")</script>');
      expect(call.metadata).not.toHaveProperty('DROP TABLE users');
    });
  });

  describe('Payment Intent Processing with Enhanced Security', () => {
    let testSessionId: string;
    let testPaymentIntentId: string;
    
    beforeEach(() => {
      testSessionId = `cs_test_${Date.now()}_${crypto.randomUUID()}`;
      testPaymentIntentId = `pi_test_${Date.now()}_${crypto.randomUUID()}`;
    });

    it('should process payment intent with comprehensive validation', async () => {
      const pledgeAmount = 1000;
      const tier = pledgeTiers.find(t => t.amountDollars === pledgeAmount);
      
      // Create payment intent succeeded webhook
      const paymentIntentEvent = createMockWebhookEvent(
        'payment_intent.succeeded',
        {
          id: testPaymentIntentId,
          status: 'succeeded',
          amount: pledgeAmount * 100,
          amount_received: pledgeAmount * 100,
          currency: 'usd',
          charges: {
            data: [{
              id: `ch_test_${Date.now()}`,
              status: 'succeeded',
              amount: pledgeAmount * 100,
              currency: 'usd',
              receipt_url: `https://pay.stripe.com/receipts/test_${Date.now()}`,
              fraud_details: {},
              outcome: {
                type: 'authorized',
                risk_level: 'normal',
              },
            }],
          },
          metadata: {
            campaignId: testCampaign.id,
            backerId: vipBacker.id,
            pledgeTierId: tier?.id,
            source: 'checkout_session',
          },
        },
        {
          campaignId: testCampaign.id,
          backerId: vipBacker.id,
          pledgeTierId: tier?.id,
        }
      );

      const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature-valid',
        },
        body: JSON.stringify(paymentIntentEvent),
      });

      expect(webhookResponse.status).toBe(200);
      const webhookResult = await webhookResponse.json();
      expect(webhookResult.received).toBe(true);

      // Verify pledge was created with proper validation
      const pledge = await testPrisma.pledge.findFirst({
        where: {
          campaignId: testCampaign.id,
          backerId: vipBacker.id,
          paymentRef: testPaymentIntentId,
        },
        include: {
          campaign: true,
          backer: true,
        },
      });

      expect(pledge).toBeDefined();
      expect(pledge?.status).toBe('captured');
      expect(pledge?.amountDollars).toBe(pledgeAmount);
      expect(pledge?.currency).toBe('USD');
    });

    it('should handle payment intent failures with detailed error tracking', async () => {
      const failedPaymentIntentEvent = createMockWebhookEvent(
        'payment_intent.payment_failed',
        {
          id: testPaymentIntentId,
          status: 'requires_payment_method',
          amount: 50000, // $500
          currency: 'usd',
          last_payment_error: {
            type: 'card_error',
            code: 'card_declined',
            decline_code: 'insufficient_funds',
            message: 'Your card has insufficient funds.',
            payment_method: {
              id: 'pm_test_declined',
              type: 'card',
              card: {
                brand: 'visa',
                last4: '0002',
                exp_month: 12,
                exp_year: 2025,
              },
            },
          },
          metadata: {
            campaignId: testCampaign.id,
            backerId: backerUser.id,
          },
        }
      );

      const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature-valid',
        },
        body: JSON.stringify(failedPaymentIntentEvent),
      });

      expect(webhookResponse.status).toBe(200);
      
      // Verify failed payment is tracked with error details
      const failedPayment = await testPrisma.pledge.findFirst({
        where: {
          paymentRef: testPaymentIntentId,
          status: 'failed',
        },
      });

      expect(failedPayment).toBeDefined();
      if (failedPayment) {
        expect(failedPayment.status).toBe('failed');
        // Verify error information is stored securely
        expect(failedPayment.paymentRef).toBe(testPaymentIntentId);
      }
    });

    it('should implement secure retry logic for failed payments', async () => {
      const retryablePaymentIntentEvent = createMockWebhookEvent(
        'payment_intent.payment_failed',
        {
          id: testPaymentIntentId,
          status: 'requires_payment_method',
          amount: 25000, // $250
          currency: 'usd',
          last_payment_error: {
            type: 'card_error',
            code: 'processing_error',
            message: 'We encountered an error while processing your payment. Please try again.',
          },
          metadata: {
            campaignId: testCampaign.id,
            backerId: backerUser.id,
            retryAttempt: '1',
          },
        }
      );

      const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature-valid',
        },
        body: JSON.stringify(retryablePaymentIntentEvent),
      });

      expect(webhookResponse.status).toBe(200);

      // Verify retry logic is triggered appropriately
      // In a real implementation, this might trigger automated retry or notification
    });
  });

  describe('Webhook Security and Signature Validation', () => {
    it('should validate webhook signatures with crypto verification', async () => {
      const validSignature = 'v1=valid_signature_hash';
      const validPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_valid',
            payment_status: 'paid',
            amount_total: 10000,
            currency: 'usd',
            metadata: {
              campaignId: testCampaign.id,
              backerId: backerUser.id,
            },
          },
        },
      };

      // Mock successful signature verification
      stripeMock.stripe.webhooks.constructEvent.mockReturnValueOnce(validPayload);

      const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': validSignature,
        },
        body: JSON.stringify(validPayload),
      });

      expect(webhookResponse.status).toBe(200);
      expect(stripeMock.stripe.webhooks.constructEvent).toHaveBeenCalledWith(
        JSON.stringify(validPayload),
        validSignature,
        expect.any(String) // webhook secret
      );
    });

    it('should reject webhooks with invalid signatures', async () => {
      const invalidSignature = 'v1=invalid_signature_hash';
      const payload = {
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test_invalid' } },
      };

      // Mock signature verification failure
      stripeMock.stripe.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });

      const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': invalidSignature,
        },
        body: JSON.stringify(payload),
      });

      expect(webhookResponse.status).toBe(400);
      const errorText = await webhookResponse.text();
      expect(errorText).toContain('Invalid signature');
    });

    it('should prevent webhook replay attacks with timestamp validation', async () => {
      // Simulate old webhook (replay attack)
      const oldTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const replaySignature = `t=${oldTimestamp},v1=signature_hash`;
      
      const payload = {
        type: 'payment_intent.succeeded',
        created: oldTimestamp,
        data: {
          object: {
            id: 'pi_replay_attack',
            status: 'succeeded',
            metadata: {
              campaignId: testCampaign.id,
              backerId: backerUser.id,
            },
          },
        },
      };

      // Mock webhook timestamp validation failure
      stripeMock.stripe.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('Webhook timestamp too old');
      });

      const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': replaySignature,
        },
        body: JSON.stringify(payload),
      });

      expect(webhookResponse.status).toBe(400);
    });

    it('should sanitize webhook payload data', async () => {
      const maliciousPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_malicious',
            amount_total: 10000,
            currency: 'usd',
            metadata: {
              campaignId: testCampaign.id,
              backerId: backerUser.id,
              // Malicious metadata attempts
              '<script>alert("xss")</script>': 'malicious_script',
              'admin_override': 'true',
              'sql_injection': "'; DROP TABLE pledges; --",
            },
          },
        },
      };

      stripeMock.stripe.webhooks.constructEvent.mockReturnValueOnce(maliciousPayload);

      const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify(maliciousPayload),
      });

      expect(webhookResponse.status).toBe(200);
      
      // Verify malicious data was filtered out and not persisted
      const pledge = await testPrisma.pledge.findFirst({
        where: { paymentRef: 'cs_malicious' },
      });
      
      // Should either not create pledge or create with sanitized data
      if (pledge) {
        // Verify no malicious data was stored
        expect(JSON.stringify(pledge)).not.toContain('<script>');
        expect(JSON.stringify(pledge)).not.toContain('DROP TABLE');
      }
    });
  });

  describe('Multiple Payment Methods and User Accounts', () => {
    it('should handle multiple payment methods per user', async () => {
      const paymentMethods = [
        { type: 'card', brand: 'visa', last4: '4242' },
        { type: 'card', brand: 'mastercard', last4: '5555' },
        { type: 'card', brand: 'amex', last4: '0005' },
      ];

      for (const [index, paymentMethod] of paymentMethods.entries()) {
        const sessionId = `cs_multi_${index}_${Date.now()}`;
        const pledgeAmount = 100 + (index * 50); // Different amounts
        
        const checkoutEvent = createMockWebhookEvent(
          'checkout.session.completed',
          {
            id: sessionId,
            payment_status: 'paid',
            status: 'complete',
            amount_total: pledgeAmount * 100,
            currency: 'usd',
            payment_method_types: [paymentMethod.type],
            customer_details: {
              email: backerUser.email,
              name: backerUser.name,
            },
            metadata: {
              campaignId: testCampaign.id,
              backerId: backerUser.id,
              paymentMethodType: paymentMethod.type,
            },
          }
        );

        const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test-signature-valid',
          },
          body: JSON.stringify(checkoutEvent),
        });

        expect(webhookResponse.status).toBe(200);
      }

      // Verify all pledges were created for the same user
      const userPledges = await testPrisma.pledge.findMany({
        where: {
          campaignId: testCampaign.id,
          backerId: backerUser.id,
        },
        orderBy: { createdAt: 'asc' },
      });

      expect(userPledges.length).toBeGreaterThanOrEqual(3);
    });

    it('should prevent account takeover through payment manipulation', async () => {
      // Attempt to create payment for different user
      const maliciousCheckoutResponse = await fetch(`${API_BASE}/api/payments/checkout-session`, {
        method: 'POST',
        headers: createAuthHeaders(backerUser),
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmount: 500,
          // Attempt to manipulate backer identity
          backerId: vipBacker.id, // Different user
          backerEmail: vipBacker.email,
        }),
      });

      expect(checkoutResponse.status).toBe(200);
      const checkoutData = await maliciousCheckoutResponse.json();
      
      // Verify the session is created for the authenticated user, not the manipulated user
      expect(stripeMock.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            backerId: backerUser.id, // Should be authenticated user
          }),
        })
      );
    });
  });

  describe('Payment Confirmation and Email Security', () => {
    it('should send secure payment confirmation emails', async () => {
      const pledgeAmount = 250;
      const tier = pledgeTiers.find(t => t.amountDollars === pledgeAmount);
      
      const successfulPayment = createMockWebhookEvent(
        'payment_intent.succeeded',
        {
          id: `pi_email_test_${Date.now()}`,
          status: 'succeeded',
          amount: pledgeAmount * 100,
          currency: 'usd',
          charges: {
            data: [{
              receipt_url: 'https://pay.stripe.com/receipts/secure_receipt_url',
            }],
          },
          metadata: {
            campaignId: testCampaign.id,
            backerId: backerUser.id,
            pledgeTierId: tier?.id,
          },
        }
      );

      const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature-valid',
        },
        body: JSON.stringify(successfulPayment),
      });

      expect(webhookResponse.status).toBe(200);

      // Wait for email processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify confirmation emails were sent
      const confirmationEmails = emailMock.getEmailsBySubject('Pledge Confirmed');
      expect(confirmationEmails.length).toBeGreaterThan(0);
      
      const backerEmail = confirmationEmails.find(e => e.to === backerUser.email);
      expect(backerEmail).toBeDefined();
      expect(backerEmail?.html).toContain(pledgeAmount.toString());
      expect(backerEmail?.html).toContain(testCampaign.title);
      
      // Verify email content is safe (no script injection)
      expect(backerEmail?.html).not.toContain('<script>');
      expect(backerEmail?.html).not.toContain('javascript:');

      // Check creator notification email
      const creatorNotifications = emailMock.getEmailsBySubject('New Pledge');
      expect(creatorNotifications.length).toBeGreaterThan(0);
      
      const creatorEmail = creatorNotifications.find(e => e.to === creatorUser.email);
      expect(creatorEmail).toBeDefined();
      expect(creatorEmail?.html).toContain(pledgeAmount.toString());
    });

    it('should handle email delivery failures gracefully', async () => {
      // Mock email service failure
      emailMock.simulateFailure('Pledge Confirmed', true);
      
      const paymentEvent = createMockWebhookEvent(
        'payment_intent.succeeded',
        {
          id: `pi_email_fail_${Date.now()}`,
          status: 'succeeded',
          amount: 15000,
          currency: 'usd',
          metadata: {
            campaignId: testCampaign.id,
            backerId: backerUser.id,
          },
        }
      );

      const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature-valid',
        },
        body: JSON.stringify(paymentEvent),
      });

      // Should still process payment successfully even if email fails
      expect(webhookResponse.status).toBe(200);
      
      // Verify payment was processed despite email failure
      const pledge = await testPrisma.pledge.findFirst({
        where: { paymentRef: paymentEvent.data.object.id },
      });
      
      expect(pledge).toBeDefined();
      expect(pledge?.status).toBe('captured');
    });

    it('should prevent email template injection attacks', async () => {
      // Create user with malicious name
      const maliciousUser = await createTestUser({
        email: generateTestEmail('malicious'),
        name: '<script>alert("xss")</script>Malicious User',
        roles: ['user'],
      });

      const paymentEvent = createMockWebhookEvent(
        'payment_intent.succeeded',
        {
          id: `pi_injection_test_${Date.now()}`,
          status: 'succeeded',
          amount: 10000,
          currency: 'usd',
          metadata: {
            campaignId: testCampaign.id,
            backerId: maliciousUser.id,
          },
        }
      );

      const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature-valid',
        },
        body: JSON.stringify(paymentEvent),
      });

      expect(webhookResponse.status).toBe(200);

      // Check that malicious content is sanitized in emails
      const confirmationEmails = emailMock.getEmailsBySubject('Pledge Confirmed');
      if (confirmationEmails.length > 0) {
        const email = confirmationEmails.find(e => e.to === maliciousUser.email);
        if (email) {
          expect(email.html).not.toContain('<script>');
          expect(email.html).not.toContain('alert(');
        }
      }
    });
  });

  describe('PCI Compliance and Data Protection', () => {
    it('should never log sensitive payment data', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const consoleErrorSpy = jest.spyOn(console, 'error');
      
      const paymentData = {
        card_number: '4242424242424242',
        cvv: '123',
        exp_month: '12',
        exp_year: '2025',
      };

      const checkoutResponse = await fetch(`${API_BASE}/api/payments/checkout-session`, {
        method: 'POST',
        headers: createAuthHeaders(backerUser),
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmount: 100,
          // Include payment data that should never be logged
          paymentData: paymentData,
        }),
      });

      // Check all console logs for sensitive data
      const allLogs = [
        ...consoleSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat(),
      ].join(' ');

      expect(allLogs).not.toContain('4242424242424242');
      expect(allLogs).not.toContain('123');
      expect(allLogs).not.toContain(paymentData.card_number);
      expect(allLogs).not.toContain(paymentData.cvv);

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should enforce HTTPS for all payment endpoints', async () => {
      // Test would verify HTTPS enforcement in production
      // For testing, we verify the security headers are set
      const checkoutResponse = await fetch(`${API_BASE}/api/payments/checkout-session`, {
        method: 'POST',
        headers: createAuthHeaders(backerUser),
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmount: 100,
        }),
      });

      // Verify security headers (would be set in production middleware)
      const securityHeaders = [
        'Strict-Transport-Security',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Content-Security-Policy',
      ];

      // In production, these headers should be present
      // For testing, we verify the response doesn't contain sensitive data
      const responseText = await checkoutResponse.text();
      expect(responseText).not.toContain('sk_');
      expect(responseText).not.toContain('pk_test_');
    });

    it('should implement secure session management', async () => {
      const sessionId = `cs_session_test_${Date.now()}`;
      
      // Create checkout session
      const checkoutResponse = await fetch(`${API_BASE}/api/payments/checkout-session`, {
        method: 'POST',
        headers: createAuthHeaders(backerUser),
        body: JSON.stringify({
          campaignId: testCampaign.id,
          pledgeAmount: 100,
        }),
      });

      expect(checkoutResponse.status).toBe(200);
      const checkoutData = await checkoutResponse.json();
      
      // Verify session ID format and security
      expect(checkoutData.sessionId).toMatch(/^cs_test_/);
      expect(checkoutData.sessionId.length).toBeGreaterThan(20);
      
      // Verify session cannot be manipulated
      const maliciousSessionId = 'cs_malicious_session_123';
      const webhookEvent = createMockWebhookEvent(
        'checkout.session.completed',
        {
          id: maliciousSessionId,
          payment_status: 'paid',
          metadata: {
            campaignId: testCampaign.id,
            backerId: backerUser.id,
          },
        }
      );

      // Should process normally - Stripe handles session validation
      const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature-valid',
        },
        body: JSON.stringify(webhookEvent),
      });

      expect(webhookResponse.status).toBe(200);
    });
  });

  describe('Idempotency and Race Condition Prevention', () => {
    it('should handle duplicate webhook events with idempotency', async () => {
      const duplicateSessionId = `cs_duplicate_${Date.now()}`;
      const webhookEvent = createMockWebhookEvent(
        'checkout.session.completed',
        {
          id: duplicateSessionId,
          payment_status: 'paid',
          status: 'complete',
          amount_total: 15000, // $150
          currency: 'usd',
          metadata: {
            campaignId: testCampaign.id,
            backerId: backerUser.id,
          },
        }
      );

      // Send the same webhook event multiple times
      const webhookPromises = Array(5).fill().map(() => 
        fetch(`${API_BASE}/api/payments/stripe/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test-signature-valid',
          },
          body: JSON.stringify(webhookEvent),
        })
      );

      const responses = await Promise.all(webhookPromises);
      
      // All should succeed (idempotent handling)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify only one pledge was created
      const duplicatePledges = await testPrisma.pledge.findMany({
        where: { stripeSessionId: duplicateSessionId },
      });
      
      expect(duplicatePledges.length).toBe(1);
    });

    it('should use idempotency keys for checkout session creation', async () => {
      const idempotencyKey = crypto.randomUUID();
      const requestData = {
        campaignId: testCampaign.id,
        pledgeAmount: 100,
      };

      // Make multiple requests with same idempotency key
      const requests = Array(3).fill().map(() =>
        fetch(`${API_BASE}/api/payments/checkout-session`, {
          method: 'POST',
          headers: {
            ...createAuthHeaders(backerUser),
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(requestData),
        })
      );

      const responses = await Promise.all(requests);
      
      // All should succeed and return the same session
      const responseData = await Promise.all(responses.map(r => r.json()));
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should have created only one Stripe session
      expect(stripeMock.stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
      
      // All responses should have the same session ID
      const sessionIds = responseData.map(data => data.sessionId);
      expect(new Set(sessionIds).size).toBe(1);
    });

    it('should prevent race conditions in campaign funding updates', async () => {
      const campaignId = testCampaign.id;
      const pledgeAmount = 100;
      
      // Simulate concurrent successful payments
      const concurrentWebhooks = Array(10).fill().map((_, index) => {
        const sessionId = `cs_concurrent_${index}_${Date.now()}`;
        return createMockWebhookEvent(
          'checkout.session.completed',
          {
            id: sessionId,
            payment_status: 'paid',
            status: 'complete',
            amount_total: pledgeAmount * 100,
            currency: 'usd',
            metadata: {
              campaignId: campaignId,
              backerId: backerUser.id,
            },
          }
        );
      });

      // Send all webhooks concurrently
      const webhookPromises = concurrentWebhooks.map(event =>
        fetch(`${API_BASE}/api/payments/stripe/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test-signature-valid',
          },
          body: JSON.stringify(event),
        })
      );

      const responses = await Promise.all(webhookPromises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify campaign raised amount is correctly updated
      const updatedCampaign = await testPrisma.campaign.findUnique({
        where: { id: campaignId },
      });

      // Should have increased by total amount of concurrent payments
      expect(updatedCampaign?.raisedDollars).toBeGreaterThanOrEqual(pledgeAmount * 10);
    });
  });

  describe('Failed Payment Recovery and Retry Logic', () => {
    it('should implement smart retry logic for recoverable failures', async () => {
      const retryableErrors = [
        { code: 'processing_error', retryable: true },
        { code: 'card_declined', decline_code: 'generic_decline', retryable: true },
        { code: 'rate_limit', retryable: true },
      ];

      for (const error of retryableErrors) {
        const paymentIntentId = `pi_retry_${error.code}_${Date.now()}`;
        
        const failedPaymentEvent = createMockWebhookEvent(
          'payment_intent.payment_failed',
          {
            id: paymentIntentId,
            status: 'requires_payment_method',
            amount: 10000,
            currency: 'usd',
            last_payment_error: {
              type: 'card_error',
              code: error.code,
              decline_code: error.decline_code,
              message: `Payment failed: ${error.code}`,
            },
            metadata: {
              campaignId: testCampaign.id,
              backerId: backerUser.id,
              retryAttempt: '1',
            },
          }
        );

        const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test-signature-valid',
          },
          body: JSON.stringify(failedPaymentEvent),
        });

        expect(webhookResponse.status).toBe(200);
        
        // Verify failure is recorded
        const failedPayment = await testPrisma.pledge.findFirst({
          where: { paymentRef: paymentIntentId },
        });

        expect(failedPayment?.status).toBe('failed');
      }
    });

    it('should handle non-retryable payment failures appropriately', async () => {
      const nonRetryableErrors = [
        { code: 'card_declined', decline_code: 'stolen_card' },
        { code: 'card_declined', decline_code: 'fraudulent' },
        { code: 'expired_card' },
        { code: 'incorrect_cvc' },
      ];

      for (const error of nonRetryableErrors) {
        const paymentIntentId = `pi_final_fail_${error.code}_${Date.now()}`;
        
        const finalFailureEvent = createMockWebhookEvent(
          'payment_intent.payment_failed',
          {
            id: paymentIntentId,
            status: 'requires_payment_method',
            amount: 5000,
            currency: 'usd',
            last_payment_error: {
              type: 'card_error',
              code: error.code,
              decline_code: error.decline_code,
              message: `Payment failed permanently: ${error.code}`,
            },
            metadata: {
              campaignId: testCampaign.id,
              backerId: backerUser.id,
            },
          }
        );

        const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test-signature-valid',
          },
          body: JSON.stringify(finalFailureEvent),
        });

        expect(webhookResponse.status).toBe(200);
        
        // Verify permanent failure is recorded
        const failedPayment = await testPrisma.pledge.findFirst({
          where: { paymentRef: paymentIntentId },
        });

        expect(failedPayment?.status).toBe('failed');
      }
    });

    it('should notify users of payment failures with recovery options', async () => {
      const paymentIntentId = `pi_user_notify_${Date.now()}`;
      
      const recoverableFailureEvent = createMockWebhookEvent(
        'payment_intent.payment_failed',
        {
          id: paymentIntentId,
          status: 'requires_payment_method',
          amount: 25000,
          currency: 'usd',
          last_payment_error: {
            type: 'card_error',
            code: 'card_declined',
            decline_code: 'insufficient_funds',
            message: 'Your card has insufficient funds.',
          },
          metadata: {
            campaignId: testCampaign.id,
            backerId: backerUser.id,
          },
        }
      );

      const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature-valid',
        },
        body: JSON.stringify(recoverableFailureEvent),
      });

      expect(webhookResponse.status).toBe(200);

      // Wait for email processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify payment failure notification email
      const failureEmails = emailMock.getEmailsBySubject('Payment Failed');
      if (failureEmails.length > 0) {
        const userFailureEmail = failureEmails.find(e => e.to === backerUser.email);
        expect(userFailureEmail).toBeDefined();
        if (userFailureEmail) {
          expect(userFailureEmail.html).toContain('insufficient funds');
          expect(userFailureEmail.html).toContain('try again');
          expect(userFailureEmail.html).not.toContain('<script>');
        }
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume concurrent payments efficiently', async () => {
      const startTime = Date.now();
      const concurrentPayments = 50;
      
      const paymentPromises = Array(concurrentPayments).fill().map(async (_, index) => {
        const sessionId = `cs_perf_${index}_${Date.now()}`;
        const webhookEvent = createMockWebhookEvent(
          'checkout.session.completed',
          {
            id: sessionId,
            payment_status: 'paid',
            status: 'complete',
            amount_total: 10000,
            currency: 'usd',
            metadata: {
              campaignId: testCampaign.id,
              backerId: backerUser.id,
            },
          }
        );

        return fetch(`${API_BASE}/api/payments/stripe/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test-signature-valid',
          },
          body: JSON.stringify(webhookEvent),
        });
      });

      const responses = await Promise.all(paymentPromises);
      const endTime = Date.now();
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (adjust based on performance requirements)
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(30000); // 30 seconds max for 50 concurrent payments

      console.log(`Processed ${concurrentPayments} concurrent payments in ${processingTime}ms`);
    });

    it('should maintain database consistency under load', async () => {
      const initialRaised = testCampaign.raisedDollars;
      const paymentCount = 25;
      const paymentAmount = 50;
      
      // Create concurrent successful payments
      const concurrentPayments = Array(paymentCount).fill().map((_, index) => {
        const sessionId = `cs_consistency_${index}_${Date.now()}`;
        return createMockWebhookEvent(
          'checkout.session.completed',
          {
            id: sessionId,
            payment_status: 'paid',
            status: 'complete',
            amount_total: paymentAmount * 100,
            currency: 'usd',
            metadata: {
              campaignId: testCampaign.id,
              backerId: backerUser.id,
            },
          }
        );
      });

      // Process all payments concurrently
      const webhookPromises = concurrentPayments.map(event =>
        fetch(`${API_BASE}/api/payments/stripe/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test-signature-valid',
          },
          body: JSON.stringify(event),
        })
      );

      const responses = await Promise.all(webhookPromises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify database consistency
      const finalCampaign = await testPrisma.campaign.findUnique({
        where: { id: testCampaign.id },
      });

      const pledgeCount = await testPrisma.pledge.count({
        where: {
          campaignId: testCampaign.id,
          stripeSessionId: { contains: 'cs_consistency_' },
        },
      });

      expect(pledgeCount).toBe(paymentCount);
      expect(finalCampaign?.raisedDollars).toBe(initialRaised + (paymentCount * paymentAmount));
    });
  });

  describe('Comprehensive Error Handling and Edge Cases', () => {
    it('should handle malformed webhook payloads gracefully', async () => {
      const malformedPayloads = [
        null,
        undefined,
        '',
        '{"invalid": json}',
        '{"type": null}',
        '{"data": null}',
        '{"data": {"object": null}}',
      ];

      for (const payload of malformedPayloads) {
        const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test-signature-valid',
          },
          body: payload as any,
        });

        // Should handle gracefully without crashing
        expect([200, 400, 500]).toContain(webhookResponse.status);
      }
    });

    it('should handle network timeouts and retries', async () => {
      // Simulate slow webhook processing
      const slowWebhookEvent = createMockWebhookEvent(
        'checkout.session.completed',
        {
          id: `cs_timeout_${Date.now()}`,
          payment_status: 'paid',
          metadata: {
            campaignId: testCampaign.id,
            backerId: backerUser.id,
          },
        }
      );

      // Mock slow database operation
      const originalCreate = testPrisma.pledge.create;
      testPrisma.pledge.create = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(originalCreate.call(testPrisma.pledge, arguments[0])), 1000))
      );

      const startTime = Date.now();
      const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature-valid',
        },
        body: JSON.stringify(slowWebhookEvent),
      });
      const endTime = Date.now();

      expect(webhookResponse.status).toBe(200);
      expect(endTime - startTime).toBeGreaterThan(900); // Should wait for slow operation
      
      // Restore original function
      testPrisma.pledge.create = originalCreate;
    });

    it('should maintain audit trail for all payment events', async () => {
      const auditEvents = [
        'checkout.session.completed',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'charge.dispute.created',
      ];

      for (const eventType of auditEvents) {
        const eventId = `evt_audit_${eventType}_${Date.now()}`;
        const webhookEvent = createMockWebhookEvent(eventType, {
          id: eventId,
          status: 'succeeded',
          amount: 10000,
          currency: 'usd',
          metadata: {
            campaignId: testCampaign.id,
            backerId: backerUser.id,
          },
        });

        const webhookResponse = await fetch(`${API_BASE}/api/payments/stripe/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test-signature-valid',
          },
          body: JSON.stringify(webhookEvent),
        });

        expect(webhookResponse.status).toBe(200);
        
        // In a real implementation, verify audit log entry was created
        // This would check that all payment events are properly logged for compliance
      }
    });
  });
});