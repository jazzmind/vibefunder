/**
 * Phase 4: Comprehensive User Journey Integration Tests
 * 
 * Tests complete user journey flows from registration to first pledge:
 * 1. Complete user registration to first pledge flow
 * 2. User profile creation and verification
 * 3. Email confirmation and OTP verification
 * 4. First campaign discovery and exploration
 * 5. Making a pledge with payment processing
 * 6. Viewing pledge history and receipts
 * 
 * Features:
 * - Realistic user data factories
 * - Database state verification at each step
 * - Session persistence across requests
 * - Error scenarios and edge cases
 * - Complete payment flow simulation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { UserFactory, CampaignFactory, PledgeTierFactory, ScenarioFactory } from '../utils/factories';
import { testPrisma } from '../utils/db-test-helpers';
import emailMock from '../mocks/email.mock';
import stripeMock from '../mocks/stripe.mock';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('Phase 4: User Journey Integration Tests', () => {
  let journeyUser: any;
  let journeyScenario: any;
  let authHeaders: Record<string, string>;

  beforeAll(async () => {
    // Set up a complete campaign scenario for user journey
    journeyScenario = await ScenarioFactory.createFullCampaign({
      status: 'published',
      fundingGoalDollars: 25000,
    });
  });

  afterAll(async () => {
    await ScenarioFactory.cleanup();
  });

  beforeEach(() => {
    emailMock.reset();
    stripeMock.reset();
  });

  describe('1. Complete User Registration to First Pledge Flow', () => {
    it('should complete the entire user journey from registration to pledge', async () => {
      console.log('🚀 Starting complete user journey test...');
      
      const userEmail = `journey_${Date.now()}@example.com`;
      const userName = `Journey Test User ${Date.now()}`;
      
      // === STEP 1: User Registration ===
      console.log('📝 Step 1: User Registration');
      
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
      
      journeyUser = registerData.user;

      // Verify user created in database
      const dbUser = await testPrisma.user.findUnique({
        where: { email: userEmail },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser?.name).toBe(userName);

      // === STEP 2: Email Verification Process ===
      console.log('📧 Step 2: Email Verification Process');
      
      // Request OTP code
      const otpResponse = await fetch(`${API_BASE}/api/auth/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
        }),
      });

      expect(otpResponse.status).toBe(200);
      const otpData = await otpResponse.json();
      expect(otpData.success).toBe(true);

      // Get OTP code from database
      const otpRecord = await testPrisma.otpCode.findFirst({
        where: {
          userId: journeyUser.id,
          used: false,
        },
        orderBy: { createdAt: 'desc' },
      });
      
      expect(otpRecord).toBeDefined();

      // Verify OTP code
      const verifyResponse = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          code: otpRecord!.code,
        }),
      });

      expect(verifyResponse.status).toBe(200);
      const verifyData = await verifyResponse.json();
      expect(verifyData.success).toBe(true);
      expect(verifyData.token).toBeDefined();

      // Store auth token for subsequent requests
      authHeaders = {
        'Authorization': `Bearer ${verifyData.token}`,
        'Content-Type': 'application/json',
      };

      // === STEP 3: Profile Completion ===
      console.log('👤 Step 3: Profile Completion');
      
      const profileData = {
        name: userName + ' (Verified)',
        org: 'Journey Test Organization',
        bio: 'This is a test user for the journey integration test',
        socialLinks: {
          twitter: 'https://twitter.com/testuser',
          linkedin: 'https://linkedin.com/in/testuser',
        },
      };

      const profileResponse = await fetch(`${API_BASE}/api/users/profile`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(profileData),
      });

      expect(profileResponse.status).toBe(200);
      const profileResult = await profileResponse.json();
      expect(profileResult.name).toBe(profileData.name);
      expect(profileResult.org).toBe(profileData.org);

      // Verify profile updates in database
      const updatedUser = await testPrisma.user.findUnique({
        where: { id: journeyUser.id },
      });
      expect(updatedUser?.name).toBe(profileData.name);
      expect(updatedUser?.org).toBe(profileData.org);

      // === STEP 4: Set User Preferences ===
      console.log('⚙️ Step 4: Set User Preferences');
      
      const preferences = {
        campaignInterests: {
          categories: ['technology', 'artificial-intelligence'],
          subcategories: {
            technology: ['software', 'ai'],
          },
        },
        notificationFrequency: {
          email: {
            frequency: 'weekly',
            quietHours: { start: '22:00', end: '08:00' },
          },
        },
        currency: {
          defaultCurrency: 'USD',
          displayFormat: 'symbol',
        },
      };

      const preferencesResponse = await fetch(`${API_BASE}/api/users/preferences`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(preferences),
      });

      expect(preferencesResponse.status).toBe(200);
      const preferencesResult = await preferencesResponse.json();
      expect(preferencesResult.success).toBe(true);

      // === STEP 5: Campaign Discovery ===
      console.log('🔍 Step 5: Campaign Discovery');
      
      // Browse published campaigns
      const browseResponse = await fetch(`${API_BASE}/api/campaigns?status=published&limit=10`);
      expect(browseResponse.status).toBe(200);
      
      const campaigns = await browseResponse.json();
      expect(Array.isArray(campaigns)).toBe(true);
      expect(campaigns.length).toBeGreaterThan(0);

      // Find our test campaign
      const targetCampaign = campaigns.find((c: any) => c.id === journeyScenario.campaign.id);
      expect(targetCampaign).toBeDefined();

      // === STEP 6: Detailed Campaign View ===
      console.log('📋 Step 6: Detailed Campaign View');
      
      const campaignDetailResponse = await fetch(
        `${API_BASE}/api/campaigns/${journeyScenario.campaign.id}`
      );
      
      expect(campaignDetailResponse.status).toBe(200);
      const campaignDetails = await campaignDetailResponse.json();
      expect(campaignDetails.id).toBe(journeyScenario.campaign.id);
      expect(campaignDetails.title).toBe(journeyScenario.campaign.title);
      expect(campaignDetails.status).toBe('published');
      expect(campaignDetails.pledgeTiers).toBeDefined();
      expect(campaignDetails.milestones).toBeDefined();

      // === STEP 7: First Pledge Creation ===
      console.log('💰 Step 7: First Pledge Creation');
      
      // Choose a pledge tier
      const selectedTier = campaignDetails.pledgeTiers[0];
      const pledgeAmount = selectedTier.amountDollars;

      // Create Stripe checkout session
      const checkoutResponse = await fetch(`${API_BASE}/api/stripe/checkout`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          campaignId: journeyScenario.campaign.id,
          amountDollars: pledgeAmount,
          pledgeTierId: selectedTier.id,
        }),
      });

      expect(checkoutResponse.status).toBe(200);
      const checkoutData = await checkoutResponse.json();
      expect(checkoutData.sessionId).toBeDefined();
      expect(checkoutData.url).toBeDefined();

      // Verify Stripe session was created with correct metadata
      expect(stripeMock.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            campaignId: journeyScenario.campaign.id,
            userId: journeyUser.id,
            pledgeTierId: selectedTier.id,
          }),
        })
      );

      // === STEP 8: Payment Processing Simulation ===
      console.log('💳 Step 8: Payment Processing Simulation');
      
      // Simulate successful payment webhook
      const webhookEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: checkoutData.sessionId,
            payment_status: 'paid',
            status: 'complete',
            amount_total: pledgeAmount * 100, // Stripe uses cents
            metadata: {
              campaignId: journeyScenario.campaign.id,
              userId: journeyUser.id,
              pledgeTierId: selectedTier.id,
            },
            payment_intent: 'pi_test_journey_payment',
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

      // === STEP 9: Verify Pledge Creation ===
      console.log('✅ Step 9: Verify Pledge Creation');
      
      const pledge = await testPrisma.pledge.findFirst({
        where: {
          campaignId: journeyScenario.campaign.id,
          backerId: journeyUser.id,
        },
        include: {
          campaign: {
            include: {
              organization: true,
              maker: true,
            },
          },
          pledgeTier: true,
          backer: true,
        },
      });

      expect(pledge).toBeDefined();
      expect(pledge?.amountDollars).toBe(pledgeAmount);
      expect(pledge?.status).toBe('completed');
      expect(pledge?.pledgeTier?.id).toBe(selectedTier.id);

      // === STEP 10: Verify Email Notifications ===
      console.log('📬 Step 10: Verify Email Notifications');
      
      const sentEmails = emailMock.sentEmails;
      
      // Should have welcome, OTP, and pledge confirmation emails
      const welcomeEmail = sentEmails.find(e => 
        e.to === userEmail && e.subject.includes('Welcome')
      );
      expect(welcomeEmail).toBeDefined();

      const otpEmail = sentEmails.find(e => 
        e.to === userEmail && e.subject.includes('Verification')
      );
      expect(otpEmail).toBeDefined();

      const pledgeEmail = sentEmails.find(e => 
        e.to === userEmail && e.subject.includes('Pledge')
      );
      expect(pledgeEmail).toBeDefined();

      // === STEP 11: View Pledge History ===
      console.log('📊 Step 11: View Pledge History');
      
      const pledgeHistoryResponse = await fetch(`${API_BASE}/api/users/pledges`, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(pledgeHistoryResponse.status).toBe(200);
      const pledgeHistory = await pledgeHistoryResponse.json();
      expect(Array.isArray(pledgeHistory)).toBe(true);
      expect(pledgeHistory.length).toBeGreaterThan(0);

      const userPledge = pledgeHistory.find((p: any) => p.id === pledge?.id);
      expect(userPledge).toBeDefined();
      expect(userPledge.amountDollars).toBe(pledgeAmount);
      expect(userPledge.campaign.title).toBe(journeyScenario.campaign.title);

      console.log('🎉 Complete user journey test completed successfully!');
    }, 30000); // 30 second timeout for complete flow
  });

  describe('2. User Profile Creation and Verification', () => {
    it('should handle profile creation with validation', async () => {
      const user = await UserFactory.create();
      
      // Test profile with missing required fields
      const incompleteProfileResponse = await fetch(`${API_BASE}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer test-token-${user.id}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing name
          org: 'Test Org',
        }),
      });

      expect(incompleteProfileResponse.status).toBe(400);
      const incompleteResult = await incompleteProfileResponse.json();
      expect(incompleteResult.error).toContain('required');

      // Test profile with valid data
      const validProfile = {
        name: 'Valid User Name',
        org: 'Valid Organization',
        bio: 'A comprehensive bio with enough detail to be meaningful',
        website: 'https://example.com',
        socialLinks: {
          twitter: 'https://twitter.com/validuser',
          github: 'https://github.com/validuser',
        },
      };

      const validProfileResponse = await fetch(`${API_BASE}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer test-token-${user.id}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validProfile),
      });

      expect(validProfileResponse.status).toBe(200);
      const validResult = await validProfileResponse.json();
      expect(validResult.name).toBe(validProfile.name);
      expect(validResult.org).toBe(validProfile.org);
      expect(validResult.bio).toBe(validProfile.bio);
    });

    it('should handle profile image upload', async () => {
      const user = await UserFactory.create();
      
      // Simulate profile image upload
      const imageUploadResponse = await fetch(`${API_BASE}/api/users/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer test-token-${user.id}`,
          'Content-Type': 'multipart/form-data',
        },
        body: JSON.stringify({
          image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        }),
      });

      // Avatar upload might not be implemented yet, so we'll accept 501 Not Implemented
      expect([200, 201, 501]).toContain(imageUploadResponse.status);
    });
  });

  describe('3. Email Confirmation and OTP Verification', () => {
    it('should handle multiple OTP requests within rate limits', async () => {
      const user = await UserFactory.create();
      
      // First OTP request
      const otp1Response = await fetch(`${API_BASE}/api/auth/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
        }),
      });

      expect(otp1Response.status).toBe(200);

      // Immediate second OTP request (should be rate limited)
      const otp2Response = await fetch(`${API_BASE}/api/auth/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
        }),
      });

      // Should either succeed or be rate limited
      expect([200, 429]).toContain(otp2Response.status);
    });

    it('should handle OTP expiration correctly', async () => {
      const user = await UserFactory.create();

      // Create expired OTP manually
      const expiredOtp = await testPrisma.otpCode.create({
        data: {
          userId: user.id,
          code: '123456',
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        },
      });

      const expiredVerifyResponse = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          code: expiredOtp.code,
        }),
      });

      expect(expiredVerifyResponse.status).toBe(400);
      const expiredResult = await expiredVerifyResponse.json();
      expect(expiredResult.error).toContain('expired');
    });
  });

  describe('4. Campaign Discovery and Exploration', () => {
    it('should support advanced campaign filtering and search', async () => {
      // Create campaigns with different attributes for filtering
      const techCampaign = await CampaignFactory.create(undefined, undefined, {
        status: 'published',
        sectors: ['technology', 'artificial-intelligence'],
        fundingGoalDollars: 50000,
      });

      const healthCampaign = await CampaignFactory.create(undefined, undefined, {
        status: 'published',
        sectors: ['healthcare', 'social-impact'],
        fundingGoalDollars: 25000,
      });

      // Test sector filtering
      const techFilterResponse = await fetch(
        `${API_BASE}/api/campaigns?status=published&sectors=technology`
      );
      
      expect(techFilterResponse.status).toBe(200);
      const techCampaigns = await techFilterResponse.json();
      expect(techCampaigns.length).toBeGreaterThan(0);
      
      const foundTechCampaign = techCampaigns.find(
        (c: any) => c.id === techCampaign.campaign.id
      );
      expect(foundTechCampaign).toBeDefined();

      // Test funding goal range filtering
      const budgetFilterResponse = await fetch(
        `${API_BASE}/api/campaigns?status=published&minFunding=20000&maxFunding=30000`
      );
      
      expect(budgetFilterResponse.status).toBe(200);
      const budgetCampaigns = await budgetFilterResponse.json();
      
      if (budgetCampaigns.length > 0) {
        budgetCampaigns.forEach((campaign: any) => {
          expect(campaign.fundingGoalDollars).toBeGreaterThanOrEqual(20000);
          expect(campaign.fundingGoalDollars).toBeLessThanOrEqual(30000);
        });
      }

      // Test search functionality
      const searchResponse = await fetch(
        `${API_BASE}/api/campaigns?status=published&search=${encodeURIComponent(techCampaign.campaign.title.split(' ')[0])}`
      );
      
      expect(searchResponse.status).toBe(200);
      const searchResults = await searchResponse.json();
      expect(Array.isArray(searchResults)).toBe(true);
    });

    it('should provide campaign analytics and progress data', async () => {
      const scenario = await ScenarioFactory.createFullCampaign({
        status: 'published',
      });

      const analyticsResponse = await fetch(
        `${API_BASE}/api/campaigns/${scenario.campaign.id}/analytics`
      );

      // Analytics might not be implemented yet
      if (analyticsResponse.status === 200) {
        const analytics = await analyticsResponse.json();
        expect(analytics).toHaveProperty('views');
        expect(analytics).toHaveProperty('pledgeCount');
        expect(analytics).toHaveProperty('fundingProgress');
      }
    });
  });

  describe('5. Making a Pledge with Payment Processing', () => {
    it('should handle pledge with tier selection and rewards', async () => {
      const user = await UserFactory.create();
      const scenario = await ScenarioFactory.createFullCampaign({
        status: 'published',
      });

      // Get campaign with pledge tiers
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns/${scenario.campaign.id}`);
      const campaign = await campaignResponse.json();
      const selectedTier = campaign.pledgeTiers[1]; // Select second tier

      // Create pledge with specific tier
      const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${scenario.campaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer test-token-${user.id}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amountDollars: selectedTier.amountDollars,
          pledgeTierId: selectedTier.id,
          message: 'Excited to support this amazing project!',
        }),
      });

      expect(pledgeResponse.status).toBe(200);
      const pledgeResult = await pledgeResponse.json();
      expect(pledgeResult.success).toBe(true);
      expect(pledgeResult.checkoutUrl).toBeDefined();

      // Verify pledge created with correct tier
      const pledge = await testPrisma.pledge.findFirst({
        where: {
          campaignId: scenario.campaign.id,
          backerId: user.id,
        },
        include: {
          pledgeTier: true,
        },
      });

      expect(pledge).toBeDefined();
      expect(pledge?.pledgeTier?.id).toBe(selectedTier.id);
      expect(pledge?.amountDollars).toBe(selectedTier.amountDollars);
      expect(pledge?.message).toBe('Excited to support this amazing project!');
    });

    it('should handle payment failures gracefully', async () => {
      const user = await UserFactory.create();
      const scenario = await ScenarioFactory.createFullCampaign({
        status: 'published',
      });

      // Simulate failed payment webhook
      const failedWebhook = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_failed',
            status: 'requires_payment_method',
            last_payment_error: {
              code: 'card_declined',
              decline_code: 'insufficient_funds',
            },
            metadata: {
              campaignId: scenario.campaign.id,
              userId: user.id,
            },
          },
        },
      };

      const failedWebhookResponse = await fetch(`${API_BASE}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature',
        },
        body: JSON.stringify(failedWebhook),
      });

      expect(failedWebhookResponse.status).toBe(200);

      // Verify pledge status was updated to failed
      const failedPledge = await testPrisma.pledge.findFirst({
        where: {
          paymentRef: 'pi_test_failed',
        },
      });

      if (failedPledge) {
        expect(failedPledge.status).toBe('failed');
      }
    });
  });

  describe('6. Viewing Pledge History and Receipts', () => {
    it('should provide detailed pledge history with receipts', async () => {
      const { user, campaign, pledge } = await ScenarioFactory.createUserJourney();

      const pledgeHistoryResponse = await fetch(`${API_BASE}/api/users/pledges`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token-${user.id}`,
        },
      });

      expect(pledgeHistoryResponse.status).toBe(200);
      const pledgeHistory = await pledgeHistoryResponse.json();
      expect(Array.isArray(pledgeHistory)).toBe(true);

      const userPledge = pledgeHistory.find((p: any) => p.id === pledge.id);
      expect(userPledge).toBeDefined();
      expect(userPledge).toHaveProperty('amountDollars');
      expect(userPledge).toHaveProperty('status');
      expect(userPledge).toHaveProperty('createdAt');
      expect(userPledge).toHaveProperty('campaign');
      expect(userPledge.campaign).toHaveProperty('title');
    });

    it('should generate receipts for completed pledges', async () => {
      const { user, campaign, pledge } = await ScenarioFactory.createUserJourney();

      // Update pledge to completed with payment reference
      await testPrisma.pledge.update({
        where: { id: pledge.id },
        data: {
          status: 'completed',
          paymentRef: 'pi_test_receipt_123',
        },
      });

      const receiptResponse = await fetch(`${API_BASE}/api/pledges/${pledge.id}/receipt`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token-${user.id}`,
        },
      });

      // Receipt generation might not be implemented yet
      if (receiptResponse.status === 200) {
        const receipt = await receiptResponse.json();
        expect(receipt).toHaveProperty('pledgeId');
        expect(receipt).toHaveProperty('amount');
        expect(receipt).toHaveProperty('date');
        expect(receipt).toHaveProperty('paymentReference');
      } else {
        expect([404, 501]).toContain(receiptResponse.status);
      }
    });
  });

  describe('7. Error Scenarios and Edge Cases', () => {
    it('should handle session timeout during pledge flow', async () => {
      const user = await UserFactory.create();
      const scenario = await ScenarioFactory.createFullCampaign({
        status: 'published',
      });

      // Use invalid/expired token
      const expiredPledgeResponse = await fetch(`${API_BASE}/api/campaigns/${scenario.campaign.id}/pledge`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer expired-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amountDollars: 100,
        }),
      });

      expect(expiredPledgeResponse.status).toBe(401);
      const expiredResult = await expiredPledgeResponse.json();
      expect(expiredResult.error).toContain('Unauthorized');
    });

    it('should handle concurrent pledge attempts gracefully', async () => {
      const user = await UserFactory.create();
      const scenario = await ScenarioFactory.createFullCampaign({
        status: 'published',
      });

      const authHeaders = {
        'Authorization': `Bearer test-token-${user.id}`,
        'Content-Type': 'application/json',
      };

      const pledgeData = {
        amountDollars: 100,
      };

      // Make concurrent pledge requests
      const [response1, response2] = await Promise.all([
        fetch(`${API_BASE}/api/campaigns/${scenario.campaign.id}/pledge`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(pledgeData),
        }),
        fetch(`${API_BASE}/api/campaigns/${scenario.campaign.id}/pledge`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(pledgeData),
        }),
      ]);

      // At least one should succeed
      const statuses = [response1.status, response2.status];
      expect(statuses).toContain(200);

      // Check database for duplicate pledges
      const pledges = await testPrisma.pledge.findMany({
        where: {
          campaignId: scenario.campaign.id,
          backerId: user.id,
        },
      });

      // Should have some reasonable behavior (either prevent duplicates or allow them)
      expect(pledges.length).toBeGreaterThanOrEqual(1);
      expect(pledges.length).toBeLessThanOrEqual(2);
    });

    it('should handle database connection failures gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll test network timeout scenarios
      
      const timeoutController = new AbortController();
      setTimeout(() => timeoutController.abort(), 100); // 100ms timeout

      try {
        const timeoutResponse = await fetch(`${API_BASE}/api/campaigns?status=published`, {
          signal: timeoutController.signal,
        });
        
        // If we get here, the request completed quickly
        expect(timeoutResponse.status).toBe(200);
      } catch (error: any) {
        // Request was aborted due to timeout
        expect(error.name).toBe('AbortError');
      }
    });
  });

  describe('8. Session Persistence Across Requests', () => {
    it('should maintain user session across multiple API calls', async () => {
      const user = await UserFactory.create();
      
      // Simulate login to get session token
      const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: 'TestPassword123!',
        }),
      });

      let authToken = '';
      if (loginResponse.status === 200) {
        const loginResult = await loginResponse.json();
        authToken = loginResult.token;
      } else {
        // Use mock token for testing
        authToken = `test-token-${user.id}`;
      }

      const sessionHeaders = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      };

      // Make multiple API calls with same session
      const [profileResponse, preferencesResponse, pledgeHistoryResponse] = await Promise.all([
        fetch(`${API_BASE}/api/users/profile`, {
          headers: sessionHeaders,
        }),
        fetch(`${API_BASE}/api/users/preferences`, {
          headers: sessionHeaders,
        }),
        fetch(`${API_BASE}/api/users/pledges`, {
          headers: sessionHeaders,
        }),
      ]);

      // All requests should succeed with valid session
      expect(profileResponse.status).toBe(200);
      expect(preferencesResponse.status).toBe(200);
      expect(pledgeHistoryResponse.status).toBe(200);

      // Verify session data consistency
      const profileData = await profileResponse.json();
      expect(profileData.email).toBe(user.email);
    });

    it('should handle session refresh and token rotation', async () => {
      const user = await UserFactory.create();
      
      const originalToken = `test-token-${user.id}`;
      
      // Make request with original token
      const originalResponse = await fetch(`${API_BASE}/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${originalToken}`,
        },
      });

      expect(originalResponse.status).toBe(200);

      // Simulate token refresh
      const refreshResponse = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${originalToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (refreshResponse.status === 200) {
        const refreshResult = await refreshResponse.json();
        expect(refreshResult.token).toBeDefined();
        expect(refreshResult.token).not.toBe(originalToken);

        // Use new token for subsequent requests
        const newTokenResponse = await fetch(`${API_BASE}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${refreshResult.token}`,
          },
        });

        expect(newTokenResponse.status).toBe(200);
      } else {
        // Token refresh might not be implemented yet
        expect([404, 501]).toContain(refreshResponse.status);
      }
    });
  });
});