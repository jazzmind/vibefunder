/**
 * Pledge Cancellation API Tests
 * 
 * Integration tests for pledge cancellation operations including:
 * - Authorization checks
 * - Refund processing (mocked)
 * - Campaign total updates
 * - Business rule validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '../../../../app/api/campaigns/[id]/pledges/[pledgeId]/cancel/route';
import { createAuthHeaders, generateTestEmail, createTestUser, createTestCampaign, createTestPledge } from '../../../utils/test-helpers';
import { prisma } from '@/lib/db';

// Mock Stripe for payment refund operations (we don't want real charges)
const mockStripeRefund = jest.fn();
const mockStripeRetrieve = jest.fn();
const mockStripeCancel = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      retrieve: mockStripeRetrieve,
      cancel: mockStripeCancel,
    },
    refunds: {
      create: mockStripeRefund,
    },
    charges: {
      retrieve: jest.fn().mockResolvedValue({
        id: 'ch_test_123',
        amount: 5000,
        refunded: false,
        amount_refunded: 0,
      }),
    },
  }));
});

describe('/api/campaigns/[id]/pledges/[pledgeId]/cancel', () => {
  let testUser: any;
  let testCampaign: any;
  let testPledge: any;
  let testData: any[] = [];

  const createRequest = (params: any = {}, body: any = {}, user = testUser) => {
    const url = new URL(
      `http://localhost:3000/api/campaigns/${params.campaignId || testCampaign?.id || 'campaign-123'}/pledges/${params.pledgeId || testPledge?.id || 'pledge-789'}/cancel`
    );
    
    const headers = createAuthHeaders(user);
    
    return new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create test data
    testUser = await createTestUser({
      email: generateTestEmail('canceller'),
      name: 'Test User',
    });

    testCampaign = await createTestCampaign({
      title: 'Test Campaign for Cancellation',
      summary: 'Test summary',
      description: 'Test campaign description',
      fundingGoalDollars: 10000,
      raisedDollars: 500,
      status: 'draft',
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    }, testUser.id);

    testPledge = await createTestPledge(testCampaign.id, testUser.id, {
      amountDollars: 100,
      status: 'pending', // Only pending pledges can be cancelled
    });

    // Store test data for cleanup
    testData = [
      { table: 'pledge', id: testPledge.id },
      { table: 'campaign', id: testCampaign.id },
      { table: 'user', id: testUser.id },
    ];
    
    // Set up Stripe mocks
    mockStripeRefund.mockResolvedValue({ id: 're_test123', status: 'succeeded' });
    mockStripeRetrieve.mockResolvedValue({ 
      status: 'succeeded',
      amount: 10000,
      charges: { data: [{ id: 'ch_test123' }] }
    });
    mockStripeCancel.mockResolvedValue({ 
      id: 'pi_test123',
      status: 'canceled'
    });
  });

  afterEach(async () => {
    // Clean up test data
    try {
      for (const item of testData) {
        if (item.table === 'pledge') {
          await prisma.pledge.deleteMany({ where: { id: item.id } });
        } else if (item.table === 'campaign') {
          await prisma.campaign.deleteMany({ where: { id: item.id } });
        } else if (item.table === 'user') {
          await prisma.user.deleteMany({ where: { id: item.id } });
        }
      }
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
    testData = [];
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication', async () => {
      // Create request without authentication headers
      const url = new URL(
        `http://localhost:3000/api/campaigns/${testCampaign.id}/pledges/${testPledge.id}/cancel`
      );
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const response = await POST(request, {
        params: { id: testCampaign.id, pledgeId: testPledge.id },
      });
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 404 if pledge not found', async () => {
      const request = createRequest({ pledgeId: 'nonexistent-id' }, { reason: 'Test reason' });
      const response = await POST(request, {
        params: { id: testCampaign.id, pledgeId: 'nonexistent-id' },
      });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Pledge not found');
    });

    test('should only allow pledge owner to cancel', async () => {
      // Create another user
      const otherUser = await createTestUser({
        email: generateTestEmail('other'),
        name: 'Other User',
      });
      testData.push({ table: 'user', id: otherUser.id });
      
      const request = createRequest({}, { reason: 'Test' }, otherUser);
      const response = await POST(request, {
        params: { id: testCampaign.id, pledgeId: testPledge.id },
      });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Not authorized to cancel this pledge');
    });
  });

  describe('Pledge Status Validation', () => {
    test('should not allow canceling already cancelled pledge', async () => {
      // Update pledge to cancelled status
      await prisma.pledge.update({
        where: { id: testPledge.id },
        data: { status: 'cancelled' }
      });
      
      const request = createRequest({}, { reason: 'Test' });
      const response = await POST(request, {
        params: { id: testCampaign.id, pledgeId: testPledge.id },
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Only pending pledges can be cancelled');
    });

    test('should not allow canceling pledge for completed campaign', async () => {
      // Update campaign to completed status
      await prisma.campaign.update({
        where: { id: testCampaign.id },
        data: { status: 'completed' }
      });
      
      const request = createRequest({}, { reason: 'Test' });
      const response = await POST(request, {
        params: { id: testCampaign.id, pledgeId: testPledge.id },
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Cannot cancel pledge for completed campaign');
    });

    test('should not allow canceling pledge after campaign end date', async () => {
      // Update campaign to have ended
      await prisma.campaign.update({
        where: { id: testCampaign.id },
        data: { endsAt: new Date('2023-12-31') } // Past date
      });
      
      const request = createRequest({}, { reason: 'Test' });
      const response = await POST(request, {
        params: { id: testCampaign.id, pledgeId: testPledge.id },
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Cannot cancel pledge after campaign deadline');
    });
  });

  describe('Successful Cancellation', () => {
    test('should successfully cancel pledge', async () => {
      const request = createRequest({}, {
        reason: 'Changed my mind',
      });
      
      const response = await POST(request, {
        params: { id: testCampaign.id, pledgeId: testPledge.id },
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.message).toBe('Pledge cancelled successfully');
      expect(data.pledgeId).toBe(testPledge.id);
      expect(data.cancellationReason).toBe('Changed my mind');
      
      // Verify pledge was cancelled in database
      const updatedPledge = await prisma.pledge.findUnique({
        where: { id: testPledge.id }
      });
      expect(updatedPledge?.status).toBe('cancelled');
    });

    test('should update campaign totals', async () => {
      const request = createRequest({}, {
        reason: 'Update totals test',
      });
      
      const response = await POST(request, {
        params: { id: testCampaign.id, pledgeId: testPledge.id },
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.campaignImpact).toBeDefined();
      expect(data.campaignImpact.totalRaisedChange).toBe(-100);
      expect(data.campaignImpact.backerCountChange).toBe(-1);
      
      // Verify campaign total was updated
      const updatedCampaign = await prisma.campaign.findUnique({
        where: { id: testCampaign.id }
      });
      expect(updatedCampaign?.raisedDollars).toBe(400); // 500 - 100
    });

    test('should handle pledge without payment reference', async () => {
      // Update pledge to have no payment reference
      await prisma.pledge.update({
        where: { id: testPledge.id },
        data: { paymentRef: null }
      });
      
      const request = createRequest({}, {
        reason: 'No payment ref test',
      });
      
      const response = await POST(request, {
        params: { id: testCampaign.id, pledgeId: testPledge.id },
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('should require cancellation reason', async () => {
      const request = createRequest({}, {}); // No reason provided
      
      const response = await POST(request, {
        params: { id: testCampaign.id, pledgeId: testPledge.id },
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Required');
    });

    test('should validate reason length', async () => {
      const request = createRequest({}, {
        reason: 'a'.repeat(1001), // Too long
      });
      
      const response = await POST(request, {
        params: { id: testCampaign.id, pledgeId: testPledge.id },
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('String must contain at most 1000 character(s)');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid campaign ID format', async () => {
      const request = createRequest({ campaignId: 'invalid-id' }, {
        reason: 'Invalid ID test',
      });
      
      const response = await POST(request, {
        params: { id: 'invalid-id', pledgeId: testPledge.id },
      });
      
      // Should return 404 since invalid campaign ID won't find pledge
      expect(response.status).toBe(404);
    });

    test('should handle missing request body', async () => {
      const url = new URL(
        `http://localhost:3000/api/campaigns/${testCampaign.id}/pledges/${testPledge.id}/cancel`
      );
      const headers = createAuthHeaders(testUser);
      
      const request = new NextRequest(url, {
        method: 'POST',
        headers,
        // No body
      });
      
      const response = await POST(request, {
        params: { id: testCampaign.id, pledgeId: testPledge.id },
      });
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });
});