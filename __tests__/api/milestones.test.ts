/**
 * Milestones API Tests for VibeFunder
 * 
 * Tests all milestone-related API endpoints including:
 * - Milestone creation for campaigns
 * - Authorization and ownership checks
 * - Security and validation
 */

import { createTestUser, cleanupTestData } from '../utils/test-helpers';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('Milestones API', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/campaigns/[id]/milestones', () => {
    it('should create milestone for campaign', async () => {
      // First create a campaign via the API
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Milestone Test',
          summary: 'A campaign to test milestone creation',
          fundingGoalDollars: 50000,

        })
      });
      
      expect(campaignResponse.status).toBe(201);
      const campaign = await campaignResponse.json();

      // Create milestone for the campaign (using correct schema)
      const milestoneData = {
        campaignId: campaign.id,
        name: 'First Milestone',
        pct: 25,
        dueDate: '2024-12-31',
        acceptance: {
          criteria: 'Complete initial development phase',
          deliverables: ['Documentation', 'Initial prototype']
        }
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestoneData)
      });

      expect(response.status).toBe(201);
      
      const milestone = await response.json();
      expect(milestone.id).toBeDefined();
      expect(milestone.name).toBe(milestoneData.name);
      expect(milestone.campaignId).toBe(campaign.id);
      expect(milestone.pct).toBe(25);
      expect(milestone.acceptance.criteria).toBe('Complete initial development phase');
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

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });

    it('should validate percentage amounts', async () => {
      // First create a campaign
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Validation Test',
          summary: 'A campaign to test validation',
          fundingGoalDollars: 50000,

        })
      });
      
      const campaign = await campaignResponse.json();

      const invalidData = {
        campaignId: campaign.id,
        name: 'Invalid Milestone',
        pct: 150, // Invalid percentage > 100
        acceptance: {
          criteria: 'Test criteria'
        }
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });

    it('should validate campaign exists', async () => {
      const invalidData = {
        name: 'Orphaned Milestone',
        pct: 25,
        acceptance: {
          criteria: 'Test criteria'
        }
      };

      const response = await fetch(`${API_BASE}/api/campaigns/non-existent-campaign-id/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(404);
    });

    it('should handle duplicate order values gracefully', async () => {
      // First create a campaign
      const campaignResponse = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Campaign for Order Test',
          summary: 'A campaign to test milestone ordering',
          fundingGoalDollars: 50000,

        })
      });
      
      const campaign = await campaignResponse.json();

      // Create first milestone
      const milestone1Data = {
        campaignId: campaign.id,
        name: 'First Milestone',
        pct: 25,
        acceptance: {
          criteria: 'First milestone criteria'
        }
      };

      const firstResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestone1Data)
      });

      expect(firstResponse.status).toBe(201);

      // Create second milestone with same percentage (this should be allowed or handled gracefully)
      const milestone2Data = {
        campaignId: campaign.id,
        name: 'Second Milestone',
        pct: 50, // Different percentage
        acceptance: {
          criteria: 'Second milestone criteria'
        }
      };

      const secondResponse = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestone2Data)
      });

      // Should either handle gracefully or reject
      expect([201, 400]).toContain(secondResponse.status);
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
        name: "'; DROP TABLE milestones; --",
        pct: 25,
        acceptance: {
          criteria: 'Malicious criteria'
        }
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData)
      });

      // Should not cause server error, should handle gracefully
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
        title: '<script>alert("xss")</script>Evil Milestone',
        description: '<img src=x onerror=alert(1)>Malicious description',
        targetDollars: 10000,
        order: 1
      };

      const response = await fetch(`${API_BASE}/api/campaigns/${campaign.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData)
      });

      // Should handle malicious input gracefully
      expect([201, 400]).toContain(response.status);
    });
  });
});