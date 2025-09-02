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

describe('Campaign Creation and Lifecycle Integration', () => {
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

    it('should validate campaign data integrity', async () => {
      // Test invalid funding goal
      const invalidGoalResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: createAuthHeaders(creatorUser),
        body: JSON.stringify({
          title: 'Invalid Campaign',
          summary: 'Campaign with invalid funding goal',
          fundingGoalDollars: -1000, // Negative goal
        }),
      });

      expect(invalidGoalResponse.status).toBe(400);
      const invalidData = await invalidGoalResponse.json();
      expect(invalidData.success).toBe(false);
    });
  });
});
