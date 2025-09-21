import { faker } from '@faker-js/faker';
import { Payment, PaymentStatus, PaymentMethod } from '../../types/payment';
import Stripe from 'stripe';

export interface PaymentFactoryOptions {
  userId?: string;
  campaignId?: string;
  pledgeTierId?: string;
  amount?: number;
  status?: PaymentStatus;
  method?: PaymentMethod;
  currency?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  refunded?: boolean;
  refundAmount?: number;
  processingFee?: number;
  netAmount?: number;
  metadata?: Record<string, any>;
}

export class PaymentFactory {
  static create(options: PaymentFactoryOptions = {}): Payment {
    const {
      userId = faker.string.uuid(),
      campaignId = faker.string.uuid(),
      pledgeTierId = faker.string.uuid(),
      amount = faker.number.int({ min: 25, max: 500 }),
      status = PaymentStatus.SUCCEEDED,
      method = faker.helpers.enumValue(PaymentMethod),
      currency = 'USD',
      stripePaymentIntentId = `pi_${faker.string.alphanumeric(24)}`,
      stripeChargeId = `ch_${faker.string.alphanumeric(24)}`,
      refunded = false,
      refundAmount = 0,
      metadata = {}
    } = options;

    const processingFee = options.processingFee || Math.round(amount * 0.029 + 30); // Stripe standard rate
    const netAmount = options.netAmount || (amount - processingFee);

    const payment: Payment = {
      id: faker.string.uuid(),
      userId,
      campaignId,
      pledgeTierId,
      amount,
      currency,
      status,
      method,
      processingFee,
      netAmount,
      refunded,
      refundAmount,
      stripePaymentIntentId,
      stripeChargeId,
      stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
      description: `Pledge for ${faker.commerce.productName()}`,
      receiptEmail: faker.internet.email(),
      billingDetails: {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        address: {
          line1: faker.location.streetAddress(),
          line2: faker.datatype.boolean({ probability: 0.3 }) ? 
            faker.location.secondaryAddress() : null,
          city: faker.location.city(),
          state: faker.location.state(),
          postalCode: faker.location.zipCode(),
          country: faker.location.countryCode()
        },
        phone: faker.phone.number()
      },
      paymentMethodDetails: this.createPaymentMethodDetails(method),
      metadata: {
        campaignTitle: faker.commerce.productName(),
        pledgeTier: faker.lorem.words(2),
        ...metadata
      },
      failureCode: status === PaymentStatus.FAILED ? 
        faker.helpers.arrayElement([
          'card_declined',
          'insufficient_funds',
          'expired_card',
          'incorrect_cvc',
          'processing_error'
        ]) : null,
      failureMessage: status === PaymentStatus.FAILED ? 
        'Your card was declined.' : null,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: faker.date.recent(),
      processedAt: [PaymentStatus.SUCCEEDED, PaymentStatus.FAILED].includes(status) ? 
        faker.date.recent() : null
    };

    return payment;
  }

  static createMany(count: number, options: PaymentFactoryOptions = {}): Payment[] {
    return Array.from({ length: count }, () => this.create(options));
  }

  private static createPaymentMethodDetails(method: PaymentMethod): any {
    switch (method) {
      case PaymentMethod.CARD:
        return {
          type: 'card',
          card: {
            brand: faker.helpers.arrayElement(['visa', 'mastercard', 'amex', 'discover']),
            last4: faker.string.numeric(4),
            expMonth: faker.number.int({ min: 1, max: 12 }),
            expYear: faker.number.int({ min: 2024, max: 2030 }),
            funding: faker.helpers.arrayElement(['credit', 'debit', 'prepaid']),
            country: faker.location.countryCode()
          }
        };
      
      case PaymentMethod.BANK_TRANSFER:
        return {
          type: 'bank_transfer',
          bankTransfer: {
            type: faker.helpers.arrayElement(['ach', 'wire', 'sepa']),
            routingNumber: faker.string.numeric(9),
            accountNumberLast4: faker.string.numeric(4),
            bankName: faker.company.name() + ' Bank'
          }
        };
      
      case PaymentMethod.PAYPAL:
        return {
          type: 'paypal',
          paypal: {
            payerEmail: faker.internet.email(),
            payerId: faker.string.alphanumeric(13).toUpperCase()
          }
        };
      
      default:
        return {
          type: 'unknown'
        };
    }
  }

