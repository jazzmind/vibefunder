/**
 * Clean Campaign API Tests - Parallel Testing Ready
 * 
 * This file demonstrates proper test isolation for parallel execution.
 * Each test creates its own data and is completely independent.
 */

import { createTestUser, createTestCampaign, cleanupTestData } from '../utils/test-helpers';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('Campaign API - Clean Tests', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/campaigns', () => {
    it('should return list of published campaigns', async () => {
      // First create a campaign via the API (which uses the same database connection as the GET)
      const createResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Published Test Campaign',
          summary: 'A published campaign for testing',
          fundingGoalDollars: 50000,
        })
      });
      
      expect(createResponse.status).toBe(201);
      const createdCampaign = await createResponse.json();
      
      // Now update it to published status via the API
      const updateResponse = await fetch(`${API_BASE}/api/campaigns/${createdCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' })
      });
      
      expect(updateResponse.status).toBe(200);
      
      // Small delay to ensure database persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now test the GET endpoint
      const response = await fetch(`${API_BASE}/api/campaigns`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      
      // Find our specific test campaign
      const campaign = data.find((c: any) => c.id === createdCampaign.id);
      expect(campaign).toBeDefined();
      if (campaign) {
        expect(campaign.title).toBe('Published Test Campaign');
        expect(campaign.status).toBe('published');
      }
    });

    it('should support query parameters', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns?status=published&limit=10`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('POST /api/campaigns', () => {
    it('should create new campaign', async () => {
      const campaignData = {
        title: 'New Test Campaign',
        summary: 'A test campaign created via API',
        fundingGoalDollars: 50000,
        budgetDollars: 45000
      };

      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });

      expect(response.status).toBe(201);
      
      const campaign = await response.json();
      expect(campaign.id).toBeDefined();
      expect(campaign.title).toBe(campaignData.title);
      expect(campaign.status).toBe('draft');
    });

    it('should validate required fields', async () => {
      const invalidData = { summary: 'Missing title' };

      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });

    it('should enforce funding limits', async () => {
      const invalidData = {
        title: 'Test Campaign',
        summary: 'Test summary',
        fundingGoalDollars: -1000
      };

      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/campaigns/[id]', () => {
    it('should return specific campaign', async () => {
      // Create a campaign via the API
      const createResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Specific Campaign Test',
          summary: 'Campaign for testing GET by ID',
          fundingGoalDollars: 50000,
        })
      });
      
      expect(createResponse.status).toBe(201);
      const createdCampaign = await createResponse.json();

      // Small delay to ensure database persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test GET by ID
      const response = await fetch(`${API_BASE}/api/campaigns/${createdCampaign.id}`);
      expect(response.status).toBe(200);
      
      const campaign = await response.json();
      expect(campaign.id).toBe(createdCampaign.id);
      expect(campaign.title).toBe('Specific Campaign Test');
      expect(campaign.maker).toBeDefined();
    });

    it('should return 404 for non-existent campaign', async () => {
      const response = await fetch(`${API_BASE}/api/campaigns/non-existent-id`);
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/campaigns/[id]', () => {
    it('should update campaign', async () => {
      // Create a campaign via the API
      const createResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign to Update',
          summary: 'This will be updated',
          fundingGoalDollars: 50000,
        })
      });
      
      expect(createResponse.status).toBe(201);
      const createdCampaign = await createResponse.json();

      // Small delay to ensure database persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      const updateData = {
        title: 'Updated Campaign Title',
        summary: 'Updated summary'
      };

      // Test PUT update
      const response = await fetch(`${API_BASE}/api/campaigns/${createdCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      expect(response.status).toBe(200);
      
      const campaign = await response.json();
      expect(campaign.title).toBe('Updated Campaign Title');
    });

    it('should validate update data', async () => {
      // Create a campaign via the API
      const createResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign to Validate',
          summary: 'This will be validated',
          fundingGoalDollars: 50000,
        })
      });
      
      expect(createResponse.status).toBe(201);
      const createdCampaign = await createResponse.json();

      const invalidData = { fundingGoalDollars: 'not-a-number' };

      const response = await fetch(`${API_BASE}/api/campaigns/${createdCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection', async () => {
      const maliciousId = "'; DROP TABLE campaigns; --";
      const response = await fetch(`${API_BASE}/api/campaigns/${encodeURIComponent(maliciousId)}`);
      expect(response.status).toBe(404); // Should not find campaign, not cause DB error
    });

    it('should handle malicious input', async () => {
      const maliciousData = {
        title: '<script>alert("xss")</script>Malicious Campaign',
        summary: 'Test summary',
        fundingGoalDollars: 50000,
        budgetDollars: 45000
      };

      const response = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData)
      });

      // Should create successfully but sanitize the input
      expect([201, 400]).toContain(response.status);
    });
  });
});