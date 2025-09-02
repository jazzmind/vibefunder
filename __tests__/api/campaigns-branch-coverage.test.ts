/**
 * Campaigns API Branch Coverage Tests
 * 
 * This file focuses on testing all conditional branches in the campaigns route
 * to improve branch coverage by testing edge cases and error conditions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/campaigns/route';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { z } from 'zod';

// Mock dependencies
jest.mock('@/lib/db');
jest.mock('@/lib/auth');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('Campaigns API Branch Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log to reduce noise
    console.error = jest.fn(); // Mock console.error
  });

  describe('GET /api/campaigns - All Branches', () => {
    it('should return campaigns successfully', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          title: 'Test Campaign',
          status: 'published',
          maker: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
          organization: { id: 'org-1', name: 'Test Org' }
        }
      ];

      mockPrisma.campaign.findMany.mockResolvedValue(mockCampaigns as any);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual(mockCampaigns);
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith({
        where: { status: 'published' },
        orderBy: { createdAt: 'desc' },
        include: {
          maker: {
            select: { id: true, name: true, email: true }
          },
          organization: {
            select: { id: true, name: true }
          }
        }
      });
    });

    it('should handle database error', async () => {
      mockPrisma.campaign.findMany.mockRejectedValue(new Error('Database connection failed'));

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({ error: 'Internal server error' });
      expect(console.error).toHaveBeenCalledWith('Error fetching campaigns:', expect.any(Error));
    });

    it('should handle database timeout error', async () => {
      mockPrisma.campaign.findMany.mockRejectedValue(new Error('Query timeout'));

      const response = await GET();
      
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/campaigns - Authentication Branches', () => {
    it('should return 401 when no session', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Campaign',
          summary: 'Test summary',
          fundingGoalDollars: 50000
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toEqual({ error: 'Unauthorized' });
      expect(console.log).toHaveBeenCalledWith('[API] No session or user ID, returning 401');
    });

    it('should return 401 when session has no user', async () => {
      mockAuth.mockResolvedValue({ user: null } as any);

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Campaign',
          summary: 'Test summary',
          fundingGoalDollars: 50000
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 401 when session user has no ID', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@example.com' } } as any);

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Campaign',
          summary: 'Test summary',
          fundingGoalDollars: 50000
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/campaigns - Organization Validation Branches', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
    });

    it('should create campaign without organization', async () => {
      const mockCreatedCampaign = {
        id: 'campaign-123',
        title: 'Test Campaign',
        summary: 'Test summary',
        fundingGoalDollars: 50000,
        makerId: 'user-123',
        status: 'draft',
        maker: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        organization: null
      };

      mockPrisma.campaign.create.mockResolvedValue(mockCreatedCampaign as any);

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Campaign',
          summary: 'Test summary',
          fundingGoalDollars: 50000
          // No organizationId
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData).toEqual(mockCreatedCampaign);
      expect(mockPrisma.organization.findFirst).not.toHaveBeenCalled();
    });

    it('should validate organization ownership when organizationId provided', async () => {
      const mockOrganization = {
        id: 'org-123',
        ownerId: 'user-123',
        name: 'Test Org'
      };

      const mockCreatedCampaign = {
        id: 'campaign-123',
        title: 'Test Campaign',
        organizationId: 'org-123',
        maker: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        organization: { id: 'org-123', name: 'Test Org' }
      };

      mockPrisma.organization.findFirst.mockResolvedValue(mockOrganization as any);
      mockPrisma.campaign.create.mockResolvedValue(mockCreatedCampaign as any);

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Campaign',
          summary: 'Test summary',
          fundingGoalDollars: 50000,
          organizationId: 'org-123'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockPrisma.organization.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'org-123',
          ownerId: 'user-123'
        }
      });
    });

    it('should return 403 when organization not found', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Campaign',
          summary: 'Test summary',
          fundingGoalDollars: 50000,
          organizationId: 'non-existent-org'
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData).toEqual({ error: 'Organization not found or not owned by user' });
    });

    it('should return 403 when organization not owned by user', async () => {
      const mockOrganization = {
        id: 'org-123',
        ownerId: 'different-user',
        name: 'Test Org'
      };

      mockPrisma.organization.findFirst.mockResolvedValue(null); // Query filters by ownerId

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Campaign',
          summary: 'Test summary',
          fundingGoalDollars: 50000,
          organizationId: 'org-123'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/campaigns - Validation Error Branches', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
    });

    it('should return 400 for Zod validation errors', async () => {
      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          summary: 'Test summary'
          // title and fundingGoalDollars missing
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid input data');
      expect(responseData.details).toBeDefined();
    });

    it('should return 400 for invalid title length', async () => {
      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: '', // Empty title
          summary: 'Test summary',
          fundingGoalDollars: 50000
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid funding goal', async () => {
      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Valid Title',
          summary: 'Test summary',
          fundingGoalDollars: -1000 // Invalid negative amount
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for funding goal exceeding maximum', async () => {
      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Valid Title',
          summary: 'Test summary',
          fundingGoalDollars: 20000000 // Exceeds max of 10M
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for title exceeding maximum length', async () => {
      const longTitle = 'a'.repeat(201); // Exceeds max of 200

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: longTitle,
          summary: 'Test summary',
          fundingGoalDollars: 50000
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for summary exceeding maximum length', async () => {
      const longSummary = 'a'.repeat(501); // Exceeds max of 500

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Valid Title',
          summary: longSummary,
          fundingGoalDollars: 50000
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/campaigns - Database Error Branches', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
    });

    it('should return 500 when campaign creation fails', async () => {
      mockPrisma.campaign.create.mockRejectedValue(new Error('Database write failed'));

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Campaign',
          summary: 'Test summary',
          fundingGoalDollars: 50000
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({ error: 'Internal server error' });
      expect(console.error).toHaveBeenCalledWith('Error creating campaign:', expect.any(Error));
    });

    it('should return 500 when organization query fails', async () => {
      mockPrisma.organization.findFirst.mockRejectedValue(new Error('Database query failed'));

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Campaign',
          summary: 'Test summary',
          fundingGoalDollars: 50000,
          organizationId: 'org-123'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/campaigns - JSON Parsing Edge Cases', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: 'invalid json{'
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should handle empty body', async () => {
      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: ''
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should handle non-string body types', async () => {
      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: null as any
      });

      const response = await POST(request);

      // Should handle the null body gracefully
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('POST /api/campaigns - Success Path with All Optional Fields', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
    });

    it('should create campaign with all optional fields', async () => {
      const mockCreatedCampaign = {
        id: 'campaign-123',
        title: 'Complete Campaign',
        summary: 'Complete summary',
        description: 'Detailed description',
        fundingGoalDollars: 75000,
        organizationId: 'org-123',
        makerId: 'user-123',
        status: 'draft',
        maker: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        organization: { id: 'org-123', name: 'Test Org' }
      };

      mockPrisma.organization.findFirst.mockResolvedValue({
        id: 'org-123',
        ownerId: 'user-123',
        name: 'Test Org'
      } as any);
      mockPrisma.campaign.create.mockResolvedValue(mockCreatedCampaign as any);

      const request = new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Complete Campaign',
          summary: 'Complete summary',
          description: 'Detailed description',
          fundingGoalDollars: 75000,
          organizationId: 'org-123'
        })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData).toEqual(mockCreatedCampaign);
      expect(mockPrisma.campaign.create).toHaveBeenCalledWith({
        data: {
          title: 'Complete Campaign',
          summary: 'Complete summary',
          description: 'Detailed description',
          fundingGoalDollars: 75000,
          organizationId: 'org-123',
          makerId: 'user-123',
          status: 'draft'
        },
        include: {
          maker: {
            select: { id: true, name: true, email: true }
          },
          organization: {
            select: { id: true, name: true }
          }
        }
      });
    });
  });
});