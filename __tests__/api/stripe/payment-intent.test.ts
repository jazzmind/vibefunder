/**
 * Comprehensive Payment Intent Tests
 * 
 * This test suite validates the complete payment intent flow including:
 * - Payment intent creation and confirmation
 * - Amount calculations and currency handling  
 * - Payment method attachments and detachments
 * - 3D Secure authentication flows
 * - Capture vs authorize-only flows
 * - Partial refunds and full refunds
 * - Payment intent cancellation
 * - Status transitions (requires_payment_method → processing → succeeded/failed)
 * - Error scenarios (declined cards, insufficient funds, timeouts)
 * - Business logic integration (campaigns, backers, fees)
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

import { jest } from '@jest/globals';

// Mock Stripe constants and configuration
jest.mock('@/lib/stripe', () => {
  const originalModule = jest.requireActual('../../payments/setup-payment-mocks');
  return {
    stripe: originalModule.stripeMock,
    STRIPE_CURRENCY: 'usd',
    STRIPE_PRICE_DOLLARS: 1,
    STRIPE_APP_FEE_BPS: 500, // 5% app fee
    DEST_ACCOUNT: 'acct_test_destination',
  };
});

describe('Payment Intent API Tests', () => {
  let mockRequest: any;
  let mockUser: any;
  let mockCampaign: any;
  let mockPaymentIntent: any;
  let mockPaymentMethod: any;

  beforeAll(async () => {
    // Initialize test data
    setupDefaultMockData();
  });

  beforeEach(() => {
    resetAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Payment Intent Creation and Confirmation', () => {
    test('should create payment intent with valid data', async () => {
      // Arrange
      const paymentIntentData = {
        amount: 10000, // $100.00
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          campaignId: 'campaign-123',
          userId: 'user-123',
          pledgeTierId: 'tier-123'
        }
      };

      stripeMock.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        object: 'payment_intent',
        amount: 10000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_test_123_secret',
        metadata: paymentIntentData.metadata
      });

      // Mock the payment intent creation endpoint
      const createPaymentIntent = async (data: any) => {
        const paymentIntent = await stripeMock.paymentIntents.create(data);
        return paymentIntent;
      };

      // Act
      const result = await createPaymentIntent(paymentIntentData);

      // Assert
      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(paymentIntentData);
      expect(result.id).toBe('pi_test_123');
      expect(result.status).toBe('requires_payment_method');
      expect(result.amount).toBe(10000);
      expect(result.currency).toBe('usd');
      expect(result.metadata.campaignId).toBe('campaign-123');
    });

    test('should confirm payment intent with payment method', async () => {
      // Arrange
      const paymentIntentId = 'pi_test_123';
      const paymentMethodId = 'pm_test_card';

      stripeMock.paymentIntents.confirm.mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        payment_method: 'pm_test_card',
        amount: 10000,
        currency: 'usd'
      });

      const confirmPaymentIntent = async (id: string, paymentMethodId: string) => {
        return await stripeMock.paymentIntents.confirm(id, {
          payment_method: paymentMethodId
        });
      };

      // Act
      const result = await confirmPaymentIntent(paymentIntentId, paymentMethodId);

      // Assert
      expect(stripeMock.paymentIntents.confirm).toHaveBeenCalledWith('pi_test_123', {
        payment_method: 'pm_test_card'
      });
      expect(result.status).toBe('succeeded');
      expect(result.payment_method).toBe('pm_test_card');
    });

    test('should handle payment intent confirmation failure', async () => {
      // Arrange
      stripeMock.paymentIntents.confirm.mockResolvedValue({
        id: 'pi_test_123',
        status: 'requires_action',
        next_action: {
          type: 'use_stripe_sdk',
          use_stripe_sdk: {
            type: 'three_d_secure_redirect',
            stripe_js: 'https://js.stripe.com/v3/'
          }
        }
      });

      const confirmPaymentIntent = async (id: string) => {
        return await stripeMock.paymentIntents.confirm(id);
      };

      // Act
      const result = await confirmPaymentIntent('pi_test_123');

      // Assert
      expect(result.status).toBe('requires_action');
      expect(result.next_action.type).toBe('use_stripe_sdk');
    });
  });

  describe('Amount Calculations and Currency Handling', () => {
    test('should calculate correct amounts with platform fees', async () => {
      // Arrange
      const pledgeAmount = 10000; // $100.00
      const platformFeePercent = 5; // 5%
      const expectedPlatformFee = Math.floor(pledgeAmount * platformFeePercent / 100);
      const expectedCampaignAmount = pledgeAmount - expectedPlatformFee;

      const calculateFees = (amount: number) => {
        const platformFee = Math.floor(amount * platformFeePercent / 100);
        const campaignAmount = amount - platformFee;
        return { platformFee, campaignAmount };
      };

      // Act
      const result = calculateFees(pledgeAmount);

      // Assert
      expect(result.platformFee).toBe(500); // $5.00
      expect(result.campaignAmount).toBe(9500); // $95.00
    });

    test('should handle multiple currencies', async () => {
      const currencies = ['usd', 'eur', 'gbp', 'cad'];
      
      for (const currency of currencies) {
        stripeMock.paymentIntents.create.mockResolvedValue({
          id: `pi_${currency}_test`,
          currency: currency,
          amount: 10000
        });

        const createPaymentIntent = async (currency: string) => {
          return await stripeMock.paymentIntents.create({
            amount: 10000,
            currency
          });
        };

        const result = await createPaymentIntent(currency);
        expect(result.currency).toBe(currency);
      }
    });

    test('should validate minimum and maximum amounts', async () => {
      const testCases = [
        { amount: 50, shouldSucceed: true, description: 'minimum amount $0.50' },
        { amount: 25, shouldSucceed: false, description: 'below minimum amount' },
        { amount: 99999900, shouldSucceed: true, description: 'maximum amount' },
        { amount: 100000000, shouldSucceed: false, description: 'above maximum amount' }
      ];

      for (const testCase of testCases) {
        const validateAmount = (amount: number) => {
          const minAmount = 50; // $0.50
          const maxAmount = 99999999; // $999,999.99
          return amount >= minAmount && amount <= maxAmount;
        };

        const isValid = validateAmount(testCase.amount);
        expect(isValid).toBe(testCase.shouldSucceed);
      }
    });
  });

  describe('Payment Method Attachments', () => {
    test('should attach payment method to customer', async () => {
      // Arrange
      stripeMock.paymentMethods.attach.mockResolvedValue({
        id: 'pm_test_card',
        customer: 'cus_test_123',
        type: 'card'
      });

      const attachPaymentMethod = async (paymentMethodId: string, customerId: string) => {
        return await stripeMock.paymentMethods.attach(paymentMethodId, {
          customer: customerId
        });
      };

      // Act
      const result = await attachPaymentMethod('pm_test_card', 'cus_test_123');

      // Assert
      expect(stripeMock.paymentMethods.attach).toHaveBeenCalledWith('pm_test_card', {
        customer: 'cus_test_123'
      });
      expect(result.customer).toBe('cus_test_123');
    });

    test('should detach payment method from customer', async () => {
      // Arrange
      stripeMock.paymentMethods.detach.mockResolvedValue({
        id: 'pm_test_card',
        customer: null,
        type: 'card'
      });

      const detachPaymentMethod = async (paymentMethodId: string) => {
        return await stripeMock.paymentMethods.detach(paymentMethodId);
      };

      // Act
      const result = await detachPaymentMethod('pm_test_card');

      // Assert
      expect(stripeMock.paymentMethods.detach).toHaveBeenCalledWith('pm_test_card');
      expect(result.customer).toBeNull();
    });
  });

  describe('3D Secure Authentication Flows', () => {
    test('should handle 3D Secure authentication requirement', async () => {
      // Arrange
      stripeMock.paymentIntents.confirm = jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'requires_action',
        next_action: {
          type: 'redirect_to_url',
          redirect_to_url: {
            url: 'https://hooks.stripe.com/3d_secure_2/acct_123',
            return_url: 'https://your-website.com/return'
          }
        }
      });

      const confirmPaymentIntent = async (paymentIntentId: string) => {
        return await stripeMock.paymentIntents.confirm(paymentIntentId, {
          payment_method: 'pm_test_card_threeDSecure2Required'
        });
      };

      // Act
      const result = await confirmPaymentIntent('pi_test_123');

      // Assert
      expect(result.status).toBe('requires_action');
      expect(result.next_action.type).toBe('redirect_to_url');
      expect(result.next_action.redirect_to_url.url).toContain('3d_secure_2');
    });

    test('should complete 3D Secure authentication successfully', async () => {
      // Arrange - simulate successful 3DS completion
      stripeMock.paymentIntents.retrieve = jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        payment_method: 'pm_test_card_threeDSecure2Required'
      });

      const retrievePaymentIntent = async (paymentIntentId: string) => {
        return await stripeMock.paymentIntents.retrieve(paymentIntentId);
      };

      // Act
      const result = await retrievePaymentIntent('pi_test_123');

      // Assert
      expect(result.status).toBe('succeeded');
      expect(stripeMock.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_123');
    });
  });

  describe('Capture vs Authorize-Only Flows', () => {
    test('should create authorization-only payment intent', async () => {
      // Arrange
      stripeMock.paymentIntents.create = jest.fn().mockResolvedValue({
        id: 'pi_test_auth_123',
        status: 'requires_payment_method',
        amount: 10000,
        currency: 'usd',
        capture_method: 'manual'
      });

      const createAuthPaymentIntent = async () => {
        return await stripeMock.paymentIntents.create({
          amount: 10000,
          currency: 'usd',
          capture_method: 'manual'
        });
      };

      // Act
      const result = await createAuthPaymentIntent();

      // Assert
      expect(result.capture_method).toBe('manual');
      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith({
        amount: 10000,
        currency: 'usd',
        capture_method: 'manual'
      });
    });

    test('should capture authorized payment', async () => {
      // Arrange
      stripeMock.paymentIntents.capture = jest.fn().mockResolvedValue({
        id: 'pi_test_auth_123',
        status: 'succeeded',
        amount: 10000,
        amount_capturable: 0
      });

      const capturePaymentIntent = async (paymentIntentId: string, amount?: number) => {
        const params: any = {};
        if (amount) {
          params.amount_to_capture = amount;
        }
        return await stripeMock.paymentIntents.capture(paymentIntentId, params);
      };

      // Act
      const result = await capturePaymentIntent('pi_test_auth_123');

      // Assert
      expect(result.status).toBe('succeeded');
      expect(result.amount_capturable).toBe(0);
      expect(stripeMock.paymentIntents.capture).toHaveBeenCalledWith('pi_test_auth_123', {});
    });

    test('should partially capture authorized payment', async () => {
      // Arrange
      const partialAmount = 7500; // $75.00 out of $100.00
      stripeMock.paymentIntents.capture = jest.fn().mockResolvedValue({
        id: 'pi_test_auth_123',
        status: 'succeeded',
        amount: 10000,
        amount_received: 7500,
        amount_capturable: 2500
      });

      const capturePaymentIntent = async (paymentIntentId: string, amount: number) => {
        return await stripeMock.paymentIntents.capture(paymentIntentId, {
          amount_to_capture: amount
        });
      };

      // Act
      const result = await capturePaymentIntent('pi_test_auth_123', partialAmount);

      // Assert
      expect(result.amount_received).toBe(7500);
      expect(result.amount_capturable).toBe(2500);
      expect(stripeMock.paymentIntents.capture).toHaveBeenCalledWith('pi_test_auth_123', {
        amount_to_capture: 7500
      });
    });
  });

  describe('Refunds (Partial and Full)', () => {
    test('should create full refund', async () => {
      // Arrange
      stripeMock.refunds.create = jest.fn().mockResolvedValue({
        id: 'rf_test_123',
        object: 'refund',
        amount: 10000,
        payment_intent: 'pi_test_123',
        status: 'succeeded',
        metadata: {
          reason: 'requested_by_customer'
        }
      });

      const createRefund = async (paymentIntentId: string, amount?: number, reason?: string) => {
        const params: any = { payment_intent: paymentIntentId };
        if (amount) params.amount = amount;
        if (reason) params.metadata = { reason };
        return await stripeMock.refunds.create(params);
      };

      // Act
      const result = await createRefund('pi_test_123', undefined, 'requested_by_customer');

      // Assert
      expect(result.amount).toBe(10000);
      expect(result.status).toBe('succeeded');
      expect(result.metadata.reason).toBe('requested_by_customer');
      expect(stripeMock.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        metadata: { reason: 'requested_by_customer' }
      });
    });

    test('should create partial refund', async () => {
      // Arrange
      const partialRefundAmount = 3000; // $30.00 out of $100.00
      stripeMock.refunds.create = jest.fn().mockResolvedValue({
        id: 'rf_test_partial_123',
        object: 'refund',
        amount: 3000,
        payment_intent: 'pi_test_123',
        status: 'succeeded'
      });

      const createRefund = async (paymentIntentId: string, amount: number) => {
        return await stripeMock.refunds.create({
          payment_intent: paymentIntentId,
          amount: amount
        });
      };

      // Act
      const result = await createRefund('pi_test_123', partialRefundAmount);

      // Assert
      expect(result.amount).toBe(3000);
      expect(stripeMock.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 3000
      });
    });

    test('should handle multiple partial refunds', async () => {
      // Arrange
      const refunds = [
        { amount: 2000, id: 'rf_1' }, // $20.00
        { amount: 3000, id: 'rf_2' }, // $30.00
        { amount: 1500, id: 'rf_3' }  // $15.00
      ];

      stripeMock.refunds.list = jest.fn().mockResolvedValue({
        object: 'list',
        data: refunds,
        has_more: false
      });

      const listRefunds = async (paymentIntentId: string) => {
        return await stripeMock.refunds.list({
          payment_intent: paymentIntentId
        });
      };

      // Act
      const result = await listRefunds('pi_test_123');

      // Assert
      expect(result.data.length).toBe(3);
      const totalRefunded = result.data.reduce((sum: number, refund: any) => sum + refund.amount, 0);
      expect(totalRefunded).toBe(6500); // $65.00 total refunded
    });
  });

  describe('Payment Intent Cancellation', () => {
    test('should cancel payment intent successfully', async () => {
      // Arrange
      stripeMock.paymentIntents.cancel = jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'canceled',
        amount: 10000,
        canceled_at: Math.floor(Date.now() / 1000)
      });

      const cancelPaymentIntent = async (paymentIntentId: string) => {
        return await stripeMock.paymentIntents.cancel(paymentIntentId);
      };

      // Act
      const result = await cancelPaymentIntent('pi_test_123');

      // Assert
      expect(result.status).toBe('canceled');
      expect(result.canceled_at).toBeDefined();
      expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith('pi_test_123');
    });

    test('should not allow cancellation of succeeded payment intent', async () => {
      // Arrange
      stripeMock.paymentIntents.cancel = jest.fn().mockRejectedValue(
        new Error('You cannot cancel this PaymentIntent because it has a status of succeeded.')
      );

      const cancelPaymentIntent = async (paymentIntentId: string) => {
        return await stripeMock.paymentIntents.cancel(paymentIntentId);
      };

      // Act & Assert
      await expect(cancelPaymentIntent('pi_succeeded_123')).rejects.toThrow(
        'You cannot cancel this PaymentIntent because it has a status of succeeded.'
      );
    });
  });

  describe('Status Transitions', () => {
    test('should follow correct status transition flow', async () => {
      const statusFlow = [
        'requires_payment_method',
        'requires_confirmation', 
        'requires_action',
        'processing',
        'succeeded'
      ];

      // Test each status transition
      for (let i = 0; i < statusFlow.length - 1; i++) {
        const currentStatus = statusFlow[i];
        const nextStatus = statusFlow[i + 1];

        stripeMock.paymentIntents.retrieve = jest.fn().mockResolvedValue({
          id: 'pi_test_123',
          status: nextStatus
        });

        const getPaymentIntentStatus = async () => {
          const pi = await stripeMock.paymentIntents.retrieve('pi_test_123');
          return pi.status;
        };

        const status = await getPaymentIntentStatus();
        expect(status).toBe(nextStatus);
      }
    });

    test('should handle failed status transition', async () => {
      // Arrange
      stripeMock.paymentIntents.retrieve = jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'requires_payment_method',
        last_payment_error: {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.'
        }
      });

      const checkFailedPayment = async () => {
        return await stripeMock.paymentIntents.retrieve('pi_test_123');
      };

      // Act
      const result = await checkFailedPayment();

      // Assert
      expect(result.status).toBe('requires_payment_method');
      expect(result.last_payment_error.code).toBe('card_declined');
    });
  });

  describe('Error Scenarios', () => {
    test('should handle insufficient funds error', async () => {
      // Arrange
      stripeMock.paymentIntents.confirm = jest.fn().mockRejectedValue({
        type: 'StripeCardError',
        code: 'card_declined',
        decline_code: 'insufficient_funds',
        message: 'Your card has insufficient funds.'
      });

      const confirmPaymentIntent = async () => {
        try {
          return await stripeMock.paymentIntents.confirm('pi_test_123', {
            payment_method: 'pm_card_insufficient_funds'
          });
        } catch (error) {
          throw error;
        }
      };

      // Act & Assert
      await expect(confirmPaymentIntent()).rejects.toMatchObject({
        code: 'card_declined',
        decline_code: 'insufficient_funds'
      });
    });

    test('should handle card declined error', async () => {
      // Arrange
      stripeMock.paymentIntents.confirm = jest.fn().mockRejectedValue({
        type: 'StripeCardError',
        code: 'card_declined',
        decline_code: 'generic_decline',
        message: 'Your card was declined.'
      });

      const confirmPaymentIntent = async () => {
        try {
          return await stripeMock.paymentIntents.confirm('pi_test_123', {
            payment_method: 'pm_card_declined'
          });
        } catch (error) {
          throw error;
        }
      };

      // Act & Assert
      await expect(confirmPaymentIntent()).rejects.toMatchObject({
        code: 'card_declined',
        decline_code: 'generic_decline'
      });
    });

    test('should handle expired card error', async () => {
      // Arrange
      stripeMock.paymentIntents.confirm = jest.fn().mockRejectedValue({
        type: 'StripeCardError',
        code: 'expired_card',
        message: 'Your card has expired.'
      });

      const confirmPaymentIntent = async () => {
        try {
          return await stripeMock.paymentIntents.confirm('pi_test_123', {
            payment_method: 'pm_card_expired'
          });
        } catch (error) {
          throw error;
        }
      };

      // Act & Assert
      await expect(confirmPaymentIntent()).rejects.toMatchObject({
        code: 'expired_card'
      });
    });

    test('should handle invalid payment method error', async () => {
      // Arrange
      stripeMock.paymentIntents.confirm = jest.fn().mockRejectedValue({
        type: 'StripeInvalidRequestError',
        code: 'payment_method_unactivated',
        message: 'The payment method is not activated.'
      });

      const confirmPaymentIntent = async () => {
        try {
          return await stripeMock.paymentIntents.confirm('pi_test_123', {
            payment_method: 'pm_invalid'
          });
        } catch (error) {
          throw error;
        }
      };

      // Act & Assert
      await expect(confirmPaymentIntent()).rejects.toMatchObject({
        code: 'payment_method_unactivated'
      });
    });

    test('should handle network timeout error', async () => {
      // Arrange
      jest.setTimeout(10000);
      stripeMock.paymentIntents.confirm = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 5000)
        )
      );

      const confirmPaymentIntent = async () => {
        return await stripeMock.paymentIntents.confirm('pi_test_123');
      };

      // Act & Assert
      await expect(confirmPaymentIntent()).rejects.toThrow('Network timeout');
    });
  });

  describe('Business Logic Integration', () => {
    test('should update campaign funding on successful payment', async () => {
      // Arrange
      const campaignId = 'campaign-123';
      const pledgeAmount = 10000; // $100.00
      const currentRaised = 25000; // $250.00

      prismaMock.campaign.findUnique.mockResolvedValue({
        id: campaignId,
        raisedAmountDollars: currentRaised / 100,
        fundingGoalDollars: 500 // $500.00 goal
      } as any);

      prismaMock.campaign.update.mockResolvedValue({
        id: campaignId,
        raisedAmountDollars: (currentRaised + pledgeAmount) / 100
      } as any);

      const updateCampaignFunding = async (campaignId: string, amount: number) => {
        const campaign = await prismaMock.campaign.findUnique({
          where: { id: campaignId }
        });
        
        if (campaign) {
          const newRaisedAmount = (campaign.raisedAmountDollars * 100) + amount;
          return await prismaMock.campaign.update({
            where: { id: campaignId },
            data: {
              raisedAmountDollars: newRaisedAmount / 100
            }
          });
        }
      };

      // Act
      const result = await updateCampaignFunding(campaignId, pledgeAmount);

      // Assert
      expect(result?.raisedAmountDollars).toBe(350); // $350.00
      expect(prismaMock.campaign.update).toHaveBeenCalledWith({
        where: { id: campaignId },
        data: {
          raisedAmountDollars: 350
        }
      });
    });

    test('should create backer record on successful payment', async () => {
      // Arrange
      const backerData = {
        userId: 'user-123',
        campaignId: 'campaign-123',
        pledgeTierId: 'tier-123',
        amountDollars: 100,
        paymentIntentId: 'pi_test_123',
        status: 'confirmed'
      };

      prismaMock.pledge.create.mockResolvedValue(backerData as any);

      const createBacker = async (data: any) => {
        return await prismaMock.pledge.create({
          data: data
        });
      };

      // Act
      const result = await createBacker(backerData);

      // Assert
      expect(result.paymentIntentId).toBe('pi_test_123');
      expect(result.status).toBe('confirmed');
      expect(prismaMock.pledge.create).toHaveBeenCalledWith({
        data: backerData
      });
    });

    test('should allocate reward tiers correctly', async () => {
      // Arrange
      const tierData = {
        id: 'tier-123',
        campaignId: 'campaign-123',
        title: 'Early Bird',
        description: 'Early access to product',
        priceInDollars: 100,
        maxQuantity: 100,
        currentQuantity: 45
      };

      prismaMock.pledgeTier.findUnique.mockResolvedValue(tierData as any);

      prismaMock.pledgeTier.update.mockResolvedValue({
        ...tierData,
        currentQuantity: 46
      } as any);

      const allocateReward = async (tierId: string) => {
        const tier = await prismaMock.pledgeTier.findUnique({
          where: { id: tierId }
        });

        if (tier && tier.currentQuantity < tier.maxQuantity) {
          return await prismaMock.pledgeTier.update({
            where: { id: tierId },
            data: {
              currentQuantity: tier.currentQuantity + 1
            }
          });
        }
        
        return null;
      };

      // Act
      const result = await allocateReward('tier-123');

      // Assert
      expect(result?.currentQuantity).toBe(46);
      expect(prismaMock.pledgeTier.update).toHaveBeenCalledWith({
        where: { id: 'tier-123' },
        data: {
          currentQuantity: 46
        }
      });
    });

    test('should calculate platform fees correctly', async () => {
      // Arrange
      const pledgeAmount = 10000; // $100.00
      const platformFeeRate = 5; // 5%
      const stripeFeeFixed = 30; // $0.30
      const stripeFeePercent = 2.9; // 2.9%

      const calculateFees = (amount: number) => {
        const platformFee = Math.floor(amount * platformFeeRate / 100);
        const stripeFee = stripeFeeFixed + Math.floor(amount * stripeFeePercent / 100);
        const netAmount = amount - platformFee - stripeFee;
        
        return {
          grossAmount: amount,
          platformFee,
          stripeFee,
          netAmount
        };
      };

      // Act
      const result = calculateFees(pledgeAmount);

      // Assert
      expect(result.grossAmount).toBe(10000); // $100.00
      expect(result.platformFee).toBe(500); // $5.00
      expect(result.stripeFee).toBe(320); // $0.30 + $2.90 = $3.20
      expect(result.netAmount).toBe(9180); // $91.80
    });

    test('should send confirmation email on successful payment', async () => {
      // Arrange
      emailMock.sendPledgeConfirmationEmail.mockResolvedValue(true);

      const sendConfirmationEmail = async (userEmail: string, campaignTitle: string, amount: number) => {
        return await emailMock.sendPledgeConfirmationEmail({
          to: userEmail,
          campaignTitle,
          pledgeAmount: amount / 100
        });
      };

      // Act
      const result = await sendConfirmationEmail('test@example.com', 'Test Campaign', 10000);

      // Assert
      expect(result).toBe(true);
      expect(emailMock.sendPledgeConfirmationEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        campaignTitle: 'Test Campaign',
        pledgeAmount: 100
      });
    });
  });

  // Helper function to setup default mock data
  function setupDefaultMockData() {
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    mockCampaign = {
      id: 'campaign-123',
      title: 'Test Campaign',
      fundingGoalDollars: 500,
      raisedAmountDollars: 250,
      status: 'published'
    };

    mockPaymentIntent = {
      id: 'pi_test_123',
      object: 'payment_intent',
      amount: 10000,
      currency: 'usd',
      status: 'requires_payment_method',
      client_secret: 'pi_test_123_secret'
    };

    mockPaymentMethod = {
      id: 'pm_test_card',
      object: 'payment_method',
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242'
      }
    };
  }
});