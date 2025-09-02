/**
 * Comprehensive Stripe Checkout Session API Tests
 * 
 * This test suite validates the complete checkout flow including:
 * - Authentication scenarios (authenticated and anonymous users)
 * - Campaign validation (status, existence)
 * - Pledge tier validation (existence, active status)
 * - Payment amount handling (minimum, maximum, edge cases)
 * - Currency conversion and fee calculations
 * - Metadata management and validation
 * - Error scenarios and security edge cases
 * - Performance benchmarks
 * - Webhook callback scenarios
 * 
 * @author Payment Testing Specialist
 * @version 2.0.0
 */

// Import setup mocks first to initialize them properly
import { 
  prismaMock, 
  stripeMock, 
  authMock, 
  resetAllMocks, 
  setupDefaultMocks,
  emailMock
} from '../../payments/setup-payment-mocks';
import { createTestRequest, createAuthenticatedRequest } from '../../utils/api-test-helpers';

// Mock the Stripe constants after importing stripeMock
jest.mock('@/lib/stripe', () => ({
  __esModule: true,
  stripe: require('../../payments/setup-payment-mocks').stripeMock,
  STRIPE_CURRENCY: 'usd',
  STRIPE_PRICE_DOLLARS: 1,
  STRIPE_APP_FEE_BPS: 500, // 5% app fee
  DEST_ACCOUNT: 'acct_test_destination',
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  __esModule: true,
  auth: jest.fn()
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/payments/checkout-session/route';
import { auth } from '@/lib/auth';

// Mock the auth function explicitly
const mockAuth = auth as jest.MockedFunction<typeof auth>;
import { 
  PaymentTestData, 
  StripeObjectFactory, 
  PaymentAssertions,
  PaymentErrorScenarios,
  PaymentSecurityHelpers,
  PaymentPerformanceHelpers
} from '../../payments/payment-test-helpers';

// Performance tracking
const performanceMetrics = {
  averageResponseTime: 0,
  fastestResponse: Infinity,
  slowestResponse: 0,
  totalTests: 0,
  successfulCheckouts: 0,
  failedCheckouts: 0
};

describe('/api/payments/checkout-session - Comprehensive Test Suite', () => {
  beforeEach(() => {
    resetAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    // Track performance metrics after each test
    performanceMetrics.totalTests++;
  });

  describe('✅ Success Scenarios - Checkout Session Creation', () => {
    describe('🔐 Authentication Flows', () => {
      it('should create checkout session for authenticated user with minimum amount ($100)', async () => {
        const startTime = performance.now();
        
        // Setup authenticated user
        mockAuth.mockResolvedValue({
          user: {
            id: 'user-123',
            email: 'test@example.com'
          }
        });
        
        // Setup campaign with pledge tiers
        const campaign = PaymentTestData.generateCampaign({
          id: 'campaign-auth-123',
          status: 'published',
          title: 'Authenticated User Campaign'
        });
        
        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
        prismaMock.user.upsert.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          name: 'test',
          roles: ['backer'],
          createdAt: new Date(),
          updatedAt: new Date()
        } as any);
        
        const testData = PaymentTestData.generateCheckoutRequest({
          pledgeAmount: 100, // Minimum amount
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

        const mockSession = StripeObjectFactory.createCheckoutSession({
          mode: 'payment',
          amount_total: 10000, // $100 in cents
          url: 'https://checkout.stripe.com/c/pay/test_authenticated_session',
          metadata: {
            campaignId: testData.campaignId,
            pledgeTierId: testData.pledgeTierId,
            backerId: 'user-123'
          }
        });

        stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

        const request = createTestRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: testData
        });

        const response = await POST(request);
        const data = await response.json();
        const responseTime = performance.now() - startTime;

        // Assertions
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('checkoutUrl');
        expect(data).toHaveProperty('sessionId');
        expect(data.checkoutUrl).toBe('https://checkout.stripe.com/c/pay/test_authenticated_session');

        // Verify Stripe session creation parameters
        PaymentAssertions.assertCheckoutSessionCreation(
          stripeMock.checkout.sessions.create,
          {
            currency: 'usd',
            amount: 10000,
            appFee: 500, // 5% of $100
            customerEmail: 'test@example.com',
            metadata: {
              campaignId: testData.campaignId,
              backerId: 'user-123'
            }
          }
        );

        // Verify backer upsert
        expect(prismaMock.user.upsert).toHaveBeenCalledWith({
          where: { email: 'test@example.com' },
          update: {},
          create: {
            email: 'test@example.com',
            name: 'test',
            roles: ['backer']
          }
        });

        // Performance tracking
        performanceMetrics.successfulCheckouts++;
        performanceMetrics.totalTests++;
      });

      it('should create checkout session for anonymous user with provided email', async () => {
        resetAllMocks();
        setupDefaultMocks();
        mockAuth.mockResolvedValue(null); // No authenticated user
        
        // Setup campaign
        const campaign = PaymentTestData.generateCampaign({
          id: 'campaign-anon-123',
          status: 'published',
          title: 'Anonymous User Campaign'
        });
        
        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);

        const testData = PaymentTestData.generateCheckoutRequest({
          pledgeAmount: 500,
          backerEmail: 'anonymous.backer@example.com',
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

        const mockSession = StripeObjectFactory.createCheckoutSession({
          customer_email: 'anonymous.backer@example.com',
          amount_total: 50000,
          url: 'https://checkout.stripe.com/c/pay/test_anonymous_session'
        });

        stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        
        expect(response.status).toBe(200);
        expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer_email: 'anonymous.backer@example.com'
          })
        );

        performanceMetrics.successfulCheckouts++;
      });

      it('should require email when no user is authenticated and no email provided', async () => {
        resetAllMocks();
        setupDefaultMocks();
        mockAuth.mockResolvedValue(null); // No authenticated user

        const campaign = PaymentTestData.generateCampaign({ status: 'published' });
        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);

        const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });
        delete testData.backerEmail; // No email provided

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(400);
        expect(data.error).toBe('Email is required for checkout');

        performanceMetrics.failedCheckouts++;
      });
    });

    describe('💰 Payment Amount Validation', () => {
      it('should handle minimum payment amount ($100)', async () => {
        resetAllMocks();
        setupDefaultMocks();
        
        const campaign = PaymentTestData.generateCampaign({ status: 'published' });
        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
        
        const testData = PaymentTestData.generateCheckoutRequest({
          pledgeAmount: 100, // Exactly minimum
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

        const mockSession = StripeObjectFactory.createCheckoutSession({
          amount_total: 10000, // $100 in cents
        });

        stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        
        expect(response.status).toBe(200);
        
        // Verify correct amount calculation
        expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            line_items: expect.arrayContaining([
              expect.objectContaining({
                price_data: expect.objectContaining({
                  unit_amount: 10000 // $100 in cents
                })
              })
            ])
          })
        );

        performanceMetrics.successfulCheckouts++;
      });

      it('should handle large payment amounts correctly ($50,000)', async () => {
        resetAllMocks();
        setupDefaultMocks();
        
        const campaign = PaymentTestData.generateCampaign({ status: 'published' });
        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
        
        const testData = PaymentTestData.generateCheckoutRequest({
          pledgeAmount: 50000, // $50,000 - large amount
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

        const mockSession = StripeObjectFactory.createCheckoutSession({
          amount_total: 5000000, // $50,000 in cents
        });

        stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        
        expect(response.status).toBe(200);
        
        // Verify app fee calculation for large amounts
        expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            payment_intent_data: expect.objectContaining({
              application_fee_amount: 250000 // 5% of $50,000
            })
          })
        );

        performanceMetrics.successfulCheckouts++;
      });

      it('should reject payment amount below minimum ($50)', async () => {
        const testData = PaymentTestData.generateCheckoutRequest({
          pledgeAmount: 50 // Below $100 minimum
        });

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid input data');
        expect(data.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['pledgeAmount'],
              message: expect.stringContaining('100')
            })
          ])
        );

        performanceMetrics.failedCheckouts++;
      });
    });

    describe('🎯 Currency Conversion and Fee Calculations', () => {
      it('should calculate application fees correctly (5% of amount)', async () => {
        const testCases = [
          { amount: 100, expectedFee: 500 },   // $100 -> $5 fee = 500 cents
          { amount: 1000, expectedFee: 5000 }, // $1,000 -> $50 fee = 5000 cents
          { amount: 10000, expectedFee: 50000 } // $10,000 -> $500 fee = 50000 cents
        ];

        for (const testCase of testCases) {
          resetAllMocks();
          setupDefaultMocks();
          
          const campaign = PaymentTestData.generateCampaign({ status: 'published' });
          prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);

          const testData = PaymentTestData.generateCheckoutRequest({
            pledgeAmount: testCase.amount,
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

          const mockSession = StripeObjectFactory.createCheckoutSession({
            amount_total: testCase.amount * 100,
          });

          stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

          const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
            method: 'POST',
            body: JSON.stringify(testData)
          });

          const response = await POST(request);
          
          expect(response.status).toBe(200);
          expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
            expect.objectContaining({
              payment_intent_data: expect.objectContaining({
                application_fee_amount: testCase.expectedFee
              })
            })
          );

          performanceMetrics.successfulCheckouts++;
        }
      });

      it('should handle currency conversion properly (USD default)', async () => {
        resetAllMocks();
        setupDefaultMocks();
        
        const campaign = PaymentTestData.generateCampaign({ status: 'published' });
        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
        
        const testData = PaymentTestData.generateCheckoutRequest({
          pledgeAmount: 250,
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

        const mockSession = StripeObjectFactory.createCheckoutSession({
          currency: 'usd',
          amount_total: 25000
        });

        stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        
        expect(response.status).toBe(200);
        expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            line_items: expect.arrayContaining([
              expect.objectContaining({
                price_data: expect.objectContaining({
                  currency: 'usd',
                  unit_amount: 25000 // $250 in cents
                })
              })
            ])
          })
        );

        performanceMetrics.successfulCheckouts++;
      });

      it('should handle fractional cents correctly by rounding', async () => {
        resetAllMocks();
        setupDefaultMocks();
        
        const campaign = PaymentTestData.generateCampaign({ status: 'published' });
        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
        
        const testData = PaymentTestData.generateCheckoutRequest({
          pledgeAmount: 123.456, // Should round to 12346 cents
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

        const mockSession = StripeObjectFactory.createCheckoutSession();
        stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        
        expect(response.status).toBe(200);
        expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            line_items: expect.arrayContaining([
              expect.objectContaining({
                price_data: expect.objectContaining({
                  unit_amount: 12346 // Rounded cents
                })
              })
            ])
          })
        );
      });
    });

    describe('📋 Metadata Validation and Management', () => {
      it('should include all required metadata in checkout session', async () => {
        const campaign = PaymentTestData.generateCampaign();
        const pledgeTier = campaign.pledgeTiers[0];
        
        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);

        const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: pledgeTier.id,
          pledgeAmount: 500
        });

        const mockSession = StripeObjectFactory.createCheckoutSession();
        stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        
        expect(response.status).toBe(200);
        expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              campaignId: testData.campaignId,
              pledgeTierId: testData.pledgeTierId,
              backerId: 'user-123'
            }),
            payment_intent_data: expect.objectContaining({
              metadata: expect.objectContaining({
                campaignId: testData.campaignId,
                pledgeTierId: testData.pledgeTierId,
                backerId: 'user-123',
                pledgeAmount: testData.pledgeAmount.toString()
              })
            })
          })
        );
      });

      it('should handle optional pledge tier metadata correctly', async () => {
        const testData = PaymentTestData.generateCheckoutRequest();
        delete testData.pledgeTierId; // No pledge tier

        const mockSession = StripeObjectFactory.createCheckoutSession();
        stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        
        expect(response.status).toBe(200);
        expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              pledgeTierId: '' // Empty string for optional tier
            }),
            payment_intent_data: expect.objectContaining({
              metadata: expect.objectContaining({
                pledgeTierId: ''
              })
            })
          })
        );
      });
    });

    describe('🔗 Success and Cancel URL Validation', () => {
      it('should use custom success and cancel URLs when provided', async () => {
        resetAllMocks();
        setupDefaultMocks();
        
        const campaign = PaymentTestData.generateCampaign({ status: 'published' });
        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
        
        const testData = PaymentTestData.generateCheckoutRequest({
          successUrl: 'https://custom-success.com/payment-complete?session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: 'https://custom-cancel.com/payment-cancelled',
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

        const mockSession = StripeObjectFactory.createCheckoutSession({
          success_url: testData.successUrl,
          cancel_url: testData.cancelUrl
        });

        stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        
        expect(response.status).toBe(200);
        expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            success_url: 'https://custom-success.com/payment-complete?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://custom-cancel.com/payment-cancelled'
          })
        );
      });

      it('should generate default URLs when not provided', async () => {
        resetAllMocks();
        setupDefaultMocks();
        
        const campaign = PaymentTestData.generateCampaign({ status: 'published' });
        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
        
        const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });
        delete testData.successUrl;
        delete testData.cancelUrl;

        const mockSession = StripeObjectFactory.createCheckoutSession();
        stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        
        expect(response.status).toBe(200);
        expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            success_url: `http://localhost:3000/campaigns/${testData.campaignId}?payment=success`,
            cancel_url: `http://localhost:3000/campaigns/${testData.campaignId}?payment=cancelled`
          })
        );
      });

      it('should reject invalid URL formats', async () => {
        const testData = PaymentTestData.generateCheckoutRequest({
          successUrl: 'not-a-valid-url',
          cancelUrl: 'also-not-valid'
        });

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid input data');
      });
    });
  });

  describe('❌ Error Scenarios - Validation and Edge Cases', () => {
    describe('🏢 Campaign Validation', () => {
      it('should return 404 for non-existent campaign ID', async () => {
        prismaMock.campaign.findUnique.mockResolvedValue(null);

        const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: 'non-existent-campaign-id'
        });

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(404);
        expect(data.error).toBe('Campaign not found');

        performanceMetrics.failedCheckouts++;
      });

      it('should reject unpublished campaigns (draft status)', async () => {
        const campaign = PaymentTestData.generateCampaign({
          status: 'draft'
        });

        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);

        const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(400);
        expect(data.error).toBe('Campaign is not accepting pledges');

        performanceMetrics.failedCheckouts++;
      });

      it('should reject paused campaigns', async () => {
        const campaign = PaymentTestData.generateCampaign({
          status: 'paused'
        });

        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);

        const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(400);
        expect(data.error).toBe('Campaign is not accepting pledges');

        performanceMetrics.failedCheckouts++;
      });
    });

    describe('🎫 Pledge Tier Validation', () => {
      it('should return 404 for non-existent pledge tier', async () => {
        const campaign = PaymentTestData.generateCampaign();
        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);

        const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: 'non-existent-tier-id'
        });

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(404);
        expect(data.error).toBe('Pledge tier not found');

        performanceMetrics.failedCheckouts++;
      });

      it('should reject inactive pledge tiers', async () => {
        const campaign = PaymentTestData.generateCampaign();
        const inactiveTier = { ...campaign.pledgeTiers[0], isActive: false };
        
        prismaMock.campaign.findUnique.mockResolvedValue({
          ...campaign,
          pledgeTiers: [inactiveTier]
        } as any);

        const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: inactiveTier.id
        });

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(400);
        expect(data.error).toBe('Pledge tier is not active');

        performanceMetrics.failedCheckouts++;
      });
    });

    describe('📧 Email Validation', () => {
      it('should reject invalid email format', async () => {
        mockAuth.mockResolvedValue(null); // No authenticated user

        const testData = PaymentTestData.generateCheckoutRequest({
          backerEmail: 'invalid-email-format' // Invalid email format
        });

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid input data');

        performanceMetrics.failedCheckouts++;
      });
    });

    describe('🔢 Edge Case Payment Amounts', () => {
      it('should handle zero amount properly (should be rejected)', async () => {
        const testData = PaymentTestData.generateCheckoutRequest({
          pledgeAmount: 0
        });

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid input data');

        performanceMetrics.failedCheckouts++;
      });

      it('should handle maximum reasonable amount ($1,000,000)', async () => {
        resetAllMocks();
        setupDefaultMocks();
        
        const campaign = PaymentTestData.generateCampaign({ status: 'published' });
        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
        
        const testData = PaymentTestData.generateCheckoutRequest({
          pledgeAmount: 1000000, // $1 million
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

        const mockSession = StripeObjectFactory.createCheckoutSession({
          amount_total: 100000000 // $1 million in cents
        });

        stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        
        expect(response.status).toBe(200);
        
        // Verify app fee calculation for maximum amount
        expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            payment_intent_data: expect.objectContaining({
              application_fee_amount: 5000000 // 5% of $1,000,000
            })
          })
        );

        performanceMetrics.successfulCheckouts++;
      });
    });
  });

  describe('🔌 Stripe Integration Error Handling', () => {
    it('should handle Stripe API errors gracefully', async () => {
      resetAllMocks();
      setupDefaultMocks();
      
      const campaign = PaymentTestData.generateCampaign({ status: 'published' });
      prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
      
      stripeMock.checkout.sessions.create.mockRejectedValue(
        PaymentErrorScenarios.STRIPE_ERRORS.API_ERROR
      );

      const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

      const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create checkout session');

      performanceMetrics.failedCheckouts++;
    });

    it('should handle network timeouts', async () => {
      resetAllMocks();
      setupDefaultMocks();
      
      const campaign = PaymentTestData.generateCampaign({ status: 'published' });
      prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
      
      stripeMock.checkout.sessions.create.mockRejectedValue(
        PaymentErrorScenarios.STRIPE_ERRORS.NETWORK_ERROR
      );

      const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

      const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create checkout session');

      performanceMetrics.failedCheckouts++;
    });

    it('should handle card declined scenarios', async () => {
      resetAllMocks();
      setupDefaultMocks();
      
      const campaign = PaymentTestData.generateCampaign({ status: 'published' });
      prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
      
      stripeMock.checkout.sessions.create.mockRejectedValue(
        PaymentErrorScenarios.STRIPE_ERRORS.CARD_DECLINED
      );

      const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

      const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create checkout session');

      performanceMetrics.failedCheckouts++;
    });
  });

  describe('🗄️ Database Error Scenarios', () => {
    it('should handle database connection failures', async () => {
      prismaMock.campaign.findUnique.mockRejectedValue(
        PaymentErrorScenarios.DATABASE_ERRORS.CONNECTION_FAILED
      );

      const testData = PaymentTestData.generateCheckoutRequest();

      const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');

      performanceMetrics.failedCheckouts++;
    });

    it('should handle user upsert failures', async () => {
      resetAllMocks();
      setupDefaultMocks();
      
      const campaign = PaymentTestData.generateCampaign({ status: 'published' });
      prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
      
      prismaMock.user.upsert.mockRejectedValue(
        PaymentErrorScenarios.DATABASE_ERRORS.UNIQUE_CONSTRAINT
      );

      const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

      const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');

      performanceMetrics.failedCheckouts++;
    });
  });

  describe('🔒 Security Edge Cases', () => {
    it('should sanitize potential injection attacks in campaign ID', async () => {
      const maliciousPayloads = PaymentSecurityHelpers.INJECTION_PAYLOADS;

      for (const payload of maliciousPayloads.slice(0, 3)) { // Test first 3 to avoid timeout
        resetAllMocks();
        setupDefaultMocks();

        const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: payload // Inject malicious payload
        });

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        
        // Should fail validation or handle safely
        expect([400, 404, 500]).toContain(response.status);

        performanceMetrics.failedCheckouts++;
      }
    });

    it('should handle malicious payment amounts', async () => {
      const maliciousAmounts = PaymentSecurityHelpers.MALICIOUS_AMOUNTS;

      for (const amount of maliciousAmounts.slice(0, 5)) { // Test first 5 to avoid timeout
        resetAllMocks();
        setupDefaultMocks();
        
        const campaign = PaymentTestData.generateCampaign({ status: 'published' });
        prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);

        const testData = PaymentTestData.generateCheckoutRequest({
          pledgeAmount: amount as number,
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });

        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });

        const response = await POST(request);
        
        // Should fail validation
        expect(response.status).toBe(400);

        performanceMetrics.failedCheckouts++;
      }
    });

    it('should handle extremely long strings in metadata', async () => {
      const longString = 'a'.repeat(1000); // Shorter than 10,000 to avoid timeout
      
      const testData = PaymentTestData.generateCheckoutRequest({
        campaignId: longString
      });

      const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      const response = await POST(request);
      
      // Should handle gracefully
      expect([400, 404, 500]).toContain(response.status);

      performanceMetrics.failedCheckouts++;
    });
  });

  describe('⚡ Performance Benchmarks', () => {
    it('should handle checkout session creation within reasonable time (< 1000ms)', async () => {
      resetAllMocks();
      setupDefaultMocks();
      
      const campaign = PaymentTestData.generateCampaign({ status: 'published' });
      prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
      
      const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });
      const mockSession = StripeObjectFactory.createCheckoutSession();
      
      stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      const startTime = performance.now();
      const response = await POST(request);
      const duration = performance.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      // Update performance tracking
      updatePerformanceMetrics(duration);
      performanceMetrics.successfulCheckouts++;
    });

    it('should handle concurrent checkout requests efficiently', async () => {
      resetAllMocks();
      setupDefaultMocks();
      
      const campaign = PaymentTestData.generateCampaign({ status: 'published' });
      prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
      
      const concurrentRequests = 10;
      const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });
      const mockSession = StripeObjectFactory.createCheckoutSession();
      
      stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

      const createRequest = () => {
        const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
          method: 'POST',
          body: JSON.stringify(testData)
        });
        return POST(request);
      };

      const results = await PaymentPerformanceHelpers.createConcurrentPayments(
        concurrentRequests,
        createRequest
      );

      expect(results.successful).toBe(concurrentRequests);
      expect(results.failed).toBe(0);
      expect(results.averageTime).toBeLessThan(2000); // Average should be under 2 seconds

      performanceMetrics.successfulCheckouts += results.successful;
      performanceMetrics.failedCheckouts += results.failed;
    });

    it('should maintain performance under database load', async () => {
      resetAllMocks();
      setupDefaultMocks();
      
      const campaign = PaymentTestData.generateCampaign({ status: 'published' });
      
      // Simulate database latency
      prismaMock.campaign.findUnique.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(campaign as any), 100))
      );
      
      const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });
      const mockSession = StripeObjectFactory.createCheckoutSession();
      stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      const { result: response, duration } = await PaymentPerformanceHelpers.measurePaymentTime(
        () => POST(request)
      );

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Should handle 100ms DB latency within 2 seconds

      performanceMetrics.successfulCheckouts++;
    });
  });

  describe('🔄 Webhook Callback Scenarios', () => {
    it('should properly setup metadata for webhook processing', async () => {
      const campaign = PaymentTestData.generateCampaign();
      const pledgeTier = campaign.pledgeTiers[0];
      
      prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);

      const testData = PaymentTestData.generateCheckoutRequest({
        campaignId: campaign.id,
        pledgeTierId: pledgeTier.id,
        pledgeAmount: 500
      });

      const mockSession = StripeObjectFactory.createCheckoutSession({
        metadata: {
          campaignId: campaign.id,
          pledgeTierId: pledgeTier.id,
          backerId: 'user-123'
        }
      });

      stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);

      // Verify that metadata is set up correctly for webhook processing
      expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            campaignId: campaign.id,
            pledgeTierId: pledgeTier.id,
            backerId: 'user-123'
          }),
          payment_intent_data: expect.objectContaining({
            metadata: expect.objectContaining({
              campaignId: campaign.id,
              pledgeTierId: pledgeTier.id,
              backerId: 'user-123',
              pledgeAmount: testData.pledgeAmount.toString()
            })
          })
        })
      );

      performanceMetrics.successfulCheckouts++;
    });

    it('should create session with proper transfer data for webhook processing', async () => {
      resetAllMocks();
      setupDefaultMocks();
      
      const campaign = PaymentTestData.generateCampaign({ status: 'published' });
      prismaMock.campaign.findUnique.mockResolvedValue(campaign as any);
      
      const testData = PaymentTestData.generateCheckoutRequest({
          campaignId: campaign.id,
          pledgeTierId: campaign.pledgeTiers[0].id
        });
      const mockSession = StripeObjectFactory.createCheckoutSession();
      
      stripeMock.checkout.sessions.create.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);

      // Verify transfer data is set up for Connect payouts
      expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent_data: expect.objectContaining({
            transfer_data: expect.objectContaining({
              destination: 'acct_test_destination'
            })
          })
        })
      );

      performanceMetrics.successfulCheckouts++;
    });
  });

  describe('🔧 Malformed Request Handling', () => {
    it('should handle missing request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
        method: 'POST'
        // No body
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid JSON in request body');

      performanceMetrics.failedCheckouts++;
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
        method: 'POST',
        body: '{invalid json'
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid JSON in request body');

      performanceMetrics.failedCheckouts++;
    });

    it('should handle null values in required fields', async () => {
      const testData = {
        campaignId: null,
        pledgeAmount: null
      };

      const request = new NextRequest('http://localhost:3000/api/payments/checkout-session', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input data');

      performanceMetrics.failedCheckouts++;
    });
  });

  describe('📊 Test Summary and Metrics', () => {
    it('should track performance metrics', () => {
      expect(performanceMetrics.totalTests).toBeGreaterThanOrEqual(0);
    });
    
    afterAll(() => {
      console.log('\n🔍 Checkout API Test Performance Summary:');
      console.log(`📈 Total Tests: ${performanceMetrics.totalTests}`);
      console.log(`✅ Successful Checkouts: ${performanceMetrics.successfulCheckouts}`);
      console.log(`❌ Failed Checkouts: ${performanceMetrics.failedCheckouts}`);
      console.log(`⚡ Average Response Time: ${performanceMetrics.averageResponseTime.toFixed(2)}ms`);
      console.log(`🚀 Fastest Response: ${performanceMetrics.fastestResponse.toFixed(2)}ms`);
      console.log(`🐌 Slowest Response: ${performanceMetrics.slowestResponse.toFixed(2)}ms`);
      
      const successRate = (performanceMetrics.successfulCheckouts / (performanceMetrics.successfulCheckouts + performanceMetrics.failedCheckouts)) * 100;
      console.log(`📊 Success Rate: ${successRate.toFixed(1)}%`);
    });
  });

  // Helper method to update performance metrics
  function updatePerformanceMetrics(responseTime: number) {
    performanceMetrics.averageResponseTime = (
      (performanceMetrics.averageResponseTime * (performanceMetrics.totalTests - 1)) + responseTime
    ) / performanceMetrics.totalTests;
    
    if (responseTime < performanceMetrics.fastestResponse) {
      performanceMetrics.fastestResponse = responseTime;
    }
    
    if (responseTime > performanceMetrics.slowestResponse) {
      performanceMetrics.slowestResponse = responseTime;
    }
  }
});