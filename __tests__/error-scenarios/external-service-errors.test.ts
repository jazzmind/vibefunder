/**
 * Comprehensive External Service Error Tests
 * Tests error handling for Stripe, AWS S3, Email, and GitHub API failures
 */

import Stripe from 'stripe';
import { S3Client } from '@aws-sdk/client-s3';

// Mock external services for error testing
const mockStripe = {
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
    cancel: jest.fn(),
  },
} as unknown as jest.Mocked<Stripe>;

const mockS3 = {
  send: jest.fn(),
} as unknown as jest.Mocked<S3Client>;

const mockNodemailer = {
  sendMail: jest.fn(),
  createTransporter: jest.fn(),
};

const mockGitHub = {
  rest: {
    repos: {
      get: jest.fn(),
      listForUser: jest.fn(),
    },
    issues: {
      create: jest.fn(),
      list: jest.fn(),
    },
  },
};

describe('External Service Error Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Stripe API Errors', () => {
    it('should handle Stripe authentication failure', async () => {
      const authError = new Error('Invalid API Key provided');
      authError.name = 'StripeAuthenticationError';
      (authError as any).type = 'StripeAuthenticationError';

      mockStripe.paymentIntents.create.mockRejectedValue(authError);

      try {
        await mockStripe.paymentIntents.create({
          amount: 2000,
          currency: 'usd',
        });
        fail('Should have thrown authentication error');
      } catch (error) {
        expect(error).toBeInstanceOf(Stripe.StripeAuthenticationError);
        expect((error as Stripe.StripeAuthenticationError).message).toBe('Invalid API Key provided');
        expect((error as Stripe.StripeAuthenticationError).type).toBe('StripeAuthenticationError');
      }
    });

    it('should handle Stripe card declined error', async () => {
      const declinedError = new Stripe.StripeCardError({
        message: 'Your card was declined.',
        type: 'StripeCardError',
        code: 'card_declined',
        decline_code: 'generic_decline',
        payment_intent: {
          id: 'pi_test',
          status: 'requires_payment_method',
        },
      });

      mockStripe.paymentIntents.confirm.mockRejectedValue(declinedError);

      try {
        await mockStripe.paymentIntents.confirm('pi_test', {
          payment_method: 'pm_card_visa',
        });
        fail('Should have thrown card declined error');
      } catch (error) {
        expect(error).toBeInstanceOf(Stripe.StripeCardError);
        expect((error as Stripe.StripeCardError).code).toBe('card_declined');
        expect((error as Stripe.StripeCardError).decline_code).toBe('generic_decline');
      }
    });

    it('should handle Stripe insufficient funds error', async () => {
      const insufficientFundsError = new Stripe.StripeCardError({
        message: 'Your card has insufficient funds.',
        type: 'StripeCardError',
        code: 'card_declined',
        decline_code: 'insufficient_funds',
      });

      mockStripe.paymentIntents.create.mockRejectedValue(insufficientFundsError);

      try {
        await mockStripe.paymentIntents.create({
          amount: 100000, // Large amount
          currency: 'usd',
        });
        fail('Should have thrown insufficient funds error');
      } catch (error) {
        expect(error).toBeInstanceOf(Stripe.StripeCardError);
        expect((error as Stripe.StripeCardError).decline_code).toBe('insufficient_funds');
      }
    });

    it('should handle Stripe rate limit error', async () => {
      const rateLimitError = new Stripe.StripeRateLimitError({
        message: 'Too many requests made to the API too quickly',
        type: 'StripeRateLimitError',
      });

      mockStripe.paymentIntents.create.mockRejectedValue(rateLimitError);

      try {
        await mockStripe.paymentIntents.create({
          amount: 2000,
          currency: 'usd',
        });
        fail('Should have thrown rate limit error');
      } catch (error) {
        expect(error).toBeInstanceOf(Stripe.StripeRateLimitError);
        expect((error as Stripe.StripeRateLimitError).type).toBe('StripeRateLimitError');
      }
    });

    it('should handle Stripe API connection error', async () => {
      const connectionError = new Stripe.StripeConnectionError({
        message: 'Network connection error',
        type: 'StripeConnectionError',
      });

      mockStripe.paymentIntents.create.mockRejectedValue(connectionError);

      try {
        await mockStripe.paymentIntents.create({
          amount: 2000,
          currency: 'usd',
        });
        fail('Should have thrown connection error');
      } catch (error) {
        expect(error).toBeInstanceOf(Stripe.StripeConnectionError);
        expect((error as Stripe.StripeConnectionError).message).toBe('Network connection error');
      }
    });

    it('should handle Stripe invalid request error', async () => {
      const invalidRequestError = new Stripe.StripeInvalidRequestError({
        message: 'Invalid request: amount must be a positive integer',
        type: 'StripeInvalidRequestError',
        param: 'amount',
      });

      mockStripe.paymentIntents.create.mockRejectedValue(invalidRequestError);

      try {
        await mockStripe.paymentIntents.create({
          amount: -100, // Invalid negative amount
          currency: 'usd',
        });
        fail('Should have thrown invalid request error');
      } catch (error) {
        expect(error).toBeInstanceOf(Stripe.StripeInvalidRequestError);
        expect((error as Stripe.StripeInvalidRequestError).param).toBe('amount');
      }
    });

    it('should handle Stripe webhook signature verification error', async () => {
      const webhookError = new Stripe.StripeSignatureVerificationError(
        'Unable to verify webhook signature',
        'invalid_signature',
        'webhook_body'
      );

      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw webhookError;
      });

      try {
        mockStripe.webhooks.constructEvent(
          'webhook_body',
          'invalid_signature',
          'webhook_secret'
        );
        fail('Should have thrown signature verification error');
      } catch (error) {
        expect(error).toBeInstanceOf(Stripe.StripeSignatureVerificationError);
        expect((error as Stripe.StripeSignatureVerificationError).message)
          .toBe('Unable to verify webhook signature');
      }
    });

    it('should handle Stripe API timeout', async () => {
      const timeoutError = new Error('ETIMEDOUT');
      timeoutError.name = 'TimeoutError';

      mockStripe.paymentIntents.create.mockRejectedValue(timeoutError);

      try {
        await mockStripe.paymentIntents.create({
          amount: 2000,
          currency: 'usd',
        });
        fail('Should have thrown timeout error');
      } catch (error) {
        expect((error as Error).name).toBe('TimeoutError');
        expect((error as Error).message).toBe('ETIMEDOUT');
      }
    });
  });

  describe('AWS S3 Errors', () => {
    it('should handle S3 access denied error', async () => {
      const accessDeniedError = new Error('Access Denied');
      accessDeniedError.name = 'AccessDenied';
      (accessDeniedError as any).$metadata = { httpStatusCode: 403 };

      mockS3.send.mockRejectedValue(accessDeniedError);

      try {
        await mockS3.send({} as any);
        fail('Should have thrown access denied error');
      } catch (error) {
        expect((error as any).name).toBe('AccessDenied');
        expect((error as any).$metadata.httpStatusCode).toBe(403);
      }
    });

    it('should handle S3 bucket not found error', async () => {
      const bucketNotFoundError = new Error('The specified bucket does not exist');
      bucketNotFoundError.name = 'NoSuchBucket';
      (bucketNotFoundError as any).$metadata = { httpStatusCode: 404 };

      mockS3.send.mockRejectedValue(bucketNotFoundError);

      try {
        await mockS3.send({} as any);
        fail('Should have thrown bucket not found error');
      } catch (error) {
        expect((error as any).name).toBe('NoSuchBucket');
        expect((error as any).$metadata.httpStatusCode).toBe(404);
      }
    });

    it('should handle S3 key not found error', async () => {
      const keyNotFoundError = new Error('The specified key does not exist');
      keyNotFoundError.name = 'NoSuchKey';
      (keyNotFoundError as any).$metadata = { httpStatusCode: 404 };

      mockS3.send.mockRejectedValue(keyNotFoundError);

      try {
        await mockS3.send({} as any);
        fail('Should have thrown key not found error');
      } catch (error) {
        expect((error as any).name).toBe('NoSuchKey');
        expect((error as any).message).toBe('The specified key does not exist');
      }
    });

    it('should handle S3 invalid credentials error', async () => {
      const invalidCredentialsError = new Error('The AWS Access Key Id you provided does not exist in our records');
      invalidCredentialsError.name = 'InvalidAccessKeyId';
      (invalidCredentialsError as any).$metadata = { httpStatusCode: 403 };

      mockS3.send.mockRejectedValue(invalidCredentialsError);

      try {
        await mockS3.send({} as any);
        fail('Should have thrown invalid credentials error');
      } catch (error) {
        expect((error as any).name).toBe('InvalidAccessKeyId');
        expect((error as Error).message).toContain('AWS Access Key Id');
      }
    });

    it('should handle S3 throttling error', async () => {
      const throttlingError = new Error('Please reduce your request rate');
      throttlingError.name = 'SlowDown';
      (throttlingError as any).$metadata = { httpStatusCode: 503 };

      mockS3.send.mockRejectedValue(throttlingError);

      try {
        await mockS3.send({} as any);
        fail('Should have thrown throttling error');
      } catch (error) {
        expect((error as any).name).toBe('SlowDown');
        expect((error as any).$metadata.httpStatusCode).toBe(503);
      }
    });

    it('should handle S3 request timeout', async () => {
      const timeoutError = new Error('Request has expired');
      timeoutError.name = 'RequestTimeout';
      (timeoutError as any).$metadata = { httpStatusCode: 408 };

      mockS3.send.mockRejectedValue(timeoutError);

      try {
        await mockS3.send({} as any);
        fail('Should have thrown request timeout error');
      } catch (error) {
        expect((error as any).name).toBe('RequestTimeout');
        expect((error as Error).message).toBe('Request has expired');
      }
    });

    it('should handle S3 service unavailable error', async () => {
      const serviceUnavailableError = new Error('Service Unavailable');
      serviceUnavailableError.name = 'ServiceUnavailable';
      (serviceUnavailableError as any).$metadata = { httpStatusCode: 503 };

      mockS3.send.mockRejectedValue(serviceUnavailableError);

      try {
        await mockS3.send({} as any);
        fail('Should have thrown service unavailable error');
      } catch (error) {
        expect((error as any).name).toBe('ServiceUnavailable');
        expect((error as any).$metadata.httpStatusCode).toBe(503);
      }
    });
  });

  describe('Email Service Errors', () => {
    it('should handle SMTP authentication failure', async () => {
      const authError = new Error('Invalid login: 535-5.7.8 Username and Password not accepted');
      authError.name = 'AuthenticationError';
      (authError as any).code = 'EAUTH';

      mockNodemailer.sendMail.mockRejectedValue(authError);

      try {
        await mockNodemailer.sendMail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test message',
        });
        fail('Should have thrown authentication error');
      } catch (error) {
        expect((error as any).code).toBe('EAUTH');
        expect((error as Error).message).toContain('Username and Password not accepted');
      }
    });

    it('should handle SMTP connection timeout', async () => {
      const timeoutError = new Error('Connection timeout');
      (timeoutError as any).code = 'ETIMEDOUT';

      mockNodemailer.sendMail.mockRejectedValue(timeoutError);

      try {
        await mockNodemailer.sendMail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test message',
        });
        fail('Should have thrown connection timeout error');
      } catch (error) {
        expect((error as any).code).toBe('ETIMEDOUT');
      }
    });

    it('should handle SMTP connection refused', async () => {
      const connectionRefusedError = new Error('Connection refused');
      (connectionRefusedError as any).code = 'ECONNREFUSED';

      mockNodemailer.sendMail.mockRejectedValue(connectionRefusedError);

      try {
        await mockNodemailer.sendMail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test message',
        });
        fail('Should have thrown connection refused error');
      } catch (error) {
        expect((error as any).code).toBe('ECONNREFUSED');
      }
    });

    it('should handle invalid recipient email', async () => {
      const invalidRecipientError = new Error('550 5.1.1 User unknown');
      (invalidRecipientError as any).responseCode = 550;
      (invalidRecipientError as any).command = 'RCPT TO';

      mockNodemailer.sendMail.mockRejectedValue(invalidRecipientError);

      try {
        await mockNodemailer.sendMail({
          to: 'invalid@nonexistentdomain.com',
          subject: 'Test',
          text: 'Test message',
        });
        fail('Should have thrown invalid recipient error');
      } catch (error) {
        expect((error as any).responseCode).toBe(550);
        expect((error as Error).message).toContain('User unknown');
      }
    });

    it('should handle message size limit exceeded', async () => {
      const sizeLimitError = new Error('552 5.3.4 Message size exceeds fixed maximum message size');
      (sizeLimitError as any).responseCode = 552;

      mockNodemailer.sendMail.mockRejectedValue(sizeLimitError);

      try {
        await mockNodemailer.sendMail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'x'.repeat(50 * 1024 * 1024), // 50MB message
        });
        fail('Should have thrown message size error');
      } catch (error) {
        expect((error as any).responseCode).toBe(552);
        expect((error as Error).message).toContain('Message size exceeds');
      }
    });

    it('should handle daily sending limit exceeded', async () => {
      const dailyLimitError = new Error('550 5.4.5 Daily sending quota exceeded');
      (dailyLimitError as any).responseCode = 550;

      mockNodemailer.sendMail.mockRejectedValue(dailyLimitError);

      try {
        await mockNodemailer.sendMail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test message',
        });
        fail('Should have thrown daily limit error');
      } catch (error) {
        expect((error as any).responseCode).toBe(550);
        expect((error as Error).message).toContain('Daily sending quota');
      }
    });

    it('should handle SMTP server temporarily unavailable', async () => {
      const tempUnavailableError = new Error('421 4.3.0 Temporary system problem');
      (tempUnavailableError as any).responseCode = 421;

      mockNodemailer.sendMail.mockRejectedValue(tempUnavailableError);

      try {
        await mockNodemailer.sendMail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test message',
        });
        fail('Should have thrown temporary unavailable error');
      } catch (error) {
        expect((error as any).responseCode).toBe(421);
        expect((error as Error).message).toContain('Temporary system problem');
      }
    });
  });

  describe('GitHub API Errors', () => {
    it('should handle GitHub authentication failure', async () => {
      const authError = {
        status: 401,
        message: 'Bad credentials',
        documentation_url: 'https://docs.github.com/rest'
      };

      mockGitHub.rest.repos.get.mockRejectedValue({
        status: 401,
        message: 'Bad credentials',
        response: { data: authError }
      });

      try {
        await mockGitHub.rest.repos.get({
          owner: 'testowner',
          repo: 'testrepo'
        });
        fail('Should have thrown GitHub auth error');
      } catch (error) {
        expect((error as any).status).toBe(401);
        expect((error as any).message).toBe('Bad credentials');
      }
    });

    it('should handle GitHub repository not found', async () => {
      const notFoundError = {
        status: 404,
        message: 'Not Found',
        documentation_url: 'https://docs.github.com/rest'
      };

      mockGitHub.rest.repos.get.mockRejectedValue({
        status: 404,
        message: 'Not Found',
        response: { data: notFoundError }
      });

      try {
        await mockGitHub.rest.repos.get({
          owner: 'testowner',
          repo: 'nonexistentrepo'
        });
        fail('Should have thrown GitHub not found error');
      } catch (error) {
        expect((error as any).status).toBe(404);
        expect((error as any).message).toBe('Not Found');
      }
    });

    it('should handle GitHub API rate limit exceeded', async () => {
      const rateLimitError = {
        status: 403,
        message: 'API rate limit exceeded',
        documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting'
      };

      mockGitHub.rest.repos.listForUser.mockRejectedValue({
        status: 403,
        message: 'API rate limit exceeded',
        response: {
          data: rateLimitError,
          headers: {
            'x-ratelimit-limit': '60',
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '1640995200'
          }
        }
      });

      try {
        await mockGitHub.rest.repos.listForUser({
          username: 'testuser'
        });
        fail('Should have thrown GitHub rate limit error');
      } catch (error) {
        expect((error as any).status).toBe(403);
        expect((error as any).message).toBe('API rate limit exceeded');
      }
    });

    it('should handle GitHub insufficient permissions', async () => {
      const permissionError = {
        status: 403,
        message: 'Insufficient permissions',
        documentation_url: 'https://docs.github.com/rest'
      };

      mockGitHub.rest.issues.create.mockRejectedValue({
        status: 403,
        message: 'Insufficient permissions',
        response: { data: permissionError }
      });

      try {
        await mockGitHub.rest.issues.create({
          owner: 'testowner',
          repo: 'testrepo',
          title: 'Test Issue'
        });
        fail('Should have thrown GitHub permission error');
      } catch (error) {
        expect((error as any).status).toBe(403);
        expect((error as any).message).toBe('Insufficient permissions');
      }
    });

    it('should handle GitHub API validation failed', async () => {
      const validationError = {
        status: 422,
        message: 'Validation Failed',
        errors: [
          {
            field: 'title',
            code: 'missing_field'
          }
        ]
      };

      mockGitHub.rest.issues.create.mockRejectedValue({
        status: 422,
        message: 'Validation Failed',
        response: { data: validationError }
      });

      try {
        await mockGitHub.rest.issues.create({
          owner: 'testowner',
          repo: 'testrepo',
          title: '' // Empty title
        });
        fail('Should have thrown GitHub validation error');
      } catch (error) {
        expect((error as any).status).toBe(422);
        expect((error as any).message).toBe('Validation Failed');
      }
    });

    it('should handle GitHub API server error', async () => {
      const serverError = {
        status: 500,
        message: 'Internal Server Error'
      };

      mockGitHub.rest.repos.get.mockRejectedValue({
        status: 500,
        message: 'Internal Server Error',
        response: { data: serverError }
      });

      try {
        await mockGitHub.rest.repos.get({
          owner: 'testowner',
          repo: 'testrepo'
        });
        fail('Should have thrown GitHub server error');
      } catch (error) {
        expect((error as any).status).toBe(500);
        expect((error as any).message).toBe('Internal Server Error');
      }
    });

    it('should handle GitHub API network timeout', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.name = 'TimeoutError';
      (timeoutError as any).code = 'ECONNABORTED';

      mockGitHub.rest.repos.get.mockRejectedValue(timeoutError);

      try {
        await mockGitHub.rest.repos.get({
          owner: 'testowner',
          repo: 'testrepo'
        });
        fail('Should have thrown GitHub timeout error');
      } catch (error) {
        expect((error as Error).name).toBe('TimeoutError');
        expect((error as any).code).toBe('ECONNABORTED');
      }
    });
  });

  describe('Service Integration Error Scenarios', () => {
    it('should handle cascading service failures', async () => {
      // Simulate multiple services failing simultaneously
      const stripeError = new Stripe.StripeConnectionError({
        message: 'Network connection error',
        type: 'StripeConnectionError',
      });

      const s3Error = new Error('Service Unavailable');
      s3Error.name = 'ServiceUnavailable';

      const emailError = new Error('SMTP server temporarily unavailable');

      mockStripe.paymentIntents.create.mockRejectedValue(stripeError);
      mockS3.send.mockRejectedValue(s3Error);
      mockNodemailer.sendMail.mockRejectedValue(emailError);

      const errors = [];

      try {
        await mockStripe.paymentIntents.create({ amount: 2000, currency: 'usd' });
      } catch (error) {
        errors.push({ service: 'stripe', error });
      }

      try {
        await mockS3.send({} as any);
      } catch (error) {
        errors.push({ service: 's3', error });
      }

      try {
        await mockNodemailer.sendMail({ to: 'test@example.com', subject: 'Test', text: 'Test' });
      } catch (error) {
        errors.push({ service: 'email', error });
      }

      expect(errors).toHaveLength(3);
      expect(errors[0].service).toBe('stripe');
      expect(errors[1].service).toBe('s3');
      expect(errors[2].service).toBe('email');
    });

    it('should handle service timeout scenarios', async () => {
      const services = [
        { name: 'stripe', mock: mockStripe.paymentIntents.create },
        { name: 's3', mock: mockS3.send },
        { name: 'email', mock: mockNodemailer.sendMail },
        { name: 'github', mock: mockGitHub.rest.repos.get }
      ];

      // Set all services to timeout
      services.forEach(service => {
        const timeoutError = new Error('Request timeout');
        timeoutError.name = 'TimeoutError';
        (timeoutError as any).code = 'ETIMEDOUT';
        service.mock.mockRejectedValue(timeoutError);
      });

      const results = await Promise.allSettled([
        mockStripe.paymentIntents.create({ amount: 2000, currency: 'usd' }).catch(e => e),
        mockS3.send({} as any).catch(e => e),
        mockNodemailer.sendMail({ to: 'test@example.com', subject: 'Test', text: 'Test' }).catch(e => e),
        mockGitHub.rest.repos.get({ owner: 'test', repo: 'test' }).catch(e => e)
      ]);

      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled'); // Because we caught the errors
        expect((result.value as any).name).toBe('TimeoutError');
        expect((result.value as any).code).toBe('ETIMEDOUT');
      });
    });

    it('should handle partial service degradation', async () => {
      // Some services work, others fail
      mockStripe.paymentIntents.create.mockResolvedValue({ id: 'pi_success' } as any);
      mockS3.send.mockRejectedValue(new Error('S3 Service Unavailable'));
      mockNodemailer.sendMail.mockResolvedValue({ messageId: 'email_success' } as any);
      mockGitHub.rest.repos.get.mockRejectedValue({ status: 503, message: 'Service Unavailable' });

      const results = {
        stripe: null,
        s3: null,
        email: null,
        github: null,
      };

      try {
        results.stripe = await mockStripe.paymentIntents.create({ amount: 2000, currency: 'usd' });
      } catch (error) {
        results.stripe = { error };
      }

      try {
        results.s3 = await mockS3.send({} as any);
      } catch (error) {
        results.s3 = { error };
      }

      try {
        results.email = await mockNodemailer.sendMail({ to: 'test@example.com', subject: 'Test', text: 'Test' });
      } catch (error) {
        results.email = { error };
      }

      try {
        results.github = await mockGitHub.rest.repos.get({ owner: 'test', repo: 'test' });
      } catch (error) {
        results.github = { error };
      }

      // Stripe and email should succeed
      expect(results.stripe).toHaveProperty('id', 'pi_success');
      expect(results.email).toHaveProperty('messageId', 'email_success');

      // S3 and GitHub should fail
      expect(results.s3).toHaveProperty('error');
      expect(results.github).toHaveProperty('error');
    });
  });
});