  // Specialized factory methods
  static createSuccessfulPayment(options: PaymentFactoryOptions = {}): Payment {
    return this.create({
      ...options,
      status: PaymentStatus.SUCCEEDED,
      processedAt: faker.date.recent()
    });
  }

  static createFailedPayment(options: PaymentFactoryOptions = {}): Payment {
    return this.create({
      ...options,
      status: PaymentStatus.FAILED,
      failureCode: 'card_declined',
      failureMessage: 'Your card was declined.',
      processedAt: faker.date.recent()
    });
  }

  static createPendingPayment(options: PaymentFactoryOptions = {}): Payment {
    return this.create({
      ...options,
      status: PaymentStatus.PENDING,
      processedAt: null
    });
  }

  static createRefundedPayment(options: PaymentFactoryOptions = {}): Payment {
    const payment = this.create({
      ...options,
      status: PaymentStatus.SUCCEEDED
    });
    
    const refundAmount = options.refundAmount || payment.amount;
    
    return {
      ...payment,
      refunded: true,
      refundAmount,
      metadata: {
        ...payment.metadata,
        refundReason: faker.helpers.arrayElement([
          'requested_by_customer',
          'duplicate',
          'fraudulent',
          'campaign_cancelled'
        ]),
        refundedAt: faker.date.recent().toISOString()
      }
    };
  }

  static createLargePayment(options: PaymentFactoryOptions = {}): Payment {
    const amount = faker.number.int({ min: 1000, max: 10000 });
    return this.create({
      ...options,
      amount,
      processingFee: Math.round(amount * 0.029 + 30),
      netAmount: amount - Math.round(amount * 0.029 + 30)
    });
  }

  static createRecurringPayments(
    count: number, 
    baseOptions: PaymentFactoryOptions = {}
  ): Payment[] {
    const { userId, campaignId } = baseOptions;
    const payments: Payment[] = [];
    const baseDate = faker.date.past({ years: 1 });

    for (let i = 0; i < count; i++) {
      const paymentDate = new Date(baseDate);
      paymentDate.setMonth(paymentDate.getMonth() + i);

      payments.push(this.create({
        ...baseOptions,
        userId,
        campaignId,
        createdAt: paymentDate,
        updatedAt: paymentDate,
        processedAt: paymentDate,
        metadata: {
          ...baseOptions.metadata,
          recurringPayment: true,
          recurringSequence: i + 1
        }
      }));
    }

    return payments;
  }

  // Payment scenario generators
  static createPaymentHistory(userId: string, campaignCount = 3): Payment[] {
    const payments: Payment[] = [];
    
    for (let i = 0; i < campaignCount; i++) {
      const campaignId = faker.string.uuid();
      const campaignPayments = faker.number.int({ min: 1, max: 4 });
      
      for (let j = 0; j < campaignPayments; j++) {
        // Mix of successful and failed payments
        const status = faker.datatype.boolean({ probability: 0.85 }) ? 
          PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;
        
        payments.push(this.create({
          userId,
          campaignId,
          status
        }));
      }
    }
    
    return payments;
  }

  static createStripeTestScenario(): {
    successful: Payment[];
    failed: Payment[];
    pending: Payment[];
    refunded: Payment[];
    all: Payment[];
  } {
    const successful = this.createMany(10, { status: PaymentStatus.SUCCEEDED });
    const failed = this.createMany(3, { status: PaymentStatus.FAILED });
    const pending = this.createMany(2, { status: PaymentStatus.PENDING });
    const refunded = [
      this.createRefundedPayment(),
      this.createRefundedPayment({ refundAmount: 50 }) // Partial refund
    ];

    return {
      successful,
      failed,
      pending,
      refunded,
      all: [...successful, ...failed, ...pending, ...refunded]
    };
  }

