/**
 * User Registration Flow Integration Tests
 * 
 * Tests complete user journey from registration to profile completion and first pledge
 * - User registration with email verification
 * - Profile setup and completion
 * - Email verification process
 * - Password and security setup
 * - First campaign discovery and pledge
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import {
  createTestUser,
  createTestCampaign,
  createTestOrganization,
  generateTestEmail,
  createAuthHeaders,
  setupTestEnvironment,
  teardownTestEnvironment,
  testPrisma,
  generateOtpCode,
} from '../utils/test-helpers';
import emailMock from '../mocks/email.mock';
import stripeMock from '../mocks/stripe.mock';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('User Registration Flow Integration', () => {
  let testUser: any;
  let testCampaign: any;
  let testOrganization: any;
  let creatorUser: any;

  beforeAll(async () => {
    await setupTestEnvironment();
    
    // Create a creator and campaign for the journey
    creatorUser = await createTestUser({
      email: generateTestEmail('creator'),
      name: 'Campaign Creator',
    });
    
    testOrganization = await createTestOrganization({
      name: 'Test Organization',
      ownerId: creatorUser.id,
    });
    
    testCampaign = await createTestCampaign({
      title: 'Journey Test Campaign',
      summary: 'A campaign for testing the user journey',
      fundingGoalDollars: 50000,
      status: 'published',
      organizationId: testOrganization.id,
    }, creatorUser.id);
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(() => {
    emailMock.reset();
    stripeMock.reset();
  });

  describe('Complete User Registration Process', () => {
    it('should handle full registration flow with email verification', async () => {
      const userEmail = generateTestEmail('newuser');
      const userName = 'New Test User';
      
      // Step 1: User submits registration
      const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          name: userName,
        }),
      });

      expect(registerResponse.status).toBe(201);
      const registerData = await registerResponse.json();
      expect(registerData.success).toBe(true);
      expect(registerData.user.email).toBe(userEmail);
      expect(registerData.user.name).toBe(userName);
      
      testUser = registerData.user;

      // Step 2: Verify email was sent
      const sentEmails = emailMock.getEmailsTo(userEmail);
      expect(sentEmails.length).toBeGreaterThan(0);
      
      const welcomeEmail = sentEmails.find(e => e.subject.includes('Welcome'));
      expect(welcomeEmail).toBeDefined();

      // Step 3: Check user exists in database but is not verified
      const dbUser = await testPrisma.user.findUnique({
        where: { email: userEmail },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser?.email).toBe(userEmail);
    });

    it('should handle OTP verification process', async () => {
      if (!testUser) {
        throw new Error('Test user not created in previous test');
      }

      // Step 1: Request OTP code
      const otpResponse = await fetch(`${API_BASE}/api/auth/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
        }),
      });

      expect(otpResponse.status).toBe(200);
      const otpData = await otpResponse.json();
      expect(otpData.success).toBe(true);

      // Step 2: Verify OTP email was sent
      const otpEmails = emailMock.getEmailsBySubject('Verification Code');
      expect(otpEmails.length).toBeGreaterThan(0);
      
      const latestOtpEmail = otpEmails[otpEmails.length - 1];
      expect(latestOtpEmail.to).toBe(testUser.email);

      // Step 3: Get the OTP code from database (simulating user receiving email)
      const otpRecord = await testPrisma.otpCode.findFirst({
        where: {
          userId: testUser.id,
          used: false,
        },
        orderBy: { createdAt: 'desc' },
      });
      
      expect(otpRecord).toBeDefined();
      const otpCode = otpRecord!.code;

      // Step 4: Verify the OTP code
      const verifyResponse = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          code: otpCode,
        }),
      });

      expect(verifyResponse.status).toBe(200);
      const verifyData = await verifyResponse.json();
      expect(verifyData.success).toBe(true);
      expect(verifyData.token).toBeDefined();

      // Step 5: Verify OTP code is marked as used
      const usedOtpRecord = await testPrisma.otpCode.findUnique({
        where: { id: otpRecord!.id },
      });
      expect(usedOtpRecord?.used).toBe(true);
    });

    it('should handle invalid OTP attempts gracefully', async () => {
      if (!testUser) {
        throw new Error('Test user not created in previous test');
      }

      // Attempt 1: Wrong OTP code
      const wrongOtpResponse = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          code: '999999', // Invalid code
        }),
      });

      expect(wrongOtpResponse.status).toBe(400);
      const wrongOtpData = await wrongOtpResponse.json();
      expect(wrongOtpData.success).toBe(false);
      expect(wrongOtpData.error).toContain('Invalid');

      // Attempt 2: Expired OTP (simulate by creating expired OTP)
      const expiredOtp = await testPrisma.otpCode.create({
        data: {
          userId: testUser.id,
          code: generateOtpCode(),
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        },
      });

      const expiredOtpResponse = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          code: expiredOtp.code,
        }),
      });

      expect(expiredOtpResponse.status).toBe(400);
      const expiredOtpData = await expiredOtpResponse.json();
      expect(expiredOtpData.success).toBe(false);
      expect(expiredOtpData.error).toContain('expired');
    });
  });

  describe('Profile Setup and Completion', () => {
    it('should allow user to update their profile', async () => {
      if (!testUser) {
        throw new Error('Test user not created in previous test');
      }

      const updatedProfile = {
        name: 'Updated Test User',
        org: 'Test Organization Inc',
      };

      const updateResponse = await fetch(`${API_BASE}/api/users/${testUser.id}/profile`, {
        method: 'PUT',
        headers: createAuthHeaders(testUser),
        body: JSON.stringify(updatedProfile),
      });

      expect(updateResponse.status).toBe(200);
      const updateData = await updateResponse.json();
      expect(updateData.name).toBe(updatedProfile.name);
      expect(updateData.org).toBe(updatedProfile.org);

      // Verify in database
      const dbUser = await testPrisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(dbUser?.name).toBe(updatedProfile.name);
      expect(dbUser?.org).toBe(updatedProfile.org);
      
      // Update test user for next tests
      testUser = { ...testUser, ...updatedProfile };
    });

    it('should allow user to set preferences', async () => {
      if (!testUser) {
        throw new Error('Test user not created in previous test');
      }

      const preferences = {
        emailNotifications: true,
        marketingEmails: false,
        theme: 'dark',
      };

      const preferencesResponse = await fetch(`${API_BASE}/api/users/${testUser.id}/preferences`, {
        method: 'PUT',
        headers: createAuthHeaders(testUser),
        body: JSON.stringify(preferences),
      });

      expect(preferencesResponse.status).toBe(200);
      const preferencesData = await preferencesResponse.json();
      expect(preferencesData.success).toBe(true);
    });
  });

  describe('Campaign Discovery and First Pledge', () => {
    it('should allow user to discover and view campaigns', async () => {
      // Step 1: Browse campaigns
      const browseResponse = await fetch(`${API_BASE}/api/campaigns?status=published&limit=10`);
      expect(browseResponse.status).toBe(200);
      
      const campaigns = await browseResponse.json();
      expect(Array.isArray(campaigns)).toBe(true);
      expect(campaigns.length).toBeGreaterThan(0);
      
      // Find our test campaign
      const foundCampaign = campaigns.find((c: any) => c.id === testCampaign.id);
      expect(foundCampaign).toBeDefined();
      expect(foundCampaign.status).toBe('published');

      // Step 2: View specific campaign details
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      expect(campaignResponse.status).toBe(200);
      
      const campaignDetails = await campaignResponse.json();
      expect(campaignDetails.id).toBe(testCampaign.id);
      expect(campaignDetails.title).toBe(testCampaign.title);
      expect(campaignDetails.maker).toBeDefined();
      expect(campaignDetails.organization).toBeDefined();
    });

    it('should allow user to make their first pledge', async () => {
      if (!testUser) {
        throw new Error('Test user not created in previous test');
      }

      const pledgeAmount = 100; // $100 pledge
      
      // Step 1: Create checkout session
      const checkoutResponse = await fetch(`${API_BASE}/api/stripe/checkout`, {
        method: 'POST',
        headers: createAuthHeaders(testUser),
        body: JSON.stringify({
          campaignId: testCampaign.id,
          amountDollars: pledgeAmount,
        }),
      });

      expect(checkoutResponse.status).toBe(200);
      const checkoutData = await checkoutResponse.json();
      expect(checkoutData.sessionId).toBeDefined();
      expect(checkoutData.url).toBeDefined();

      // Verify Stripe session was created
      expect(stripeMock.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([{
            price_data: expect.objectContaining({
              unit_amount: pledgeAmount * 100, // Amount in cents
            }),
          }]),
          metadata: expect.objectContaining({
            campaignId: testCampaign.id,
            userId: testUser.id,
          }),
        })
      );

      // Step 2: Simulate successful payment by triggering webhook
      const webhookEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: checkoutData.sessionId,
            payment_status: 'paid',
            status: 'complete',
            amount_total: pledgeAmount * 100,
            metadata: {
              campaignId: testCampaign.id,
              userId: testUser.id,
            },
          },
        },
      };

      const webhookResponse = await fetch(`${API_BASE}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature',
        },
        body: JSON.stringify(webhookEvent),
      });

      expect(webhookResponse.status).toBe(200);

      // Step 3: Verify pledge was created in database
      const pledge = await testPrisma.pledge.findFirst({
        where: {
          campaignId: testCampaign.id,
          backerId: testUser.id,
        },
        include: {
          campaign: true,
          backer: true,
        },
      });

      expect(pledge).toBeDefined();
      expect(pledge?.amountDollars).toBe(pledgeAmount);
      expect(pledge?.status).toBe('completed');

      // Step 4: Verify confirmation emails were sent
      const pledgeEmails = emailMock.getEmailsBySubject('Pledge');
      expect(pledgeEmails.length).toBeGreaterThan(0);
      
      // Should send confirmation to backer
      const backerEmail = pledgeEmails.find(e => e.to === testUser.email);
      expect(backerEmail).toBeDefined();
      
      // Should send notification to campaign creator
      const creatorEmail = pledgeEmails.find(e => e.to === creatorUser.email);
      expect(creatorEmail).toBeDefined();
    });

    it('should handle pledge cancellation gracefully', async () => {
      if (!testUser) {
        throw new Error('Test user not created in previous test');
      }

      // Create a pledge to cancel
      const pledge = await testPrisma.pledge.create({
        data: {
          campaignId: testCampaign.id,
          backerId: testUser.id,
          amountDollars: 50,
          status: 'pending',
          paymentRef: 'test-payment-ref',
        },
      });

      // Cancel the pledge
      const cancelResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/cancel-pledge`, {
        method: 'POST',
        headers: createAuthHeaders(testUser),
        body: JSON.stringify({
          pledgeId: pledge.id,
        }),
      });

      expect(cancelResponse.status).toBe(200);
      const cancelData = await cancelResponse.json();
      expect(cancelData.success).toBe(true);

      // Verify pledge status updated
      const updatedPledge = await testPrisma.pledge.findUnique({
        where: { id: pledge.id },
      });
      expect(updatedPledge?.status).toBe('cancelled');
    });
  });

  describe('User Settings and Security', () => {
    it('should allow user to update security settings', async () => {
      if (!testUser) {
        throw new Error('Test user not created in previous test');
      }

      const securitySettings = {
        twoFactorEnabled: true,
        loginNotifications: true,
      };

      const settingsResponse = await fetch(`${API_BASE}/api/users/${testUser.id}/settings`, {
        method: 'PUT',
        headers: createAuthHeaders(testUser),
        body: JSON.stringify(securitySettings),
      });

      expect(settingsResponse.status).toBe(200);
      const settingsData = await settingsResponse.json();
      expect(settingsData.success).toBe(true);
    });

    it('should handle user logout properly', async () => {
      if (!testUser) {
        throw new Error('Test user not created in previous test');
      }

      const logoutResponse = await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: createAuthHeaders(testUser),
      });

      expect(logoutResponse.status).toBe(200);
      const logoutData = await logoutResponse.json();
      expect(logoutData.success).toBe(true);
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle registration with existing email', async () => {
      if (!testUser) {
        throw new Error('Test user not created in previous test');
      }

      const duplicateResponse = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email, // Duplicate email
          name: 'Another User',
        }),
      });

      expect(duplicateResponse.status).toBe(400);
      const duplicateData = await duplicateResponse.json();
      expect(duplicateData.success).toBe(false);
      expect(duplicateData.error).toContain('already exists');
    });

    it('should handle network failures during email sending', async () => {
      const testEmail = generateTestEmail('networkfail');
      
      // Simulate email service failure
      emailMock.simulateFailure();

      const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          name: 'Network Fail Test',
        }),
      });

      // Registration should still succeed even if email fails
      expect(registerResponse.status).toBe(201);
      const registerData = await registerResponse.json();
      expect(registerData.success).toBe(true);
      
      // But user should be notified about email issues
      expect(registerData.emailSent).toBe(false);
    });
  });
});
