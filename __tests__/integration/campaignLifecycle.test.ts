/**
 * Campaign Creation and Lifecycle Integration Tests
 * 
 * Tests complete campaign lifecycle from creation to completion:
 * - Campaign creation and validation
 * - Adding milestones and pledge tiers
 * - Campaign publishing workflow
 * - Receiving pledges and managing backers
 * - Milestone tracking and updates
 * - Campaign completion and fulfillment
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import {
  createTestUser,
  createTestCampaign,
  createTestOrganization,
  createTestMilestone,
  createTestPledgeTier,
  generateTestEmail,
  createAuthHeaders,
  setupTestEnvironment,
  teardownTestEnvironment,
  testPrisma,
} from '../utils/test-helpers';
import emailMock from '../mocks/email.mock';
import stripeMock from '../mocks/stripe.mock';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('Campaign Lifecycle Integration - Phase 4 Enhanced', () => {
  let creatorUser: any;
  let backerUser: any;
  let adminUser: any;
  let testOrganization: any;
  let testCampaign: any;

  beforeAll(async () => {
    await setupTestEnvironment();
    
    // Create test users
    creatorUser = await createTestUser({
      email: generateTestEmail('creator'),
      name: 'Campaign Creator',
      roles: ['user'],
    });
    
    backerUser = await createTestUser({
      email: generateTestEmail('backer'),
      name: 'Campaign Backer',
      roles: ['user'],
    });
    
    adminUser = await createTestUser({
      email: generateTestEmail('admin'),
      name: 'Admin User',
      roles: ['admin'],
    });
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(() => {
    emailMock.reset();
    stripeMock.reset();
  });

  describe('Campaign Creation Process', () => {
    it('should create organization and initial campaign', async () => {
      // Step 1: Create organization
      const orgResponse = await fetch(`${API_BASE}/api/organizations`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          name: 'Revolutionary AI Startup',
          email: generateTestEmail('startup'),
          description: 'Building the future of AI-powered data analysis',
          website: 'https://ai-startup.example.com',
          type: 'startup',
        }),
      });

      expect(orgResponse.status).toBe(201);
      testOrganization = await orgResponse.json();
      expect(testOrganization.id).toBeDefined();
      expect(testOrganization.ownerId).toBe(creatorUser.id);
      expect(testOrganization.name).toBe('Revolutionary AI Startup');

      // Step 2: Create campaign
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          title: 'AI-Powered Data Analytics Platform',
          summary: 'Revolutionary platform that transforms how businesses analyze and visualize their data using cutting-edge AI algorithms',
          description: `# The Future of Data Analytics

## Problem We're Solving
Businesses struggle to make sense of their data. Current tools are complex, expensive, and require specialized knowledge.

## Our Solution
Our AI-powered platform makes data analytics accessible to everyone:
- **Natural Language Queries**: Ask questions in plain English
- **Automated Insights**: AI identifies patterns and anomalies
- **Beautiful Visualizations**: Charts and dashboards that tell your data's story
- **Real-time Processing**: Get insights as your data streams in

## Why Now?
The convergence of advanced AI, cloud computing, and increasing data volumes creates the perfect opportunity for disruption.

## Team Expertise
Our team combines decades of experience in AI research, data engineering, and product development.`,
          fundingGoalDollars: 150000,
          organizationId: testOrganization.id,
          sectors: ['technology', 'artificial-intelligence', 'enterprise-software'],
          deployModes: ['cloud', 'on-premise', 'hybrid'],
        }),
      });

      expect(campaignResponse.status).toBe(201);
      testCampaign = await campaignResponse.json();
      expect(testCampaign.id).toBeDefined();
      expect(testCampaign.makerId).toBe(creatorUser.id);
      expect(testCampaign.organizationId).toBe(testOrganization.id);
      expect(testCampaign.status).toBe('draft');
      expect(testCampaign.fundingGoalDollars).toBe(150000);
    });

    it('should add comprehensive milestones to campaign', async () => {
      const milestones = [
        {
          name: 'MVP Development Complete',
          pct: 25,
          dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          acceptance: {
            criteria: 'Functional MVP with core AI features including natural language processing, basic analytics, and user dashboard',
            deliverables: [
              'Working prototype accessible via web interface',
              'API documentation for core endpoints',
              'Basic user authentication system',
              'Sample dataset processing capabilities',
            ],
          },
        },
        {
          name: 'Beta Testing Platform',
          pct: 50,
          dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          acceptance: {
            criteria: 'Beta platform ready for limited user testing with advanced AI features',
            deliverables: [
              'Beta testing environment deployed',
              'Advanced AI analytics engine',
              'User onboarding flow',
              '10+ beta testers successfully onboarded',
              'Performance benchmarks documented',
            ],
          },
        },
        {
          name: 'Production Release v1.0',
          pct: 100,
          dueDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
          acceptance: {
            criteria: 'Full production-ready platform with enterprise features',
            deliverables: [
              'Production deployment with 99.9% uptime SLA',
              'Enterprise security compliance (SOC 2)',
              'Multi-tenant architecture',
              'Customer support system',
              'Pricing and billing integration',
            ],
          },
        },
      ];

      const createdMilestones = [];
      for (const milestone of milestones) {
        const milestoneResponse = await fetch(`${API_BASE}/api/milestones`, {
          method: 'POST',
          headers: createAuthHeaders(creatorUser),
          body: JSON.stringify({
            campaignId: testCampaign.id,
            ...milestone,
          }),
        });

        expect(milestoneResponse.status).toBe(201);
        const createdMilestone = await milestoneResponse.json();
        expect(createdMilestone.campaignId).toBe(testCampaign.id);
        expect(createdMilestone.name).toBe(milestone.name);
        createdMilestones.push(createdMilestone);
      }

      expect(createdMilestones).toHaveLength(3);

      // Verify milestones in database
      const dbMilestones = await testPrisma.milestone.findMany({
        where: { campaignId: testCampaign.id },
        orderBy: { pct: 'asc' },
      });
      expect(dbMilestones).toHaveLength(3);
      expect(dbMilestones[0].pct).toBe(25);
      expect(dbMilestones[2].pct).toBe(100);
    });

    it('should add multiple pledge tiers with benefits', async () => {
      const pledgeTiers = [
        {
          title: 'Early Bird Supporter',
          description: 'Get in early and support our mission',
          amountDollars: 25,
          benefits: [
            'Early access to beta platform',
            'Monthly progress updates',
            'Community Discord access',
            'Digital thank you certificate',
          ],
          maxBackers: 100,
        },
        {
          title: 'Professional Analyst',
          description: 'Perfect for data professionals and small teams',
          amountDollars: 99,
          benefits: [
            'All Early Bird benefits',
            '3 months free premium access',
            'Priority customer support',
            'Advanced analytics features',
            'Custom dashboard themes',
          ],
          maxBackers: 500,
        },
        {
          title: 'Enterprise Pioneer',
          description: 'For organizations ready to transform their data analytics',
          amountDollars: 499,
          benefits: [
            'All Professional benefits',
            '12 months enterprise license',
            'Dedicated account manager',
            'Custom integrations consultation',
            'On-premise deployment option',
            'Training sessions for team',
          ],
          maxBackers: 50,
        },
        {
          title: 'Strategic Partner',
          description: 'Partnership tier for serious backers and investors',
          amountDollars: 2500,
          benefits: [
            'All Enterprise benefits',
            'Lifetime enterprise license',
            'Product roadmap influence',
            'Co-marketing opportunities',
            'Revenue sharing agreement',
            'Board observer rights',
          ],
          maxBackers: 10,
        },
      ];

      const createdTiers = [];
      for (const tier of pledgeTiers) {
        const tierResponse = await fetch(`${API_BASE}/api/pledge-tiers`, {
          method: 'POST',
          headers: createAuthHeaders(creatorUser),
          body: JSON.stringify({
            campaignId: testCampaign.id,
            ...tier,
          }),
        });

        expect(tierResponse.status).toBe(201);
        const createdTier = await tierResponse.json();
        expect(createdTier.campaignId).toBe(testCampaign.id);
        expect(createdTier.amountDollars).toBe(tier.amountDollars);
        createdTiers.push(createdTier);
      }

      expect(createdTiers).toHaveLength(4);

      // Verify tiers in database
      const dbTiers = await testPrisma.pledgeTier.findMany({
        where: { campaignId: testCampaign.id },
        orderBy: { amountDollars: 'asc' },
      });
      expect(dbTiers).toHaveLength(4);
      expect(dbTiers[0].amountDollars).toBe(25);
      expect(dbTiers[3].amountDollars).toBe(2500);
    });

    it('should validate campaign before publishing', async () => {
      // Attempt to publish without completing all requirements
      const invalidPublishResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`, {
        method: 'PUT',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          status: 'published',
          // Missing required fields like endsAt
        }),
      });

      // Should fail validation
      expect(invalidPublishResponse.status).toBe(400);
      const errorData = await invalidPublishResponse.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toBeDefined();
    });

    it('should successfully publish campaign', async () => {
      const publishResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`, {
        method: 'PUT',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          status: 'published',
          endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
        }),
      });

      expect(publishResponse.status).toBe(200);
      const updatedCampaign = await publishResponse.json();
      expect(updatedCampaign.status).toBe('published');
      expect(updatedCampaign.endsAt).toBeDefined();

      testCampaign = updatedCampaign;

      // Verify campaign is visible in public listings
      const publicResponse = await fetch(`${API_BASE}/api/campaigns?status=published`);
      expect(publicResponse.status).toBe(200);
      const publicCampaigns = await publicResponse.json();
      
      const foundCampaign = publicCampaigns.find((c: any) => c.id === testCampaign.id);
      expect(foundCampaign).toBeDefined();
    });
  });

  describe('Campaign Management and Updates', () => {

    it('should enforce campaign owner permissions', async () => {
      // Create another user who is not the campaign owner
      const unauthorizedUser = await createTestUser({
        email: generateTestEmail('unauthorized'),
        name: 'Unauthorized User',
        roles: ['user'],
      });

      // Attempt to update campaign as non-owner
      const unauthorizedUpdateResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`, {
        method: 'PUT',
        headers: createAuthHeaders(unauthorizedUser),
        body: JSON.stringify({
          title: 'Hacked Title - Should Not Work',
          description: 'This should fail due to permissions',
        }),
      });

      expect(unauthorizedUpdateResponse.status).toBe(403);
      const errorData = await unauthorizedUpdateResponse.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('permission');

      // Verify campaign wasn't changed
      const verifyResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      const verifiedCampaign = await verifyResponse.json();
      expect(verifiedCampaign.title).toBe(testCampaign.title); // Original title unchanged
    });

    it('should validate state transitions', async () => {
      // Create a new draft campaign for state transition testing
      const draftCampaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          title: 'State Transition Test Campaign',
          summary: 'Testing campaign state transitions',
          fundingGoalDollars: 25000,
          organizationId: testOrganization.id,
        }),
      });

      expect(draftCampaignResponse.status).toBe(201);
      const draftCampaign = await draftCampaignResponse.json();
      expect(draftCampaign.status).toBe('draft');

      // Test invalid state transition (draft to completed without being published)
      const invalidTransitionResponse = await fetch(`${API_BASE}/api/campaigns/${draftCampaign.id}`, {
        method: 'PUT',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          status: 'completed', // Invalid transition from draft
        }),
      });

      expect(invalidTransitionResponse.status).toBe(400);
      const invalidData = await invalidTransitionResponse.json();
      expect(invalidData.success).toBe(false);
      expect(invalidData.error).toContain('Invalid state transition');

      // Test valid transition: draft -> published
      const validTransitionResponse = await fetch(`${API_BASE}/api/campaigns/${draftCampaign.id}`, {
        method: 'PUT',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          status: 'published',
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        }),
      });

      expect(validTransitionResponse.status).toBe(200);
      const publishedCampaign = await validTransitionResponse.json();
      expect(publishedCampaign.status).toBe('published');
      expect(publishedCampaign.endsAt).toBeDefined();
    });

    it('should enforce business rule validations', async () => {
      // Test minimum funding goal enforcement
      const lowFundingResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          title: 'Low Funding Campaign',
          summary: 'Campaign with too low funding goal',
          fundingGoalDollars: 100, // Below minimum
          organizationId: testOrganization.id,
        }),
      });

      expect(lowFundingResponse.status).toBe(400);
      const lowFundingData = await lowFundingResponse.json();
      expect(lowFundingData.success).toBe(false);
      expect(lowFundingData.error).toContain('minimum');

      // Test maximum funding goal enforcement
      const highFundingResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          title: 'High Funding Campaign',
          summary: 'Campaign with too high funding goal',
          fundingGoalDollars: 10000000, // Above maximum
          organizationId: testOrganization.id,
        }),
      });

      expect(highFundingResponse.status).toBe(400);
      const highFundingData = await highFundingResponse.json();
      expect(highFundingData.success).toBe(false);
      expect(highFundingData.error).toContain('maximum');

      // Test campaign duration limits
      const longDurationResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          title: 'Long Duration Campaign',
          summary: 'Campaign with excessive duration',
          fundingGoalDollars: 50000,
          organizationId: testOrganization.id,
          endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        }),
      });

      expect(longDurationResponse.status).toBe(400);
      const longDurationData = await longDurationResponse.json();
      expect(longDurationData.success).toBe(false);
      expect(longDurationData.error).toContain('duration');
    });

    it('should track campaign analytics events', async () => {
      // View campaign to trigger analytics
      const viewResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      expect(viewResponse.status).toBe(200);

      // Check analytics were recorded
      const analyticsResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/analytics`, {
        headers: createAuthHeaders(creatorUser),
      });

      expect(analyticsResponse.status).toBe(200);
      const analytics = await analyticsResponse.json();
      expect(analytics.viewCount).toBeGreaterThan(0);
      expect(analytics.uniqueViews).toBeGreaterThanOrEqual(0);
      expect(analytics.conversionRate).toBeDefined();
      expect(analytics.dailyViews).toBeDefined();
      expect(analytics.referrers).toBeDefined();
    });
    it('should allow creator to post campaign updates', async () => {
      const updates = [
        {
          title: 'Development Kickoff',
          content: `# We're officially starting development!

Thanks to all our amazing backers, we've reached our initial milestone and are beginning development of the AI analytics platform.

## What's Next:
- Setting up development infrastructure
- Beginning core AI algorithm development
- Designing user interface mockups

We'll keep you updated with weekly progress reports!`,
          isPublic: true,
        },
        {
          title: 'Technical Deep Dive - For Backers Only',
          content: `# Technical Architecture Overview

## AI Engine Components:
- Natural Language Processing module
- Pattern recognition algorithms
- Real-time data streaming pipeline
- Visualization generation engine

This update is only visible to our backers as a thank you for your support!`,
          isPublic: false,
        },
      ];

      for (const update of updates) {
        const updateResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/updates`, {
          method: 'POST',
          headers: createAuthHeaders(creatorUser),
          body: JSON.stringify(update),
        });

        expect(updateResponse.status).toBe(201);
        const createdUpdate = await updateResponse.json();
        expect(createdUpdate.campaignId).toBe(testCampaign.id);
        expect(createdUpdate.authorId).toBe(creatorUser.id);
        expect(createdUpdate.title).toBe(update.title);
        expect(createdUpdate.isPublic).toBe(update.isPublic);
      }

      // Verify updates are stored
      const dbUpdates = await testPrisma.campaignUpdate.findMany({
        where: { campaignId: testCampaign.id },
      });
      expect(dbUpdates).toHaveLength(2);
    });

    it('should track campaign analytics and metrics', async () => {
      const analyticsResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/analytics`, {
        headers: createAuthHeaders(creatorUser),
      });

      expect(analyticsResponse.status).toBe(200);
      const analytics = await analyticsResponse.json();
      expect(analytics.viewCount).toBeGreaterThanOrEqual(0);
      expect(analytics.pledgeCount).toBeGreaterThanOrEqual(0);
      expect(analytics.raisedAmount).toBeGreaterThanOrEqual(0);
      expect(analytics.fundingProgress).toBeDefined();
    });
  });

  describe('Stretch Goal Implementation', () => {
    it('should create and manage stretch goals', async () => {
      const stretchGoals = [
        {
          title: 'Advanced AI Features',
          description: 'Enhanced machine learning algorithms for better predictions',
          targetDollars: 200000,
          order: 1,
        },
        {
          title: 'Mobile App Development',
          description: 'Native iOS and Android applications',
          targetDollars: 300000,
          order: 2,
        },
        {
          title: 'Enterprise Integrations',
          description: 'Salesforce, HubSpot, and Microsoft integrations',
          targetDollars: 450000,
          order: 3,
        },
      ];

      const createdStretchGoals = [];
      for (const goal of stretchGoals) {
        const goalResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/stretch-goals`, {
          method: 'POST',
          headers: createAuthHeaders(creatorUser),
          body: JSON.stringify(goal),
        });

        expect(goalResponse.status).toBe(201);
        const createdGoal = await goalResponse.json();
        expect(createdGoal.campaignId).toBe(testCampaign.id);
        expect(createdGoal.title).toBe(goal.title);
        expect(createdGoal.targetDollars).toBe(goal.targetDollars);
        expect(createdGoal.isUnlocked).toBe(false);
        createdStretchGoals.push(createdGoal);
      }

      expect(createdStretchGoals).toHaveLength(3);

      // Verify stretch goals in database
      const dbStretchGoals = await testPrisma.stretchGoal.findMany({
        where: { campaignId: testCampaign.id },
        orderBy: { order: 'asc' },
      });
      expect(dbStretchGoals).toHaveLength(3);
      expect(dbStretchGoals[0].targetDollars).toBe(200000);
      expect(dbStretchGoals[2].targetDollars).toBe(450000);
    });

    it('should unlock stretch goals when funding targets are met', async () => {
      // Simulate campaign reaching first stretch goal
      await testPrisma.campaign.update({
        where: { id: testCampaign.id },
        data: { raisedDollars: 250000 }, // Above first stretch goal
      });

      const unlockResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/check-stretch-goals`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
      });

      expect(unlockResponse.status).toBe(200);
      const unlockResult = await unlockResponse.json();
      expect(unlockResult.unlockedGoals).toHaveLength(1);

      // Verify first stretch goal is unlocked
      const updatedGoals = await testPrisma.stretchGoal.findMany({
        where: { campaignId: testCampaign.id },
        orderBy: { order: 'asc' },
      });
      
      expect(updatedGoals[0].isUnlocked).toBe(true);
      expect(updatedGoals[1].isUnlocked).toBe(false); // Second goal not reached yet
    });
  });

  describe('Milestone Tracking and Progress', () => {
    it('should allow milestone progress updates', async () => {
      // Get first milestone
      const milestones = await testPrisma.milestone.findMany({
        where: { campaignId: testCampaign.id },
        orderBy: { pct: 'asc' },
      });
      
      const firstMilestone = milestones[0];

      // Update milestone status
      const progressResponse = await fetch(`${API_BASE}/api/milestones/${firstMilestone.id}`, {
        method: 'PUT',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          status: 'in_progress',
          evidence: [
            {
              type: 'github_commit',
              url: 'https://github.com/ai-startup/platform/commit/abc123def456',
              description: 'Core AI algorithm implementation - natural language processing module',
              timestamp: new Date().toISOString(),
            },
            {
              type: 'screenshot',
              url: 'https://example.com/screenshots/mvp-dashboard.png',
              description: 'Early prototype of user dashboard interface',
              timestamp: new Date().toISOString(),
            },
            {
              type: 'demo_video',
              url: 'https://vimeo.com/example-demo',
              description: 'Demo video showing natural language query functionality',
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      expect(progressResponse.status).toBe(200);
      const updatedMilestone = await progressResponse.json();
      expect(updatedMilestone.status).toBe('in_progress');
      expect(updatedMilestone.evidence).toHaveLength(3);

      // Later, complete the milestone
      const completeResponse = await fetch(`${API_BASE}/api/milestones/${firstMilestone.id}`, {
        method: 'PUT',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          status: 'completed',
          completedAt: new Date().toISOString(),
          evidence: [
            ...updatedMilestone.evidence,
            {
              type: 'deployment',
              url: 'https://mvp-demo.ai-startup.com',
              description: 'Live MVP deployment with full functionality',
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      expect(completeResponse.status).toBe(200);
      const completedMilestone = await completeResponse.json();
      expect(completedMilestone.status).toBe('completed');
      expect(completedMilestone.completedAt).toBeDefined();
    });

    it('should send milestone completion notifications', async () => {
      // Check that milestone completion triggered notifications
      const milestoneEmails = emailMock.getEmailsBySubject('Milestone');
      expect(milestoneEmails.length).toBeGreaterThan(0);

      // Should notify creator about milestone completion
      const creatorNotification = milestoneEmails.find(e => e.to === creatorUser.email);
      expect(creatorNotification).toBeDefined();
    });
  });

  describe('Backer Interaction and Community', () => {
    it('should allow backers to comment on campaigns', async () => {
      const comments = [
        {
          content: 'This looks incredibly promising! The AI approach to natural language queries is exactly what our team needs. Looking forward to the beta release!',
        },
        {
          content: 'Great progress on the MVP! The demo video really shows the potential. Any plans for integrating with existing BI tools like Tableau?',
        },
      ];

      for (const comment of comments) {
        const commentResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/comments`, {
          method: 'POST',
          headers: createAuthHeaders(backerUser),
          body: JSON.stringify(comment),
        });

        expect(commentResponse.status).toBe(201);
        const createdComment = await commentResponse.json();
        expect(createdComment.campaignId).toBe(testCampaign.id);
        expect(createdComment.userId).toBe(backerUser.id);
        expect(createdComment.content).toBe(comment.content);
      }

      // Verify comments are stored and retrievable
      const commentsResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/comments`);
      expect(commentsResponse.status).toBe(200);
      const campaignComments = await commentsResponse.json();
      expect(campaignComments.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow creators to respond to comments', async () => {
      // Get existing comments
      const commentsResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/comments`);
      const comments = await commentsResponse.json();
      const backerComment = comments.find((c: any) => c.content.includes('Tableau'));

      // Creator responds to comment
      const replyResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/comments`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          content: `@${backerUser.name} Great question about Tableau integration! We're planning to build REST APIs that will make integration with existing BI tools straightforward. Tableau integration is definitely on our roadmap for v1.1. Thanks for the feedback!`,
          parentId: backerComment.id,
        }),
      });

      expect(replyResponse.status).toBe(201);
      const reply = await replyResponse.json();
      expect(reply.parentId).toBe(backerComment.id);
      expect(reply.userId).toBe(creatorUser.id);
    });
  });

  describe('Campaign Performance and Analytics', () => {
    it('should track detailed campaign metrics', async () => {
      const metricsResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/metrics`, {
        headers: createAuthHeaders(creatorUser),
      });

      expect(metricsResponse.status).toBe(200);
      const metrics = await metricsResponse.json();
      
      expect(metrics).toHaveProperty('views');
      expect(metrics).toHaveProperty('pledges');
      expect(metrics).toHaveProperty('conversion');
      expect(metrics).toHaveProperty('engagement');
      expect(metrics).toHaveProperty('milestoneProgress');
    });

    it('should provide funding progress analytics', async () => {
      const progressResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/funding-progress`, {
        headers: createAuthHeaders(creatorUser),
      });

      expect(progressResponse.status).toBe(200);
      const progress = await progressResponse.json();
      
      expect(progress.totalRaised).toBeGreaterThanOrEqual(0);
      expect(progress.goalAmount).toBe(testCampaign.fundingGoalDollars);
      expect(progress.percentFunded).toBeDefined();
      expect(progress.daysRemaining).toBeDefined();
      expect(progress.averagePledge).toBeDefined();
    });
  });

  describe('Campaign State Transitions', () => {
    it('should handle campaign suspension by admin', async () => {
      const suspendResponse = await fetch(`${API_BASE}/api/admin/campaigns/${testCampaign.id}/suspend`, {
        method: 'POST',
        headers: createAuthHeaders(adminUser),
        body: JSON.stringify({
          reason: 'Policy violation review',
          notifyCreator: true,
        }),
      });

      expect(suspendResponse.status).toBe(200);
      const suspendResult = await suspendResponse.json();
      expect(suspendResult.success).toBe(true);

      // Verify campaign is suspended
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      const updatedCampaign = await campaignResponse.json();
      expect(updatedCampaign.status).toBe('suspended');

      // Check notification email was sent
      const suspensionEmails = emailMock.getEmailsBySubject('suspended');
      expect(suspensionEmails.length).toBeGreaterThan(0);
    });

    it('should allow admin to reactivate campaign', async () => {
      const reactivateResponse = await fetch(`${API_BASE}/api/admin/campaigns/${testCampaign.id}/reactivate`, {
        method: 'POST',
        headers: createAuthHeaders(adminUser),
        body: JSON.stringify({
          reason: 'Review completed - no violations found',
          notifyCreator: true,
        }),
      });

      expect(reactivateResponse.status).toBe(200);
      const reactivateResult = await reactivateResponse.json();
      expect(reactivateResult.success).toBe(true);

      // Verify campaign is back to published status
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      const reactivatedCampaign = await campaignResponse.json();
      expect(reactivatedCampaign.status).toBe('published');

      testCampaign = reactivatedCampaign;
    });
  });

  describe('Campaign Progress Tracking', () => {
    it('should track campaign funding progress over time', async () => {
      // Create multiple pledges to track progress
      const pledgeAmounts = [500, 1000, 750, 1200, 800];
      
      for (const amount of pledgeAmounts) {
        const pledge = await testPrisma.pledge.create({
          data: {
            campaignId: testCampaign.id,
            backerId: backerUser.id,
            amountDollars: amount,
            status: 'completed',
          },
        });
        
        // Update campaign raised amount
        await testPrisma.campaign.update({
          where: { id: testCampaign.id },
          data: {
            raisedDollars: { increment: amount },
          },
        });
        
        // Small delay to simulate time progression
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check funding progress
      const progressResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/funding-progress`, {
        headers: createAuthHeaders(creatorUser),
      });

      expect(progressResponse.status).toBe(200);
      const progress = await progressResponse.json();
      
      expect(progress.totalRaised).toBe(4250); // Sum of pledge amounts
      expect(progress.goalAmount).toBe(testCampaign.fundingGoalDollars);
      expect(progress.percentFunded).toBeGreaterThan(0);
      expect(progress.pledgeCount).toBe(pledgeAmounts.length);
      expect(progress.averagePledge).toBe(850); // 4250 / 5
      expect(progress.timeline).toBeDefined();
      expect(progress.milestoneProgress).toBeDefined();
    });

    it('should calculate time-based metrics', async () => {
      const metricsResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/time-metrics`, {
        headers: createAuthHeaders(creatorUser),
      });

      expect(metricsResponse.status).toBe(200);
      const metrics = await metricsResponse.json();
      
      expect(metrics.daysRemaining).toBeDefined();
      expect(metrics.daysElapsed).toBeDefined();
      expect(metrics.totalDuration).toBeDefined();
      expect(metrics.progressRate).toBeDefined(); // Funding per day
      expect(metrics.projectedTotal).toBeDefined();
      expect(metrics.timeToGoal).toBeDefined();
    });
  });

  describe('Campaign Completion and Fulfillment', () => {
    it('should handle campaign successful completion', async () => {
      // Simulate campaign reaching funding goal
      await testPrisma.campaign.update({
        where: { id: testCampaign.id },
        data: {
          raisedDollars: testCampaign.fundingGoalDollars + 10000, // Exceed goal
          status: 'successful',
        },
      });

      const completionResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/complete`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          completionMessage: 'Thank you to all our amazing backers! We exceeded our goal and are excited to deliver on our promises.',
        }),
      });

      expect(completionResponse.status).toBe(200);
      const completionResult = await completionResponse.json();
      expect(completionResult.success).toBe(true);

      // Verify completion emails were sent
      const completionEmails = emailMock.getEmailsBySubject('Campaign Successful');
      expect(completionEmails.length).toBeGreaterThan(0);
    });

    it('should track post-campaign fulfillment', async () => {
      const fulfillmentResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/fulfillment`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          status: 'in_progress',
          updates: [
            'Beta access granted to all Professional tier backers',
            'Enterprise consultations scheduled for next week',
            'Development progressing ahead of schedule',
          ],
        }),
      });

      expect(fulfillmentResponse.status).toBe(200);
      const fulfillmentResult = await fulfillmentResponse.json();
      expect(fulfillmentResult.success).toBe(true);
    });
  });

  describe('Campaign Cancellation Flow', () => {
    it('should handle campaign cancellation by creator', async () => {
      // Create a separate campaign for cancellation testing
      const cancelTestCampaign = await createTestCampaign({
        title: 'Campaign To Cancel',
        summary: 'This campaign will be cancelled',
        fundingGoalDollars: 25000,
        status: 'published',
        organizationId: testOrganization.id,
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }, creatorUser.id);

      // Create some pledges to test refund handling
      const pledgesToRefund = [
        { amount: 100, backerId: backerUser.id },
        { amount: 250, backerId: backerUser.id },
      ];

      for (const pledge of pledgesToRefund) {
        await testPrisma.pledge.create({
          data: {
            campaignId: cancelTestCampaign.id,
            backerId: pledge.backerId,
            amountDollars: pledge.amount,
            status: 'completed',
            paymentRef: `stripe_payment_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          },
        });
      }

      // Cancel the campaign
      const cancelResponse = await fetch(`${API_BASE}/api/campaigns/${cancelTestCampaign.id}/cancel`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          reason: 'Project scope changed significantly',
          refundPolicy: 'full_refund',
          notifyBackers: true,
        }),
      });

      expect(cancelResponse.status).toBe(200);
      const cancelResult = await cancelResponse.json();
      expect(cancelResult.success).toBe(true);
      expect(cancelResult.refundsInitiated).toBe(2);

      // Verify campaign status updated
      const updatedCampaign = await testPrisma.campaign.findUnique({
        where: { id: cancelTestCampaign.id },
      });
      expect(updatedCampaign?.status).toBe('cancelled');

      // Verify cancellation notifications sent
      const cancellationEmails = emailMock.getEmailsBySubject('Campaign Cancelled');
      expect(cancellationEmails.length).toBeGreaterThan(0);
      
      // Should notify both creator and backers
      const creatorNotification = cancellationEmails.find(e => e.to === creatorUser.email);
      const backerNotification = cancellationEmails.find(e => e.to === backerUser.email);
      expect(creatorNotification).toBeDefined();
      expect(backerNotification).toBeDefined();
    });

    it('should handle partial refunds for cancelled campaigns', async () => {
      const partialRefundCampaign = await createTestCampaign({
        title: 'Partial Refund Campaign',
        summary: 'Testing partial refund scenario',
        fundingGoalDollars: 50000,
        status: 'published',
        organizationId: testOrganization.id,
        endsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      }, creatorUser.id);

      // Create pledge for partial refund testing
      await testPrisma.pledge.create({
        data: {
          campaignId: partialRefundCampaign.id,
          backerId: backerUser.id,
          amountDollars: 500,
          status: 'completed',
          paymentRef: 'test_payment_partial_refund',
        },
      });

      // Cancel with partial refund
      const partialCancelResponse = await fetch(`${API_BASE}/api/campaigns/${partialRefundCampaign.id}/cancel`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          reason: 'Partial work completed, keeping 30% for development costs',
          refundPolicy: 'partial_refund',
          refundPercentage: 70,
          notifyBackers: true,
        }),
      });

      expect(partialCancelResponse.status).toBe(200);
      const partialResult = await partialCancelResponse.json();
      expect(partialResult.success).toBe(true);
      expect(partialResult.refundAmount).toBe(350); // 70% of 500
      expect(partialResult.retainedAmount).toBe(150); // 30% of 500
    });
  });

  describe('Campaign Notification System', () => {
    it('should trigger notifications for campaign events', async () => {
      emailMock.reset();
      
      // Test campaign publication notification
      const pubNotifyResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/notify-publication`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
      });

      expect(pubNotifyResponse.status).toBe(200);
      
      // Check publication emails sent
      const publicationEmails = emailMock.getEmailsBySubject('Campaign Published');
      expect(publicationEmails.length).toBeGreaterThan(0);

      // Test milestone notification
      const milestones = await testPrisma.milestone.findMany({
        where: { campaignId: testCampaign.id },
        orderBy: { pct: 'asc' },
      });
      
      if (milestones.length > 0) {
        const milestoneNotifyResponse = await fetch(`${API_BASE}/api/milestones/${milestones[0].id}/notify-backers`, {
          method: 'POST',
          headers: createAuthHeaders(creatorUser),
          body: JSON.stringify({
            message: 'First milestone has been completed ahead of schedule!',
          }),
        });

        expect(milestoneNotifyResponse.status).toBe(200);
        
        // Verify milestone notification emails
        const milestoneEmails = emailMock.getEmailsBySubject('Milestone Update');
        expect(milestoneEmails.length).toBeGreaterThan(0);
      }

      // Test funding goal notification
      const goalNotifyResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/notify-goal-reached`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
      });

      expect(goalNotifyResponse.status).toBe(200);
    });

    it('should batch and throttle notification sending', async () => {
      // Create multiple rapid events that should be batched
      const rapidEvents = [];
      
      for (let i = 0; i < 10; i++) {
        rapidEvents.push(
          fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/analytics`, {
            method: 'POST',
            headers: createAuthHeaders(creatorUser),
            body: JSON.stringify({
              event: 'campaign_view',
              userId: backerUser.id,
            }),
          })
        );
      }

      // Execute all events simultaneously
      const responses = await Promise.all(rapidEvents);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Check that notifications were throttled (not 10 separate emails)
      const analyticsEmails = emailMock.getEmailsBySubject('Campaign Analytics');
      expect(analyticsEmails.length).toBeLessThanOrEqual(2); // Throttled to max 2 emails
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should prevent unauthorized campaign modifications', async () => {
      // Try to modify campaign as non-creator
      const unauthorizedResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`, {
        method: 'PUT',
        headers: createAuthHeaders(backerUser), // Wrong user
        body: JSON.stringify({
          title: 'Hacked Title',
        }),
      });

      expect(unauthorizedResponse.status).toBe(403);
      const errorData = await unauthorizedResponse.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('permission');
    });

    it('should handle concurrent campaign updates gracefully', async () => {
      const updatePromises = [];
      
      // Simulate multiple concurrent updates
      for (let i = 0; i < 5; i++) {
        updatePromises.push(
          fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`, {
            method: 'PUT',
            headers: createAuthHeaders(creatorUser),
            body: JSON.stringify({
              description: `Updated description ${i} - ${Date.now()}`,
            }),
          })
        );
      }

      const responses = await Promise.all(updatePromises);
      
      // At least one should succeed
      const successfulUpdates = responses.filter(r => r.status === 200);
      expect(successfulUpdates.length).toBeGreaterThan(0);
      
      // Others might fail due to optimistic locking
      const conflictErrors = responses.filter(r => r.status === 409);
      expect(conflictErrors.length).toBeLessThan(responses.length);
    });

    it('should handle database connection failures gracefully', async () => {
      // Test recovery from temporary database issues
      const retryResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`, {
        method: 'GET',
        headers: {
          'x-test-db-failure': 'temporary', // Simulate temporary DB issue
        },
      });

      // Should either succeed after retry or return appropriate error
      expect([200, 503]).toContain(retryResponse.status);
      
      if (retryResponse.status === 503) {
        const errorData = await retryResponse.json();
        expect(errorData.error).toContain('temporarily unavailable');
        expect(errorData.retryAfter).toBeDefined();
      }
    });

    it('should validate campaign data consistency', async () => {
      // Test funding goal vs raised amount consistency
      const inconsistentResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          title: 'Inconsistent Campaign',
          summary: 'Testing data consistency',
          fundingGoalDollars: 10000,
          raisedDollars: 15000, // Raised more than goal - should be validated
        }),
      });

      expect(inconsistentResponse.status).toBe(400);
      const inconsistentData = await inconsistentResponse.json();
      expect(inconsistentData.success).toBe(false);
      expect(inconsistentData.error).toContain('consistency');
    });

    it('should handle campaign deletion with cascade cleanup', async () => {
      // Create campaign with related data for deletion testing
      const deletionCampaign = await createTestCampaign({
        title: 'Campaign for Deletion Test',
        summary: 'This campaign will be deleted',
        fundingGoalDollars: 15000,
        organizationId: testOrganization.id,
      }, creatorUser.id);

      // Add related data
      await createTestMilestone(deletionCampaign.id, {
        name: 'Test Milestone for Deletion',
        pct: 50,
      });

      await createTestPledgeTier(deletionCampaign.id, {
        title: 'Test Tier for Deletion',
        amountDollars: 25,
      });

      await createTestComment(deletionCampaign.id, backerUser.id, 'Test comment for deletion');

      // Delete campaign
      const deleteResponse = await fetch(`${API_BASE}/api/campaigns/${deletionCampaign.id}`, {
        method: 'DELETE',
        headers: createAuthHeaders(creatorUser),
      });

      expect(deleteResponse.status).toBe(200);
      const deleteResult = await deleteResponse.json();
      expect(deleteResult.success).toBe(true);

      // Verify campaign and related data are deleted
      const deletedCampaign = await testPrisma.campaign.findUnique({
        where: { id: deletionCampaign.id },
      });
      expect(deletedCampaign).toBeNull();

      // Verify cascaded deletions
      const remainingMilestones = await testPrisma.milestone.findMany({
        where: { campaignId: deletionCampaign.id },
      });
      expect(remainingMilestones).toHaveLength(0);

      const remainingTiers = await testPrisma.pledgeTier.findMany({
        where: { campaignId: deletionCampaign.id },
      });
      expect(remainingTiers).toHaveLength(0);

      const remainingComments = await testPrisma.comment.findMany({
        where: { campaignId: deletionCampaign.id },
      });
      expect(remainingComments).toHaveLength(0);
    });

    it('should validate comprehensive campaign data integrity', async () => {
      // Test various invalid data scenarios
      const invalidScenarios = [
        {
          name: 'negative funding goal',
          data: {
            title: 'Invalid Campaign',
            summary: 'Campaign with invalid funding goal',
            fundingGoalDollars: -1000,
          },
          expectedError: 'funding goal',
        },
        {
          name: 'missing required fields',
          data: {
            summary: 'Missing title',
            fundingGoalDollars: 10000,
          },
          expectedError: 'title',
        },
        {
          name: 'invalid end date',
          data: {
            title: 'Past End Date Campaign',
            summary: 'Campaign ending in the past',
            fundingGoalDollars: 10000,
            endsAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
          },
          expectedError: 'end date',
        },
        {
          name: 'empty sectors array',
          data: {
            title: 'No Sectors Campaign',
            summary: 'Campaign without sectors',
            fundingGoalDollars: 10000,
            sectors: [],
          },
          expectedError: 'sector',
        },
      ];

      for (const scenario of invalidScenarios) {
        const response = await fetch(`${API_BASE}/api/campaigns`, {
          method: 'POST',
          headers: createAuthHeaders(creatorUser),
          body: JSON.stringify(scenario.data),
        });

        expect(response.status).toBe(400);
        const errorData = await response.json();
        expect(errorData.success).toBe(false);
        expect(errorData.error.toLowerCase()).toContain(scenario.expectedError.toLowerCase());
      }
    });
  });
});
