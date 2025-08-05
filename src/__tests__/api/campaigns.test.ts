/**
 * Campaign API Tests for VibeFunder
 * 
 * Tests all campaign-related API endpoints including:
 * - CRUD operations for campaigns
 * - Image generation endpoints
 * - Security and validation
 * - Error handling
 */

import { createTestUser, createTestCampaign, cleanupTestData } from '../utils/test-helpers';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('Campaign API Endpoints', () => {
  let testUser: any;
  let testCampaign: any;

  beforeAll(async () => {
    testUser = await createTestUser({
      email: 'campaign-test@example.com',
      name: 'Campaign Tester',
      roles: ['user']
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/campaigns', () => {
    beforeEach(async () => {
      testCampaign = await createTestCampaign({
        makerId: testUser.id,
        title: 'Test Campaign for API',
        summary: 'A test campaign for API testing',
        status: 'published'
      });
    });

    it('should return list of campaigns', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      
      const campaign = data.find((c: any) => c.id === testCampaign.id);
      expect(campaign).toBeDefined();
      expect(campaign.title).toBe('Test Campaign for API');
    });

    it('should filter campaigns by status', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns?status=published`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      data.forEach((campaign: any) => {
        expect(campaign.status).toBe('published');
      });
    });

    it('should support pagination', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns?page=1&limit=5`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.length).toBeLessThanOrEqual(5);
    });

    it('should handle invalid query parameters gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns?page=invalid&limit=abc`);
      
      expect(response.status).toBe(200); // Should still work with defaults
    });
  });

  describe('POST /api/campaigns', () => {
    const validCampaignData = {
      title: 'New Test Campaign',
      summary: 'A brand new test campaign',
      description: 'Detailed description of the test campaign',
      fundingGoalDollars: 50000,
      budgetDollars: 45000
    };

    it('should create new campaign with valid data', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': testUser.id // Bypass auth for testing
        },
        body: JSON.stringify(validCampaignData)
      });

      expect(response.status).toBe(201);
      
      const campaign = await response.json();
      expect(campaign.id).toBeDefined();
      expect(campaign.title).toBe(validCampaignData.title);
      expect(campaign.makerId).toBe(testUser.id);
      expect(campaign.status).toBe('draft');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        summary: 'Missing title'
      };

      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': testUser.id
        },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('title');
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        ...validCampaignData,
        title: '<script>alert("xss")</script>Malicious Campaign',
        description: 'Description with <iframe src="javascript:alert(\'xss\')"></iframe>'
      };

      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': testUser.id
        },
        body: JSON.stringify(maliciousData)
      });

      expect(response.status).toBe(201);
      
      const campaign = await response.json();
      expect(campaign.title).not.toContain('<script>');
      expect(campaign.description).not.toContain('<iframe>');
    });

    it('should enforce funding goal limits', async () => {
      const invalidData = {
        ...validCampaignData,
        fundingGoalDollars: -1000 // Negative funding goal
      };

      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': testUser.id
        },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // No authentication headers
        },
        body: JSON.stringify(validCampaignData)
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/campaigns/[id]', () => {
    beforeEach(async () => {
      testCampaign = await createTestCampaign({
        makerId: testUser.id,
        title: 'Single Campaign Test',
        summary: 'Test for single campaign endpoint'
      });
    });

    it('should return specific campaign by ID', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      
      expect(response.status).toBe(200);
      
      const campaign = await response.json();
      expect(campaign.id).toBe(testCampaign.id);
      expect(campaign.title).toBe('Single Campaign Test');
      expect(campaign.maker).toBeDefined();
    });

    it('should return 404 for non-existent campaign', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns/non-existent-id`);
      
      expect(response.status).toBe(404);
    });

    it('should include related data (maker, milestones, etc.)', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`);
      
      const campaign = await response.json();
      expect(campaign.maker).toBeDefined();
      expect(campaign.maker.email).toBe(testUser.email);
      expect(Array.isArray(campaign.milestones)).toBe(true);
      expect(Array.isArray(campaign.pledgeTiers)).toBe(true);
    });
  });

  describe('PUT /api/campaigns/[id]', () => {
    beforeEach(async () => {
      testCampaign = await createTestCampaign({
        makerId: testUser.id,
        title: 'Campaign to Update',
        summary: 'This campaign will be updated'
      });
    });

    it('should update campaign with valid data', async () => {
      const updateData = {
        title: 'Updated Campaign Title',
        summary: 'Updated summary',
        fundingGoalDollars: 75000
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': testUser.id
        },
        body: JSON.stringify(updateData)
      });

      expect(response.status).toBe(200);
      
      const campaign = await response.json();
      expect(campaign.title).toBe('Updated Campaign Title');
      expect(campaign.fundingGoalDollars).toBe(75000);
    });

    it('should only allow campaign owner to update', async () => {
      const otherUser = await createTestUser({
        email: 'other-user@example.com',
        name: 'Other User'
      });

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': otherUser.id
        },
        body: JSON.stringify({ title: 'Unauthorized Update' })
      });

      expect(response.status).toBe(403);
    });

    it('should validate update data', async () => {
      const invalidData = {
        fundingGoalDollars: 'not-a-number'
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': testUser.id
        },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/campaigns/[id]/generate-image', () => {
    beforeEach(async () => {
      testCampaign = await createTestCampaign({
        makerId: testUser.id,
        title: 'AI Image Test Campaign',
        summary: 'Campaign for testing AI image generation',
        description: 'This campaign uses AI and machine learning for data analysis'
      });
    });

    it('should generate image for campaign', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/generate-image`, {
        method: 'POST',
        headers: {
          'x-test-user-id': testUser.id
        }
      });

      if (process.env.OPENAI_API_KEY) {
        expect(response.status).toBe(200);
        
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.imageUrl).toBeDefined();
        expect(result.imageUrl).toContain('/images/campaigns/');
      } else {
        expect(response.status).toBe(500);
        
        const result = await response.json();
        expect(result.error).toContain('OpenAI API key');
      }
    });

    it('should require campaign ownership for image generation', async () => {
      const otherUser = await createTestUser({
        email: 'image-test-other@example.com',
        name: 'Other User'
      });

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/generate-image`, {
        method: 'POST',
        headers: {
          'x-test-user-id': otherUser.id
        }
      });

      expect(response.status).toBe(403);
    });

    it('should handle non-existent campaigns', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns/non-existent/generate-image`, {
        method: 'POST',
        headers: {
          'x-test-user-id': testUser.id
        }
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/campaigns/auto-generate-image', () => {
    it('should auto-generate images for campaigns without images', async () => {
      // Create campaign without image
      const campaignWithoutImage = await createTestCampaign({
        makerId: testUser.id,
        title: 'No Image Campaign',
        summary: 'Campaign without image for auto-generation test',
        image: null
      });

      const response = await fetch(`${API_BASE}/api/campaigns/auto-generate-image`, {
        method: 'POST',
        headers: {
          'x-test-user-id': testUser.id
        }
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.processed).toBeGreaterThan(0);
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should handle rate limiting gracefully', async () => {
      // Create multiple campaigns for batch processing
      const campaigns = await Promise.all([
        createTestCampaign({
          makerId: testUser.id,
          title: 'Batch Campaign 1',
          summary: 'First batch campaign',
          image: null
        }),
        createTestCampaign({
          makerId: testUser.id,
          title: 'Batch Campaign 2', 
          summary: 'Second batch campaign',
          image: null
        })
      ]);

      const response = await fetch(`${API_BASE}/api/campaigns/auto-generate-image`, {
        method: 'POST',
        headers: {
          'x-test-user-id': testUser.id
        }
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.processed).toBe(campaigns.length);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in campaign queries', async () => {
      const maliciousId = "'; DROP TABLE campaigns; --";
      
      const response = await fetch(`${API_BASE}/api/campaigns/${encodeURIComponent(maliciousId)}`);
      
      expect(response.status).toBe(404); // Should not find campaign, not cause DB error
    });

    it('should rate limit campaign creation', async () => {
      const promises = [];
      
      // Try to create many campaigns rapidly
      for (let i = 0; i < 20; i++) {
        promises.push(
          fetch(`${API_BASE}/api/campaigns`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-test-user-id': testUser.id
            },
            body: JSON.stringify({
              title: `Rapid Campaign ${i}`,
              summary: 'Rapid creation test'
            })
          })
        );
      }

      const responses = await Promise.all(promises);
      
      // Should have some rate limiting after initial requests
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate file uploads for campaign images', async () => {
      // Test with non-image file
      const maliciousFile = new Blob(['#!/bin/bash\necho "pwned"'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', maliciousFile, 'script.sh');

      const response = await fetch(`${API_BASE}/api/campaigns/${testCampaign.id}/upload-image`, {
        method: 'POST',
        headers: {
          'x-test-user-id': testUser.id
        },
        body: formData
      });

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toContain('file type');
    });
  });
});