  // Edge cases and test scenarios
  static createEdgeCases(): Payment[] {
    return [
      // Minimum payment
      this.create({ amount: 1, currency: 'USD' }),
      
      // Maximum reasonable payment
      this.create({ amount: 100000, currency: 'USD' }),
      
      // Different currencies
      this.create({ amount: 100, currency: 'EUR' }),
      this.create({ amount: 10000, currency: 'JPY' }),
      this.create({ amount: 100, currency: 'GBP' }),
      
      // Failed payment with different failure codes
      this.create({ 
        status: PaymentStatus.FAILED, 
        failureCode: 'insufficient_funds' 
      }),
      this.create({ 
        status: PaymentStatus.FAILED, 
        failureCode: 'expired_card' 
      }),
      
      // Payment with extensive metadata
      this.create({
        metadata: {
          campaignCategory: 'technology',
          pledgeTierType: 'early_bird',
          referralSource: 'social_media',
          userAgent: faker.internet.userAgent(),
          ipAddress: faker.internet.ip(),
          giftPledge: true,
          giftRecipientEmail: faker.internet.email()
        }
      })
    ];
  }

  static createBulkTestData(scenarios: {
    successfulCount?: number;
    failedCount?: number;
    pendingCount?: number;
    refundedCount?: number;
  } = {}): Payment[] {
    const {
      successfulCount = 50,
      failedCount = 10,
      pendingCount = 5,
      refundedCount = 3
    } = scenarios;

    return [
      ...this.createMany(successfulCount, { status: PaymentStatus.SUCCEEDED }),
      ...this.createMany(failedCount, { status: PaymentStatus.FAILED }),
      ...this.createMany(pendingCount, { status: PaymentStatus.PENDING }),
      ...Array.from({ length: refundedCount }, () => this.createRefundedPayment())
    ];
  }
}

// Stripe webhook event factories for testing
export class StripeEventFactory {
  static createPaymentIntentSucceeded(paymentIntentId: string): Stripe.Event {
    return {
      id: `evt_${faker.string.alphanumeric(24)}`,
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          object: 'payment_intent',
          amount: faker.number.int({ min: 2500, max: 50000 }),
          currency: 'usd',
          status: 'succeeded',
          metadata: {
            campaignId: faker.string.uuid(),
            userId: faker.string.uuid()
          }
        } as Stripe.PaymentIntent
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: `req_${faker.string.alphanumeric(24)}`,
        idempotency_key: faker.string.uuid()
      }
    } as Stripe.Event;
  }

  static createPaymentIntentFailed(paymentIntentId: string): Stripe.Event {
    return {
      id: `evt_${faker.string.alphanumeric(24)}`,
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: paymentIntentId,
          object: 'payment_intent',
          amount: faker.number.int({ min: 2500, max: 50000 }),
          currency: 'usd',
          status: 'requires_payment_method',
          last_payment_error: {
            code: 'card_declined',
            message: 'Your card was declined.',
            type: 'card_error'
          },
          metadata: {
            campaignId: faker.string.uuid(),
            userId: faker.string.uuid()
          }
        } as Stripe.PaymentIntent
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: `req_${faker.string.alphanumeric(24)}`,
        idempotency_key: faker.string.uuid()
      }
    } as Stripe.Event;
  }
}

// Export utility functions
export const createPayment = PaymentFactory.create.bind(PaymentFactory);
export const createPayments = PaymentFactory.createMany.bind(PaymentFactory);
export const createSuccessfulPayment = PaymentFactory.createSuccessfulPayment.bind(PaymentFactory);
export const createFailedPayment = PaymentFactory.createFailedPayment.bind(PaymentFactory);