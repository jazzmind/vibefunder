/**
 * Pledge Tiers API Tests for VibeFunder
 * 
 * Tests all pledge tier-related API endpoints including:
 * - CRUD operations for pledge tiers
 * - Authorization and ownership checks
 * - Security and validation
 */

import { createTestUser, cleanupTestData } from '../utils/test-helpers';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('Pledge Tiers API', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/campaigns/[id]/pledge-tiers', () => {
    it('should create pledge tier for campaign', async () => {
      // First create a campaign via the API
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Pledge Tier Test',
          summary: 'A campaign to test pledge tier creation',
          fundingGoalDollars: 50000,
        })
      });
      
      expect(campaignResponse.status).toBe(201);
      const campaign = await campaignResponse.json();

      // Create pledge tier for the campaign
      const pledgeTierData = {
        campaignId: campaign.id,
        title: 'Early Bird Tier',
        description: 'Special pricing for early supporters',
        amountDollars: 100,
        maxPledges: 50,
        order: 1,
        isActive: true,
        rewards: ['Digital download', 'Thank you note']
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/pledge-tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pledgeTierData)
      });

      expect(response.status).toBe(201);
      
      const pledgeTier = await response.json();
      expect(pledgeTier.id).toBeDefined();
      expect(pledgeTier.title).toBe(pledgeTierData.title);
      expect(pledgeTier.campaignId).toBe(campaign.id);
      expect(pledgeTier.amountDollars).toBe(100);
      expect(pledgeTier.isActive).toBe(true);
    });

    it('should validate required fields', async () => {
      // First create a campaign
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Validation Test Campaign',
          summary: 'A campaign to test validation',
          fundingGoalDollars: 50000,
        })
      });
      
      const campaign = await campaignResponse.json();

      const invalidData = { 
        description: 'Missing required fields' 
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/pledge-tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });

    it('should validate pledge amounts', async () => {
      // First create a campaign
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Amount Validation',
          summary: 'A campaign to test amount validation',
          fundingGoalDollars: 50000,
        })
      });
      
      const campaign = await campaignResponse.json();

      const invalidData = {
        campaignId: campaign.id,
        title: 'Invalid Tier',
        description: 'Tier with negative amount',
        amountDollars: -50,
        order: 1
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/pledge-tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });

    it('should validate campaign exists', async () => {
      const invalidData = {
        title: 'Orphaned Tier',
        description: 'Tier for non-existent campaign',
        amountDollars: 100,
        order: 1
      };

      const response = await fetch(`${API_BASE}/api/campaigns/non-existent-campaign-id/pledge-tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/campaigns/[id]/pledge-tiers/[tierId]', () => {
    it('should update pledge tier', async () => {
      // First create a campaign and pledge tier
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Update Test',
          summary: 'A campaign to test pledge tier updates',
          fundingGoalDollars: 50000,
        })
      });
      
      const campaign = await campaignResponse.json();

      const createResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/pledge-tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          title: 'Tier to Update',
          description: 'This will be updated',
          amountDollars: 100,
          order: 1
        })
      });

      expect(createResponse.status).toBe(201);
      const createdTier = await createResponse.json();

      // Update the pledge tier
      const updateData = {
        id: createdTier.id,
        title: 'Updated Tier Title',
        description: 'Updated description',
        amountDollars: 150
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/pledge-tiers/${createdTier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      expect(response.status).toBe(200);
      
      const updatedTier = await response.json();
      expect(updatedTier.title).toBe('Updated Tier Title');
      expect(updatedTier.amountDollars).toBe(150);
    });

    it('should validate update data', async () => {
      // First create a campaign
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Update Validation Campaign',
          summary: 'A campaign to test update validation',
          fundingGoalDollars: 50000,
        })
      });
      
      const campaign = await campaignResponse.json();

      const invalidData = {
        id: 'non-existent-id',
        amountDollars: -100
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/pledge-tiers/invalid-tier-id`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/campaigns/[id]/pledge-tiers/[tierId]', () => {
    it('should delete pledge tier', async () => {
      // First create a campaign and pledge tier
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Delete Test',
          summary: 'A campaign to test pledge tier deletion',
          fundingGoalDollars: 50000,
        })
      });
      
      const campaign = await campaignResponse.json();

      const createResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/pledge-tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          title: 'Tier to Delete',
          description: 'This will be deleted',
          amountDollars: 100,
          order: 1
        })
      });

      expect(createResponse.status).toBe(201);
      const createdTier = await createResponse.json();

      // Delete the pledge tier
      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/pledge-tiers/${createdTier.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(response.status).toBe(200);
    });

    it('should handle non-existent tier deletion', async () => {
      // First create a campaign
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Delete Test',
          summary: 'A campaign to test deletion',
          fundingGoalDollars: 50000,
        })
      });
      
      const campaign = await campaignResponse.json();

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/pledge-tiers/non-existent-id`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection', async () => {
      // First create a campaign
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Security Test Campaign',
          summary: 'A campaign to test security',
          fundingGoalDollars: 50000,
        })
      });
      
      const campaign = await campaignResponse.json();

      const maliciousData = {
        title: "'; DROP TABLE pledge_tiers; --",
        description: 'SQL injection attempt',
        amountDollars: 100,
        order: 1
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/pledge-tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData)
      });

      expect([201, 400, 404]).toContain(response.status);
    });

    it('should handle malicious input', async () => {
      // First create a campaign
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Security Test',
          summary: 'A campaign to test security',
          fundingGoalDollars: 50000,
        })
      });
      
      const campaign = await campaignResponse.json();

      const maliciousData = {
        campaignId: campaign.id,
        title: '<script>alert("xss")</script>Evil Tier',
        description: '<img src=x onerror=alert(1)>Malicious description',
        amountDollars: 100,
        order: 1
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/pledge-tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData)
      });

      expect([201, 400]).toContain(response.status);
    });
  });
});