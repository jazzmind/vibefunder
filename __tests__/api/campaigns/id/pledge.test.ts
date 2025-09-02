/**
 * Pledge Creation API Tests
 * 
 * Integration tests for the POST /api/campaigns/[id]/pledge endpoint
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/campaigns/[id]/pledge/route';
import { createAuthHeaders, generateTestEmail, createTestUser, createTestCampaign, createTestPledgeTier, cleanupTestData } from '../../../utils/test-helpers';

describe('Campaign Pledge Creation API', () => {
  let testUser: any;
  let testCampaign: any;
  let testPledgeTier: any;
  let testData: any[] = [];

  const createRequest = (campaignId: string, body: any, user = testUser) => {
    const url = new URL(`http://localhost:3000/api/campaigns/${campaignId}/pledge`);
    const headers = createAuthHeaders(user);
    
    return new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });
  };

  beforeEach(async () => {
    // Create test user
    testUser = await createTestUser({
      email: generateTestEmail('pledger'),
      name: 'Test Pledger',
    });
    testData.push({ type: 'user', id: testUser.id });

    // Create test campaign
    testCampaign = await createTestCampaign({
      title: 'Test Campaign for Pledges',
      fundingGoalDollars: 10000,
      status: 'published',
      makerId: testUser.id,
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    });
    testData.push({ type: 'campaign', id: testCampaign.id });

    // Create test pledge tier
    testPledgeTier = await createTestPledgeTier(testCampaign.id, {
      title: 'Early Bird Special',
      description: 'Limited early bird reward',
      amountDollars: 50,
    });
    testData.push({ type: 'pledgeTier', id: testPledgeTier.id });
  });

  afterEach(async () => {
    await cleanupTestData(testData);
    testData = [];
  });

  describe('Valid Pledge Creation', () => {
    it('should create a valid pledge with tier selection', async () => {
      const request = createRequest(testCampaign.id, {
        amountDollars: 50,
        pledgeTierId: testPledgeTier.id,
        isAnonymous: false,
        message: 'Thank you for this campaign!',
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: testCampaign.id }) 
      });
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.pledge).toMatchObject({
        amountDollars: 50,
        currency: 'USD',
        status: 'pending',
        message: 'Thank you for this campaign!',
        isAnonymous: false,
      });
      expect(result.pledge.id).toBeDefined();
      expect(result.pledge.createdAt).toBeDefined();
      
      // Store pledge ID for cleanup
      if (result.pledge?.id) {
        testData.push({ type: 'pledge', id: result.pledge.id });
      }
    });

    it('should create a custom pledge amount above minimum tier', async () => {
      const request = createRequest(testCampaign.id, {
        amountDollars: 75,
        pledgeTierId: testPledgeTier.id,
        isAnonymous: false,
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: testCampaign.id }) 
      });
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.pledge.amountDollars).toBe(75);
      
      if (result.pledge?.id) {
        testData.push({ type: 'pledge', id: result.pledge.id });
      }
    });

    it('should create an anonymous pledge', async () => {
      const request = createRequest(testCampaign.id, {
        amountDollars: 50,
        pledgeTierId: testPledgeTier.id,
        isAnonymous: true,
        message: 'Keep up the good work!',
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: testCampaign.id }) 
      });
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.pledge).toMatchObject({
        amountDollars: 50,
        isAnonymous: true,
        message: 'Keep up the good work!',
      });
      
      if (result.pledge?.id) {
        testData.push({ type: 'pledge', id: result.pledge.id });
      }
    });
  });

  describe('Pledge Validation', () => {
    it('should reject pledge below minimum amount', async () => {
      const request = createRequest(testCampaign.id, {
        amountDollars: 0.5, // Below $1 minimum
        isAnonymous: false,
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: testCampaign.id }) 
      });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('at least $1');
    });

    it('should reject pledge with insufficient amount for selected tier', async () => {
      const request = createRequest(testCampaign.id, {
        amountDollars: 25, // Less than tier minimum of $50
        pledgeTierId: testPledgeTier.id,
        isAnonymous: false,
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: testCampaign.id }) 
      });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Minimum pledge for this tier is $50');
    });

    it('should reject pledge with invalid tier', async () => {
      const request = createRequest(testCampaign.id, {
        amountDollars: 50,
        pledgeTierId: 'nonexistent-tier-id',
        isAnonymous: false,
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: testCampaign.id }) 
      });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid pledge tier');
    });
  });

  describe('Campaign Status Validation', () => {
    it('should reject pledge for non-existent campaign', async () => {
      const request = createRequest('nonexistent-campaign-id', {
        amountDollars: 50,
        isAnonymous: false,
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: 'nonexistent-campaign-id' }) 
      });
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Campaign not found');
    });

    it('should reject pledge for draft campaign', async () => {
      // Create a draft campaign
      const draftCampaign = await createTestCampaign({
        title: 'Draft Campaign',
        fundingGoalDollars: 5000,
        status: 'draft',
        makerId: testUser.id,
      });
      testData.push({ type: 'campaign', id: draftCampaign.id });

      const request = createRequest(draftCampaign.id, {
        amountDollars: 50,
        isAnonymous: false,
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: draftCampaign.id }) 
      });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Campaign is not available for pledging');
    });

    it('should reject pledge for ended campaign', async () => {
      // Create an ended campaign
      const endedCampaign = await createTestCampaign({
        title: 'Ended Campaign',
        fundingGoalDollars: 5000,
        status: 'published',
        makerId: testUser.id,
        endsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      });
      testData.push({ type: 'campaign', id: endedCampaign.id });

      const request = createRequest(endedCampaign.id, {
        amountDollars: 50,
        isAnonymous: false,
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: endedCampaign.id }) 
      });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Campaign has ended');
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const url = new URL(`http://localhost:3000/api/campaigns/${testCampaign.id}/pledge`);
      
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          amountDollars: 50,
          isAnonymous: false,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: testCampaign.id }) 
      });
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized. Please login to make a pledge.');
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields', async () => {
      const request = createRequest(testCampaign.id, {
        // Missing amountDollars
        isAnonymous: false,
      });

      const response = await POST(request, { 
        params: Promise.resolve({ id: testCampaign.id }) 
      });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});