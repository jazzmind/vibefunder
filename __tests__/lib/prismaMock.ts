/**
 * Prisma Mock Singleton for Service Layer Tests
 * 
 * This file provides mocked Prisma client functionality for service layer testing
 * without requiring actual database connections.
 */

import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

export type MockPrisma = DeepMockProxy<PrismaClient>;

const prismaMock: MockPrisma = mockDeep<PrismaClient>();

// Mock common Prisma operations with realistic behavior
beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
  
  // Default mock implementations for common database operations
  prismaMock.user.findUnique.mockImplementation((args) => {
    const { where } = args || {};
    
    if (where?.id === 'test-user-1') {
      return Promise.resolve({
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: null,
        image: null,
        bio: null,
        socialLinks: {},
        isPublic: true,
        role: 'USER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    return Promise.resolve(null);
  });

  prismaMock.user.create.mockImplementation((args) => {
    const data = args?.data || {};
    return Promise.resolve({
      id: 'mock-user-id',
      email: data.email || 'mock@example.com',
      name: data.name || 'Mock User',
      emailVerified: null,
      image: null,
      bio: null,
      socialLinks: {},
      isPublic: true,
      role: 'USER' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    });
  });

  prismaMock.campaign.findUnique.mockImplementation((args) => {
    const { where } = args || {};
    
    if (where?.id === 'test-campaign-1') {
      return Promise.resolve({
        id: 'test-campaign-1',
        title: 'Test Campaign',
        summary: 'Test campaign summary',
        description: 'Test campaign description',
        fundingGoalDollars: 10000,
        amountRaisedDollars: 2500,
        status: 'published',
        makerId: 'test-user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        launchedAt: null,
        sectors: [],
        deployModes: [],
        tags: [],
        repositoryUrl: null,
        websiteUrl: null,
      });
    }
    
    return Promise.resolve(null);
  });

  prismaMock.campaign.create.mockImplementation((args) => {
    const data = args?.data || {};
    return Promise.resolve({
      id: 'mock-campaign-id',
      title: data.title || 'Mock Campaign',
      summary: data.summary || 'Mock summary',
      description: data.description || 'Mock description',
      fundingGoalDollars: data.fundingGoalDollars || 10000,
      amountRaisedDollars: 0,
      status: data.status || 'draft',
      makerId: 'test-user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      endsAt: data.endsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      launchedAt: null,
      sectors: data.sectors || [],
      deployModes: data.deployModes || [],
      tags: data.tags || [],
      repositoryUrl: data.repositoryUrl || null,
      websiteUrl: data.websiteUrl || null,
      ...data,
    });
  });

  prismaMock.pledgeTier.findMany.mockImplementation(() => {
    return Promise.resolve([
      {
        id: 'tier-1',
        title: 'Basic Tier',
        description: 'Basic support tier',
        amountDollars: 25,
        stockLimit: null,
        stockSold: 0,
        estimatedDelivery: null,
        benefits: ['Thank you message'],
        campaignId: 'test-campaign-1',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tier-2',
        title: 'Premium Tier',
        description: 'Premium support with extras',
        amountDollars: 100,
        stockLimit: 50,
        stockSold: 10,
        estimatedDelivery: 'Q2 2024',
        benefits: ['Thank you message', 'Early access'],
        campaignId: 'test-campaign-1',
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  prismaMock.pledge.create.mockImplementation((args) => {
    const data = args?.data || {};
    return Promise.resolve({
      id: 'mock-pledge-id',
      amountDollars: data.amountDollars || 100,
      status: data.status || 'pending',
      pledgerId: 'test-user-1',
      campaignId: 'test-campaign-1',
      pledgeTierId: data.pledgeTierId || null,
      stripePaymentIntentId: null,
      paymentMethod: 'stripe',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    });
  });

  prismaMock.milestone.findMany.mockImplementation(() => {
    return Promise.resolve([
      {
        id: 'milestone-1',
        name: 'Initial Development',
        description: 'Start core development',
        pct: 25,
        dueDate: null,
        status: 'pending',
        campaignId: 'test-campaign-1',
        order: 1,
        acceptance: {
          criteria: 'Code repository setup',
          deliverables: ['GitHub repository', 'Basic structure']
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'milestone-2',
        name: 'Beta Release',
        description: 'Release beta version',
        pct: 75,
        dueDate: null,
        status: 'pending',
        campaignId: 'test-campaign-1',
        order: 2,
        acceptance: {
          criteria: 'Working beta version',
          deliverables: ['Beta release', 'Documentation']
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  // Mock database transactions
  prismaMock.$transaction.mockImplementation(async (fn) => {
    if (typeof fn === 'function') {
      // For interactive transactions, just call the function with the mock
      return await fn(prismaMock);
    } else {
      // For array transactions, just resolve with mock results
      return Promise.resolve(fn);
    }
  });
});

export { prismaMock };