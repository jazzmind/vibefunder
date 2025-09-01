/**
 * Stretch Goals API Tests for VibeFunder
 * 
 * Tests all stretch goal-related API endpoints including:
 * - CRUD operations for stretch goals
 * - Authorization and ownership checks
 * - Security and validation
 */

import { createTestUser, cleanupTestData } from '../utils/test-helpers';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe.skip('Stretch Goals API', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  describe.skip('POST /api/campaigns/[id]/stretch-goals', () => {
    it('should create stretch goal for campaign', async () => {
      // First create a campaign via the API
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Stretch Goal Test',
          summary: 'A campaign to test stretch goal creation',
          fundingGoalDollars: 50000,
        })
      });
      
      expect(campaignResponse.status).toBe(201);
      const campaign = await campaignResponse.json();

      // Create stretch goal for the campaign
      const stretchGoalData = {
        campaignId: campaign.id,
        title: 'Extra Features Unlock',
        description: 'Unlock additional features when we reach this goal',
        targetDollars: 75000,
        order: 1,
        isUnlocked: false
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/stretch-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stretchGoalData)
      });

      expect(response.status).toBe(201);
      
      const stretchGoal = await response.json();
      expect(stretchGoal.id).toBeDefined();
      expect(stretchGoal.title).toBe(stretchGoalData.title);
      expect(stretchGoal.campaignId).toBe(campaign.id);
      expect(stretchGoal.targetDollars).toBe(75000);
      expect(stretchGoal.isUnlocked).toBe(false);
    });

    it('should validate required fields', async () => {
      const invalidData = { 
        description: 'Missing required fields' 
      };
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Stretch Goal Test',
          summary: 'A campaign to test stretch goal creation',
          fundingGoalDollars: 50000,
        })
      });
      
      expect(campaignResponse.status).toBe(201);
      const campaign = await campaignResponse.json();

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/stretch-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });

    it('should validate target amounts', async () => {
      // First create a campaign
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Target Validation',
          summary: 'A campaign to test target validation',
          fundingGoalDollars: 50000,
        })
      });
      
      const campaign = await campaignResponse.json();

      const invalidData = {
        campaignId: campaign.id,
        title: 'Invalid Stretch Goal',
        description: 'Goal with negative target',
        targetDollars: -1000,
        order: 1
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/stretch-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });

    it('should validate campaign exists', async () => {
      const invalidData = {
        campaignId: 'non-existent-campaign-id',
        title: 'Orphaned Goal',
        description: 'Goal for non-existent campaign',
        targetDollars: 75000,
        order: 1
      };
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Stretch Goal Test',
          summary: 'A campaign to test stretch goal creation',
          fundingGoalDollars: 50000,
        })
      });
      
      expect(campaignResponse.status).toBe(201);
      const campaign = await campaignResponse.json();

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/stretch-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });

    it('should enforce stretch goals exceed campaign funding goal', async () => {
      // Create a campaign with $50,000 funding goal
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Goal Validation',
          summary: 'A campaign to test goal validation',
          fundingGoalDollars: 50000,
        })
      });
      
      const campaign = await campaignResponse.json();

      // Try to create stretch goal below the funding goal
      const invalidData = {
        campaignId: campaign.id,
        title: 'Invalid Low Goal',
        description: 'Goal below campaign funding target',
        targetDollars: 25000, // Below the $50,000 funding goal
        order: 1
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/stretch-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      // Should validate that stretch goals exceed the base funding goal
      expect(response.status).toBe(400);
    });
  });

  describe.skip('PUT /api/campaigns/[id]/stretch-goals/[goalId]', () => {
    it('should update stretch goal', async () => {
      // First create a campaign and stretch goal
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Update Test',
          summary: 'A campaign to test stretch goal updates',
          fundingGoalDollars: 50000,
        })
      });
      
      const campaign = await campaignResponse.json();

      const createResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/stretch-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          title: 'Goal to Update',
          description: 'This will be updated',
          targetDollars: 75000,
          order: 1
        })
      });

      expect(createResponse.status).toBe(201);
      const createdGoal = await createResponse.json();

      // Update the stretch goal
      const updateData = {
        id: createdGoal.id,
        title: 'Updated Goal Title',
        description: 'Updated description',
        targetDollars: 100000
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/stretch-goals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      expect(response.status).toBe(200);
      
      const updatedGoal = await response.json();
      expect(updatedGoal.title).toBe('Updated Goal Title');
      expect(updatedGoal.targetDollars).toBe(100000);
    });

    it('should validate update data', async () => {
      const invalidData = {
        id: 'non-existent-id',
        targetDollars: -100
      };
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Stretch Goal Test',
          summary: 'A campaign to test stretch goal creation',
          fundingGoalDollars: 50000,
        })
      });
      
      expect(campaignResponse.status).toBe(201);
      const campaign = await campaignResponse.json();

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/stretch-goals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });
  });

  describe.skip('DELETE /api/campaigns/[id]/stretch-goals/[goalId]', () => {
    it('should delete stretch goal', async () => {
      // First create a campaign and stretch goal
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Delete Test',
          summary: 'A campaign to test stretch goal deletion',
          fundingGoalDollars: 50000,
        })
      });
      
      const campaign = await campaignResponse.json();

      const createResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/stretch-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          title: 'Goal to Delete',
          description: 'This will be deleted',
          targetDollars: 75000,
          order: 1
        })
      });

      expect(createResponse.status).toBe(201);
      const createdGoal = await createResponse.json();

      // Delete the stretch goal
      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/stretch-goals`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: createdGoal.id })
      });

      expect(response.status).toBe(200);
    });

    it('should handle non-existent goal deletion', async () => {
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Stretch Goal Test',
          summary: 'A campaign to test stretch goal creation',
          fundingGoalDollars: 50000,
        })
      });
      
      expect(campaignResponse.status).toBe(201);
      const campaign = await campaignResponse.json();

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/stretch-goals`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'non-existent-id' })
      });

      expect(response.status).toBe(404);
    });
  });

  describe.skip('Security Tests', () => {
    it('should prevent SQL injection', async () => {
      const maliciousData = {
        campaignId: "'; DROP TABLE stretch_goals; --",
        title: 'Malicious Goal',
        description: 'SQL injection attempt',
        targetDollars: 75000,
        order: 1
      };
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Stretch Goal Test',
          summary: 'A campaign to test stretch goal creation',
          fundingGoalDollars: 50000,
        })
      });
      
      expect(campaignResponse.status).toBe(201);
      const campaign = await campaignResponse.json();

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/stretch-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData)
      });

      expect([400, 404]).toContain(response.status);
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
        title: '<script>alert("xss")</script>Evil Goal',
        description: '<img src=x onerror=alert(1)>Malicious description',
        targetDollars: 75000,
        order: 1
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/stretch-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData)
      });

      expect([201, 400]).toContain(response.status);
    });
  });
});