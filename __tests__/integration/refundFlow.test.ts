import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/app';
import { createTestUser, createTestCampaign, createTestPayment, cleanupDatabase } from '../helpers/testHelpers';
import { PaymentStatus, CampaignStatus, RefundStatus, TransactionType } from '../../src/types';
import { stripe } from '../../src/lib/stripe';
import { sendEmail } from '../../src/lib/email';
import { calculateTax } from '../../src/lib/tax';
import { convertCurrency } from '../../src/lib/currency';

// Mock external services
jest.mock('../../src/lib/stripe');
jest.mock('../../src/lib/email');
jest.mock('../../src/lib/tax');
jest.mock('../../src/lib/currency');

const mockStripe = stripe as jest.Mocked<typeof stripe>;
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockCalculateTax = calculateTax as jest.MockedFunction<typeof calculateTax>;
const mockConvertCurrency = convertCurrency as jest.MockedFunction<typeof convertCurrency>;

const prisma = new PrismaClient();

describe('Refund and Cancellation Flow Integration', () => {
  let testUser: any;
  let testCampaign: any;
  let testPayment: any;
  let authToken: string;

  beforeAll(async () => {
    // Setup test data
    testUser = await createTestUser({
      email: 'refund-test@example.com',
      password: 'password123'
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'refund-test@example.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;

    testCampaign = await createTestCampaign({
      userId: testUser.id,
      title: 'Refund Test Campaign',
      goal: 10000,
      status: CampaignStatus.ACTIVE
    });
  });

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    mockStripe.refunds.create.mockResolvedValue({
      id: 'refund_test123',
      amount: 5000,
      status: 'succeeded',
      charge: 'charge_test123'
    } as any);

    mockSendEmail.mockResolvedValue(undefined);
    mockCalculateTax.mockReturnValue(500);
    mockConvertCurrency.mockResolvedValue(100);

    // Create fresh test payment for each test
    testPayment = await createTestPayment({
      userId: testUser.id,
      campaignId: testCampaign.id,
      amount: 5000,
      stripePaymentIntentId: 'pi_test123',
      status: PaymentStatus.COMPLETED
    });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.refund.deleteMany({
      where: { paymentId: testPayment.id }
    });
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();
  });

  describe('Full Refund Processing', () => {
    it('should process full refund successfully', async () => {
      const refundRequest = {
        paymentId: testPayment.id,
        amount: 5000,
        reason: 'Customer request',
        type: 'full'
      };

      const response = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(refundRequest)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        paymentId: testPayment.id,
        amount: 5000,
        status: RefundStatus.COMPLETED,
        type: 'full',
        reason: 'Customer request'
      });

      // Verify Stripe refund was created
      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test123',
        amount: 5000,
        reason: 'requested_by_customer',
        metadata: {
          paymentId: testPayment.id,
          campaignId: testCampaign.id,
          userId: testUser.id
        }
      });

      // Verify payment status updated
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: testPayment.id }
      });
      expect(updatedPayment?.status).toBe(PaymentStatus.REFUNDED);

      // Verify campaign total updated
      const updatedCampaign = await prisma.campaign.findUnique({
        where: { id: testCampaign.id }
      });
      expect(updatedCampaign?.currentAmount).toBeLessThan(testCampaign.currentAmount);

      // Verify refund notification sent
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: testUser.email,
        template: 'refund-confirmation',
        data: expect.objectContaining({
          refundAmount: 5000,
          originalAmount: 5000,
          campaignTitle: testCampaign.title
        })
      });
    });

    it('should handle full refund with tax calculations', async () => {
      // Create payment with tax
      const paymentWithTax = await createTestPayment({
        userId: testUser.id,
        campaignId: testCampaign.id,
        amount: 5500, // includes tax
        taxAmount: 500,
        stripePaymentIntentId: 'pi_tax_test123',
        status: PaymentStatus.COMPLETED
      });

      mockCalculateTax.mockReturnValue(500);

      const response = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: paymentWithTax.id,
          amount: 5500,
          reason: 'Customer request',
          type: 'full',
          includeTax: true
        })
        .expect(201);

      expect(response.body.taxRefundAmount).toBe(500);
      expect(response.body.netRefundAmount).toBe(5000);
      expect(mockCalculateTax).toHaveBeenCalled();
    });

    it('should update campaign funding when refund completed', async () => {
      const initialCampaignAmount = testCampaign.currentAmount || 0;

      await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: testPayment.id,
          amount: 5000,
          reason: 'Customer request',
          type: 'full'
        })
        .expect(201);

      const updatedCampaign = await prisma.campaign.findUnique({
        where: { id: testCampaign.id }
      });

      expect(updatedCampaign?.currentAmount).toBe(initialCampaignAmount - 5000);
      expect(updatedCampaign?.backersCount).toBeLessThan(testCampaign.backersCount || 0);
    });
  });

  describe('Partial Refund Handling', () => {
    it('should process partial refund successfully', async () => {
      const partialAmount = 2500; // Half of original payment

      const response = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: testPayment.id,
          amount: partialAmount,
          reason: 'Partial service provided',
          type: 'partial'
        })
        .expect(201);

      expect(response.body.amount).toBe(partialAmount);
      expect(response.body.type).toBe('partial');

      // Verify payment status remains completed for partial refunds
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: testPayment.id }
      });
      expect(updatedPayment?.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
      expect(updatedPayment?.refundedAmount).toBe(partialAmount);
    });

    it('should prevent partial refund exceeding original amount', async () => {
      // First partial refund
      await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: testPayment.id,
          amount: 3000,
          reason: 'First partial refund',
          type: 'partial'
        })
        .expect(201);

      // Attempt second partial refund that would exceed original
      await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: testPayment.id,
          amount: 3000, // This would total 6000, exceeding 5000
          reason: 'Second partial refund',
          type: 'partial'
        })
        .expect(400);
    });

    it('should track multiple partial refunds correctly', async () => {
      // First partial refund
      const refund1 = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: testPayment.id,
          amount: 2000,
          reason: 'First partial',
          type: 'partial'
        })
        .expect(201);

      // Second partial refund
      const refund2 = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: testPayment.id,
          amount: 1500,
          reason: 'Second partial',
          type: 'partial'
        })
        .expect(201);

      // Get payment with refunds
      const response = await request(app)
        .get(`/api/payments/${testPayment.id}/refunds`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.refunds).toHaveLength(2);
      expect(response.body.totalRefunded).toBe(3500);
      expect(response.body.remainingAmount).toBe(1500);
    });
  });

  describe('Refund Request Validation', () => {
    it('should validate refund amount', async () => {
      await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: testPayment.id,
          amount: 0,
          reason: 'Invalid amount',
          type: 'full'
        })
        .expect(400);
    });

    it('should validate payment exists and belongs to user', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'password123'
      });

      const otherUserPayment = await createTestPayment({
        userId: otherUser.id,
        campaignId: testCampaign.id,
        amount: 3000,
        stripePaymentIntentId: 'pi_other123',
        status: PaymentStatus.COMPLETED
      });

      await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: otherUserPayment.id,
          amount: 3000,
          reason: 'Unauthorized refund',
          type: 'full'
        })
        .expect(403);
    });

    it('should validate refund eligibility based on payment status', async () => {
      const failedPayment = await createTestPayment({
        userId: testUser.id,
        campaignId: testCampaign.id,
        amount: 2000,
        stripePaymentIntentId: 'pi_failed123',
        status: PaymentStatus.FAILED
      });

      await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: failedPayment.id,
          amount: 2000,
          reason: 'Cannot refund failed payment',
          type: 'full'
        })
        .expect(400);
    });

    it('should validate refund time limits', async () => {
      // Create old payment (beyond refund window)
      const oldPayment = await createTestPayment({
        userId: testUser.id,
        campaignId: testCampaign.id,
        amount: 3000,
        stripePaymentIntentId: 'pi_old123',
        status: PaymentStatus.COMPLETED,
        createdAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000) // 91 days ago
      });

      await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: oldPayment.id,
          amount: 3000,
          reason: 'Too late for refund',
          type: 'full'
        })
        .expect(400);
    });
  });

  describe('Automatic Refunds for Failed Campaigns', () => {
    it('should automatically process refunds when campaign fails', async () => {
      // Create campaign that will fail
      const failingCampaign = await createTestCampaign({
        userId: testUser.id,
        title: 'Failing Campaign',
        goal: 10000,
        status: CampaignStatus.ACTIVE,
        endDate: new Date(Date.now() - 1000) // Already ended
      });

      const campaignPayment = await createTestPayment({
        userId: testUser.id,
        campaignId: failingCampaign.id,
        amount: 2000,
        stripePaymentIntentId: 'pi_failing123',
        status: PaymentStatus.COMPLETED
      });

      // Trigger campaign failure
      const response = await request(app)
        .post(`/api/campaigns/${failingCampaign.id}/fail`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Did not reach funding goal'
        })
        .expect(200);

      // Check that automatic refund was initiated
      const refunds = await prisma.refund.findMany({
        where: { paymentId: campaignPayment.id }
      });

      expect(refunds).toHaveLength(1);
      expect(refunds[0].reason).toContain('Campaign failed');
      expect(refunds[0].type).toBe('automatic');
      expect(refunds[0].status).toBe(RefundStatus.PROCESSING);
    });

    it('should handle automatic refund failures gracefully', async () => {
      mockStripe.refunds.create.mockRejectedValue(new Error('Stripe refund failed'));

      const failingCampaign = await createTestCampaign({
        userId: testUser.id,
        title: 'Auto Refund Test',
        goal: 10000,
        status: CampaignStatus.FAILED
      });

      const payment = await createTestPayment({
        userId: testUser.id,
        campaignId: failingCampaign.id,
        amount: 3000,
        stripePaymentIntentId: 'pi_auto_fail123',
        status: PaymentStatus.COMPLETED
      });

      await request(app)
        .post(`/api/campaigns/${failingCampaign.id}/process-refunds`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const refund = await prisma.refund.findFirst({
        where: { paymentId: payment.id }
      });

      expect(refund?.status).toBe(RefundStatus.FAILED);
      expect(refund?.errorMessage).toContain('Stripe refund failed');
    });
  });

  describe('Dispute Handling', () => {
    it('should create dispute record when chargeback received', async () => {
      const disputeData = {
        paymentId: testPayment.id,
        stripeDisputeId: 'dp_test123',
        reason: 'fraudulent',
        amount: 5000,
        evidence: {
          customerCommunication: 'Email thread',
          receipt: 'receipt_url',
          shippingDocumentation: 'tracking_number'
        }
      };

      const response = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(disputeData)
        .expect(201);

      expect(response.body).toMatchObject({
        paymentId: testPayment.id,
        stripeDisputeId: 'dp_test123',
        reason: 'fraudulent',
        status: 'needs_response'
      });

      // Verify payment marked as disputed
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: testPayment.id }
      });
      expect(updatedPayment?.status).toBe(PaymentStatus.DISPUTED);
    });

    it('should handle dispute response submission', async () => {
      // Create dispute first
      const dispute = await prisma.dispute.create({
        data: {
          paymentId: testPayment.id,
          stripeDisputeId: 'dp_response123',
          reason: 'credit_not_processed',
          amount: 5000,
          status: 'needs_response'
        }
      });

      const evidenceResponse = {
        customerCommunication: 'Updated email thread',
        receipt: 'new_receipt_url',
        refundPolicy: 'Our refund policy document',
        serviceDocumentation: 'Proof of service delivery'
      };

      const response = await request(app)
        .post(`/api/disputes/${dispute.id}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ evidence: evidenceResponse })
        .expect(200);

      expect(response.body.status).toBe('submitted');
      expect(response.body.evidence).toMatchObject(evidenceResponse);
    });
  });

  describe('Chargeback Scenarios', () => {
    it('should handle chargeback notification', async () => {
      const chargebackData = {
        paymentId: testPayment.id,
        stripeChargebackId: 'cb_test123',
        amount: 5000,
        reason: 'fraudulent',
        networkReasonCode: '4863'
      };

      const response = await request(app)
        .post('/api/chargebacks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(chargebackData)
        .expect(201);

      expect(response.body.status).toBe('lost');
      
      // Verify payment status
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: testPayment.id }
      });
      expect(updatedPayment?.status).toBe(PaymentStatus.CHARGED_BACK);

      // Verify campaign amount adjusted
      const updatedCampaign = await prisma.campaign.findUnique({
        where: { id: testCampaign.id }
      });
      expect(updatedCampaign?.currentAmount).toBeLessThan(testCampaign.currentAmount);
    });

    it('should create transaction record for chargeback fee', async () => {
      const chargeback = await request(app)
        .post('/api/chargebacks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: testPayment.id,
          stripeChargebackId: 'cb_fee123',
          amount: 5000,
          fee: 1500, // Chargeback fee
          reason: 'fraudulent'
        })
        .expect(201);

      // Check for fee transaction
      const feeTransaction = await prisma.transaction.findFirst({
        where: {
          type: TransactionType.CHARGEBACK_FEE,
          relatedId: chargeback.body.id
        }
      });

      expect(feeTransaction).toBeTruthy();
      expect(feeTransaction?.amount).toBe(1500);
    });
  });

  describe('Refund Notification Emails', () => {
    it('should send refund confirmation email', async () => {
      await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: testPayment.id,
          amount: 5000,
          reason: 'Customer request',
          type: 'full'
        })
        .expect(201);

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: testUser.email,
        template: 'refund-confirmation',
        data: expect.objectContaining({
          userName: testUser.name,
          refundAmount: 5000,
          originalAmount: 5000,
          campaignTitle: testCampaign.title,
          refundReason: 'Customer request',
          processedDate: expect.any(String)
        })
      });
    });

    it('should send refund processing notification', async () => {
      const response = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: testPayment.id,
          amount: 5000,
          reason: 'Processing delay',
          type: 'full'
        })
        .expect(201);

      // Simulate processing delay
      await request(app)
        .post(`/api/refunds/${response.body.id}/notify-processing`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: testUser.email,
        template: 'refund-processing',
        data: expect.objectContaining({
          refundId: response.body.id,
          estimatedCompletion: expect.any(String)
        })
      });
    });

    it('should send campaign creator refund notifications', async () => {
      const creatorCampaign = await createTestCampaign({
        userId: testUser.id,
        title: 'Creator Campaign',
        goal: 5000,
        status: CampaignStatus.ACTIVE
      });

      const backerPayment = await createTestPayment({
        userId: testUser.id,
        campaignId: creatorCampaign.id,
        amount: 2000,
        stripePaymentIntentId: 'pi_creator123',
        status: PaymentStatus.COMPLETED
      });

      await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: backerPayment.id,
          amount: 2000,
          reason: 'Backer request',
          type: 'full'
        })
        .expect(201);

      // Check creator notification
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: testUser.email,
        template: 'creator-refund-notification',
        data: expect.objectContaining({
          campaignTitle: 'Creator Campaign',
          refundAmount: 2000,
          backerName: testUser.name,
          impact: expect.any(String)
        })
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle refunds after campaign completion', async () => {
      const completedCampaign = await createTestCampaign({
        userId: testUser.id,
        title: 'Completed Campaign',
        goal: 5000,
        currentAmount: 10000,
        status: CampaignStatus.SUCCESSFUL
      });

      const completedPayment = await createTestPayment({
        userId: testUser.id,
        campaignId: completedCampaign.id,
        amount: 3000,
        stripePaymentIntentId: 'pi_completed123',
        status: PaymentStatus.COMPLETED
      });

      const response = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: completedPayment.id,
          amount: 3000,
          reason: 'Post-completion refund',
          type: 'full',
          adminApproval: true
        })
        .expect(201);

      expect(response.body.requiresApproval).toBe(true);
      expect(response.body.status).toBe(RefundStatus.PENDING_APPROVAL);
    });

    it('should prevent multiple concurrent refund requests', async () => {
      // Start first refund
      const firstRefund = request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: testPayment.id,
          amount: 5000,
          reason: 'First request',
          type: 'full'
        });

      // Start second refund immediately
      const secondRefund = request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: testPayment.id,
          amount: 5000,
          reason: 'Second request',
          type: 'full'
        });

      const [first, second] = await Promise.allSettled([firstRefund, secondRefund]);

      // One should succeed, one should fail
      const results = [first, second].map(r => r.status === 'fulfilled' ? r.value.status : 400);
      expect(results.filter(status => status === 201)).toHaveLength(1);
      expect(results.filter(status => status === 400)).toHaveLength(1);
    });

    it('should handle refunds with different payment methods', async () => {
      // Credit card payment
      const cardPayment = await createTestPayment({
        userId: testUser.id,
        campaignId: testCampaign.id,
        amount: 3000,
        paymentMethod: 'card',
        stripePaymentIntentId: 'pi_card123',
        status: PaymentStatus.COMPLETED
      });

      // Bank transfer payment
      const bankPayment = await createTestPayment({
        userId: testUser.id,
        campaignId: testCampaign.id,
        amount: 4000,
        paymentMethod: 'bank_transfer',
        stripePaymentIntentId: 'pi_bank123',
        status: PaymentStatus.COMPLETED
      });

      // Refund card payment
      const cardRefund = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: cardPayment.id,
          amount: 3000,
          reason: 'Card refund',
          type: 'full'
        })
        .expect(201);

      // Refund bank payment (should take longer)
      const bankRefund = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: bankPayment.id,
          amount: 4000,
          reason: 'Bank refund',
          type: 'full'
        })
        .expect(201);

      expect(cardRefund.body.estimatedDays).toBe(5);
      expect(bankRefund.body.estimatedDays).toBe(10);
    });

    it('should handle currency conversion in refunds', async () => {
      mockConvertCurrency.mockResolvedValue(85); // EUR to USD

      const eurPayment = await createTestPayment({
        userId: testUser.id,
        campaignId: testCampaign.id,
        amount: 10000, // 100 EUR in cents
        currency: 'eur',
        stripePaymentIntentId: 'pi_eur123',
        status: PaymentStatus.COMPLETED
      });

      const response = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: eurPayment.id,
          amount: 10000,
          reason: 'Currency conversion refund',
          type: 'full',
          targetCurrency: 'usd'
        })
        .expect(201);

      expect(mockConvertCurrency).toHaveBeenCalledWith(100, 'eur', 'usd');
      expect(response.body.convertedAmount).toBe(8500); // 85 USD in cents
      expect(response.body.exchangeRate).toBe(0.85);
    });

    it('should handle tax implications in refunds', async () => {
      const taxablePayment = await createTestPayment({
        userId: testUser.id,
        campaignId: testCampaign.id,
        amount: 5500, // Including tax
        taxAmount: 500,
        stripePaymentIntentId: 'pi_tax123',
        status: PaymentStatus.COMPLETED
      });

      mockCalculateTax.mockReturnValue(450); // Adjusted tax

      const response = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: taxablePayment.id,
          amount: 5500,
          reason: 'Tax refund test',
          type: 'full',
          recalculateTax: true
        })
        .expect(201);

      expect(response.body.originalTax).toBe(500);
      expect(response.body.refundTax).toBe(450);
      expect(response.body.taxAdjustment).toBe(-50);
      expect(mockCalculateTax).toHaveBeenCalled();
    });
  });

  describe('Financial Accuracy and State Management', () => {
    it('should maintain financial accuracy across all refund operations', async () => {
      const initialCampaignAmount = testCampaign.currentAmount || 0;
      const refundAmount = 5000;

      // Process refund
      await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: testPayment.id,
          amount: refundAmount,
          reason: 'Financial accuracy test',
          type: 'full'
        })
        .expect(201);

      // Verify all financial records are consistent
      const [updatedCampaign, updatedPayment, refundRecord, transactions] = await Promise.all([
        prisma.campaign.findUnique({ where: { id: testCampaign.id } }),
        prisma.payment.findUnique({ where: { id: testPayment.id } }),
        prisma.refund.findFirst({ where: { paymentId: testPayment.id } }),
        prisma.transaction.findMany({ where: { paymentId: testPayment.id } })
      ]);

      // Campaign amount should be reduced
      expect(updatedCampaign?.currentAmount).toBe(initialCampaignAmount - refundAmount);
      
      // Payment should be marked as refunded
      expect(updatedPayment?.status).toBe(PaymentStatus.REFUNDED);
      expect(updatedPayment?.refundedAmount).toBe(refundAmount);
      
      // Refund record should exist
      expect(refundRecord).toBeTruthy();
      expect(refundRecord?.amount).toBe(refundAmount);
      
      // Transaction records should balance
      const refundTransactions = transactions.filter(t => t.type === TransactionType.REFUND);
      expect(refundTransactions).toHaveLength(1);
      expect(refundTransactions[0].amount).toBe(-refundAmount); // Negative for refund
    });

    it('should handle complex state transitions correctly', async () => {
      // Create multiple payments for campaign
      const payment1 = await createTestPayment({
        userId: testUser.id,
        campaignId: testCampaign.id,
        amount: 2000,
        stripePaymentIntentId: 'pi_state1',
        status: PaymentStatus.COMPLETED
      });

      const payment2 = await createTestPayment({
        userId: testUser.id,
        campaignId: testCampaign.id,
        amount: 3000,
        stripePaymentIntentId: 'pi_state2',
        status: PaymentStatus.COMPLETED
      });

      // Partial refund on payment1
      await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: payment1.id,
          amount: 1000,
          reason: 'Partial refund',
          type: 'partial'
        })
        .expect(201);

      // Full refund on payment2
      await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: payment2.id,
          amount: 3000,
          reason: 'Full refund',
          type: 'full'
        })
        .expect(201);

      // Verify states
      const [p1, p2] = await Promise.all([
        prisma.payment.findUnique({ where: { id: payment1.id } }),
        prisma.payment.findUnique({ where: { id: payment2.id } })
      ]);

      expect(p1?.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
      expect(p1?.refundedAmount).toBe(1000);
      expect(p2?.status).toBe(PaymentStatus.REFUNDED);
      expect(p2?.refundedAmount).toBe(3000);
    });

    it('should maintain referential integrity during refund operations', async () => {
      const refundResponse = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: testPayment.id,
          amount: 5000,
          reason: 'Integrity test',
          type: 'full'
        })
        .expect(201);

      const refundId = refundResponse.body.id;

      // Verify all relationships exist
      const refundWithRelations = await prisma.refund.findUnique({
        where: { id: refundId },
        include: {
          payment: {
            include: {
              user: true,
              campaign: true
            }
          },
          transactions: true
        }
      });

      expect(refundWithRelations).toBeTruthy();
      expect(refundWithRelations?.payment).toBeTruthy();
      expect(refundWithRelations?.payment.user).toBeTruthy();
      expect(refundWithRelations?.payment.campaign).toBeTruthy();
      expect(refundWithRelations?.transactions.length).toBeGreaterThan(0);
    });
  });
});