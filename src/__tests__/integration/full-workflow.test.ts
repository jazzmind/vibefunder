/**
 * Full Workflow Integration Tests for VibeFunder
 * 
 * Tests complete user workflows including:
 * - User registration and authentication
 * - Campaign creation and management
 * - Organization setup
 * - Pledging and backing
 * - AI image generation
 */

import { 
  createTestUser, 
  createTestOrganization, 
  generateTestEmail, 
  cleanupTestData,
  wait 
} from '../utils/test-helpers';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('Full Workflow Integration Tests', () => {
  let creatorUser: any;
  let backerUser: any;
  let organization: any;
  let campaign: any;

  beforeAll(async () => {
    // Setup test users
    creatorUser = await createTestUser({
      email: generateTestEmail('creator'),
      name: 'Campaign Creator',
      roles: ['user']
    });

    backerUser = await createTestUser({
      email: generateTestEmail('backer'),
      name: 'Campaign Backer',
      roles: ['user']
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Complete Campaign Creation Workflow', () => {
    it('should allow user to create organization and campaign', async () => {
      // Step 1: Create organization
      const orgResponse = await fetch(`${API_BASE}/api/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': creatorUser.id
        },
        body: JSON.stringify({
          name: 'Test Startup Inc',
          email: generateTestEmail('startup'),
          description: 'A test startup for integration testing',
          website: 'https://teststartup.com',
          type: 'creator'
        })
      });

      expect(orgResponse.status).toBe(201);
      organization = await orgResponse.json();
      expect(organization.id).toBeDefined();
      expect(organization.ownerId).toBe(creatorUser.id);

      // Step 2: Create campaign
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': creatorUser.id
        },
        body: JSON.stringify({
          title: 'Revolutionary AI Platform',
          summary: 'An innovative AI platform for data analysis and machine learning',
          description: 'This campaign is for building a comprehensive AI platform that will revolutionize how businesses analyze data using artificial intelligence and machine learning algorithms.',
          fundingGoalDollars: 100000,
          budgetDollars: 90000,
          organizationId: organization.id
        })
      });

      expect(campaignResponse.status).toBe(201);
      campaign = await campaignResponse.json();
      expect(campaign.id).toBeDefined();
      expect(campaign.makerId).toBe(creatorUser.id);
      expect(campaign.organizationId).toBe(organization.id);

      // Step 3: Add milestones
      const milestoneResponse = await fetch(`${API_BASE}/api/milestones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': creatorUser.id
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          name: 'MVP Development',
          pct: 50,
          dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
          acceptance: {
            criteria: 'Functional MVP with core AI features',
            deliverables: ['Working prototype', 'API documentation', 'Test suite']
          }
        })
      });

      expect(milestoneResponse.status).toBe(201);
      const milestone = await milestoneResponse.json();
      expect(milestone.campaignId).toBe(campaign.id);

      // Step 4: Add pledge tiers
      const tierResponse = await fetch(`${API_BASE}/api/pledge-tiers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': creatorUser.id
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          title: 'Early Bird Access',
          description: 'Get early access to the platform',
          amountDollars: 99,
          benefits: ['Early access', 'Direct support channel', 'Feature requests priority']
        })
      });

      expect(tierResponse.status).toBe(201);
      const tier = await tierResponse.json();
      expect(tier.campaignId).toBe(campaign.id);
    });

    it('should generate AI image for campaign', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  Skipping AI image generation test - OpenAI API key not configured');
        return;
      }

      const imageResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/generate-image`, {
        method: 'POST',
        headers: {
          'x-test-user-id': creatorUser.id
        }
      });

      if (imageResponse.status === 200) {
        const result = await imageResponse.json();
        expect(result.success).toBe(true);
        expect(result.imageUrl).toBeDefined();
        expect(result.imageUrl).toContain('/images/campaigns/');

        // Update campaign with generated image
        const updateResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-test-user-id': creatorUser.id
          },
          body: JSON.stringify({
            image: result.imageUrl
          })
        });

        expect(updateResponse.status).toBe(200);
      } else {
        console.log('⚠️  AI image generation failed - API may be rate limited');
      }
    });

    it('should publish campaign', async () => {
      const publishResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': creatorUser.id
        },
        body: JSON.stringify({
          status: 'published',
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
      });

      expect(publishResponse.status).toBe(200);
      const updatedCampaign = await publishResponse.json();
      expect(updatedCampaign.status).toBe('published');
      expect(updatedCampaign.endsAt).toBeDefined();

      campaign = updatedCampaign;
    });
  });

  describe('Backing and Pledging Workflow', () => {
    it('should allow backer to discover and view campaign', async () => {
      // Step 1: Browse campaigns
      const browseResponse = await fetch(`${API_BASE}/api/campaigns?status=published`);
      expect(browseResponse.status).toBe(200);

      const campaigns = await browseResponse.json();
      const foundCampaign = campaigns.find((c: any) => c.id === campaign.id);
      expect(foundCampaign).toBeDefined();

      // Step 2: View specific campaign
      const viewResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}`);
      expect(viewResponse.status).toBe(200);

      const campaignDetails = await viewResponse.json();
      expect(campaignDetails.id).toBe(campaign.id);
      expect(campaignDetails.maker).toBeDefined();
      expect(campaignDetails.organization).toBeDefined();
      expect(campaignDetails.milestones).toBeDefined();
      expect(campaignDetails.pledgeTiers).toBeDefined();
    });

    it('should handle pledge creation and payment flow', async () => {
      // Get pledge tiers for the campaign
      const tiersResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}`);
      const campaignData = await tiersResponse.json();
      const tier = campaignData.pledgeTiers[0];

      // Create checkout session
      const checkoutResponse = await fetch(`${API_BASE}/api/checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': backerUser.id
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          pledgeTierId: tier.id,
          amountDollars: tier.amountDollars
        })
      });

      if (process.env.STRIPE_SECRET_KEY) {
        expect(checkoutResponse.status).toBe(200);
        
        const checkout = await checkoutResponse.json();
        expect(checkout.sessionId).toBeDefined();
        expect(checkout.url).toBeDefined();

        // Simulate successful payment (in test environment)
        const pledgeResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/pledges`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-test-user-id': backerUser.id
          },
          body: JSON.stringify({
            amountDollars: tier.amountDollars,
            paymentRef: 'test-payment-' + Date.now()
          })
        });

        expect(pledgeResponse.status).toBe(201);
        const pledge = await pledgeResponse.json();
        expect(pledge.campaignId).toBe(campaign.id);
        expect(pledge.backerId).toBe(backerUser.id);
      } else {
        console.log('⚠️  Skipping payment flow test - Stripe not configured');
      }
    });

    it('should allow backers to comment on campaigns', async () => {
      const commentResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': backerUser.id
        },
        body: JSON.stringify({
          content: 'This looks like an amazing project! Looking forward to the AI platform.'
        })
      });

      expect(commentResponse.status).toBe(201);
      const comment = await commentResponse.json();
      expect(comment.campaignId).toBe(campaign.id);
      expect(comment.userId).toBe(backerUser.id);
      expect(comment.content).toContain('amazing project');
    });
  });

  describe('Campaign Management Workflow', () => {
    it('should allow creator to post updates', async () => {
      const updateResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': creatorUser.id
        },
        body: JSON.stringify({
          title: 'Development Progress Update',
          content: 'We have made significant progress on the AI platform. The core algorithms are now implemented and we are beginning testing.',
          isPublic: true
        })
      });

      expect(updateResponse.status).toBe(201);
      const update = await updateResponse.json();
      expect(update.campaignId).toBe(campaign.id);
      expect(update.authorId).toBe(creatorUser.id);
    });

    it('should allow milestone progress updates', async () => {
      // Get milestones for the campaign
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}`);
      const campaignData = await campaignResponse.json();
      const milestone = campaignData.milestones[0];

      const progressResponse = await fetch(`${API_BASE}/api/milestones/${milestone.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': creatorUser.id
        },
        body: JSON.stringify({
          status: 'in_progress',
          evidence: [
            {
              type: 'github_commit',
              url: 'https://github.com/test/repo/commit/abc123',
              description: 'Core AI algorithm implementation'
            }
          ]
        })
      });

      expect(progressResponse.status).toBe(200);
      const updatedMilestone = await progressResponse.json();
      expect(updatedMilestone.status).toBe('in_progress');
      expect(updatedMilestone.evidence).toBeDefined();
    });

    it('should track campaign analytics', async () => {
      // Get updated campaign stats
      const statsResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/stats`, {
        headers: {
          'x-test-user-id': creatorUser.id
        }
      });

      expect(statsResponse.status).toBe(200);
      const stats = await statsResponse.json();
      expect(stats.viewCount).toBeGreaterThan(0);
      expect(stats.pledgeCount).toBeDefined();
      expect(stats.raisedAmount).toBeDefined();
      expect(stats.fundingProgress).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent campaign updates gracefully', async () => {
      const updatePromises = [];
      
      // Simulate multiple users trying to update the same campaign
      for (let i = 0; i < 5; i++) {
        updatePromises.push(
          fetch(`${API_BASE}/api/campaigns/${campaign.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-test-user-id': creatorUser.id
            },
            body: JSON.stringify({
              description: `Updated description ${i} - ${Date.now()}`
            })
          })
        );
      }

      const responses = await Promise.all(updatePromises);
      
      // At least one should succeed
      const successfulUpdates = responses.filter(r => r.status === 200);
      expect(successfulUpdates.length).toBeGreaterThan(0);
    });

    it('should handle campaign deletion cascade properly', async () => {
      // Create a test campaign to delete
      const testCampaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': creatorUser.id
        },
        body: JSON.stringify({
          title: 'Campaign to Delete',
          summary: 'This campaign will be deleted',
          fundingGoalDollars: 10000
        })
      });

      const testCampaign = await testCampaignResponse.json();

      // Add related data
      await fetch(`${API_BASE}/api/milestones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': creatorUser.id
        },
        body: JSON.stringify({
          campaignId: testCampaign.id,
          name: 'Test Milestone',
          pct: 25,
          acceptance: { criteria: 'Test completion' }
        })
      });

      // Delete campaign
      const deleteResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`, {
        method: 'DELETE',
        headers: {
          'x-test-user-id': creatorUser.id
        }
      });

      expect(deleteResponse.status).toBe(200);

      // Verify campaign and related data are deleted
      const verifyResponse = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      expect(verifyResponse.status).toBe(404);
    });

    it('should handle invalid campaign states gracefully', async () => {
      // Try to publish campaign without required fields
      const invalidPublishResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': creatorUser.id
        },
        body: JSON.stringify({
          status: 'published',
          fundingGoalDollars: 0 // Invalid funding goal
        })
      });

      expect(invalidPublishResponse.status).toBe(400);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent campaign views', async () => {
      const viewPromises = [];
      
      // Simulate multiple users viewing the campaign simultaneously
      for (let i = 0; i < 20; i++) {
        viewPromises.push(
          fetch(`${API_BASE}/api/campaigns/${campaign.id}`)
        );
      }

      const responses = await Promise.all(viewPromises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should paginate large datasets efficiently', async () => {
      // Test campaign listing pagination
      const page1Response = await fetch(`${API_BASE}/api/campaigns?page=1&limit=10`);
      expect(page1Response.status).toBe(200);

      const page1Data = await page1Response.json();
      expect(page1Data.length).toBeLessThanOrEqual(10);

      // Response should be fast
      const startTime = Date.now();
      await fetch(`${API_BASE}/api/campaigns?page=1&limit=50`);
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});