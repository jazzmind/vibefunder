/**
 * Test Helper Utilities for VibeFunder
 * 
 * Provides utilities for creating test data, cleanup, and common test operations
 */

import { PrismaClient } from '@prisma/client';

// Use singleton pattern for test database connection
let prisma: PrismaClient;

if (!global.testPrisma) {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    console.warn('⚠️  TEST_DATABASE_URL not configured, falling back to DATABASE_URL');
  }
  
  global.testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: testDatabaseUrl || process.env.DATABASE_URL
      }
    }
  });
}

prisma = global.testPrisma;

export interface TestUserData {
  email: string;
  name?: string;
  org?: string;
  roles?: string[];
}

export interface TestCampaignData {
  makerId: string;
  title: string;
  summary: string;
  description?: string;
  fundingGoalDollars?: number;
  status?: string;
  image?: string | null;
  organizationId?: string;
}

export interface TestOrganizationData {
  name: string;
  email: string;
  ownerId: string;
  type?: string;
  status?: string;
  description?: string;
  website?: string;
}

/**
 * Create a test user
 */
export async function createTestUser(userData: TestUserData) {
  const user = await prisma.user.create({
    data: {
      email: userData.email,
      name: userData.name || 'Test User',
      org: userData.org,
      roles: userData.roles || ['user'],
      createdAt: new Date()
    }
  });

  return user;
}

/**
 * Create a test campaign
 */
export async function createTestCampaign(campaignData: TestCampaignData) {
  const campaign = await prisma.campaign.create({
    data: {
      makerId: campaignData.makerId,
      title: campaignData.title,
      summary: campaignData.summary,
      description: campaignData.description,
      fundingGoalDollars: campaignData.fundingGoalDollars || 50000,
      status: campaignData.status || 'draft',
      image: campaignData.image,
      organizationId: campaignData.organizationId,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    include: {
      maker: true,
      organization: true,
      milestones: true,
      pledgeTiers: true
    }
  });

  return campaign;
}

/**
 * Create a test organization
 */
export async function createTestOrganization(orgData: TestOrganizationData) {
  const organization = await prisma.organization.create({
    data: {
      name: orgData.name,
      email: orgData.email,
      ownerId: orgData.ownerId,
      type: orgData.type || 'creator',
      status: orgData.status || 'pending',
      description: orgData.description,
      website: orgData.website,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    include: {
      owner: true,
      campaigns: true
    }
  });

  return organization;
}

/**
 * Create a test milestone
 */
export async function createTestMilestone(campaignId: string, milestoneData: Partial<any> = {}) {
  const milestone = await prisma.milestone.create({
    data: {
      campaignId,
      name: milestoneData.name || 'Test Milestone',
      pct: milestoneData.pct || 25,
      dueDate: milestoneData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      acceptance: milestoneData.acceptance || { criteria: 'Test acceptance criteria' },
      status: milestoneData.status || 'pending',
      evidence: milestoneData.evidence || [],
      createdAt: new Date()
    }
  });

  return milestone;
}

/**
 * Create a test pledge
 */
export async function createTestPledge(campaignId: string, backerId: string, amount: number = 100) {
  const pledge = await prisma.pledge.create({
    data: {
      campaignId,
      backerId,
      amountDollars: amount,
      status: 'authorized',
      createdAt: new Date()
    }
  });

  return pledge;
}

/**
 * Create a test pledge tier
 */
export async function createTestPledgeTier(campaignId: string, tierData: Partial<any> = {}) {
  const pledgeTier = await prisma.pledgeTier.create({
    data: {
      campaignId,
      title: tierData.title || 'Test Tier',
      description: tierData.description || 'Test tier description',
      amountDollars: tierData.amountDollars || 50,
      benefits: tierData.benefits || ['Early access', 'Thank you email'],
      isActive: tierData.isActive !== false,
      order: tierData.order || 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  return pledgeTier;
}

/**
 * Create test comment
 */
export async function createTestComment(campaignId: string, userId: string, content: string = 'Test comment') {
  const comment = await prisma.comment.create({
    data: {
      campaignId,
      userId,
      content,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  return comment;
}

/**
 * Create test passkey for user
 */
export async function createTestPasskey(userId: string, passkeyData: Partial<any> = {}) {
  const passkey = await prisma.passkey.create({
    data: {
      userId,
      credentialId: passkeyData.credentialId || 'test-credential-' + Date.now(),
      publicKey: passkeyData.publicKey || 'test-public-key',
      counter: passkeyData.counter || 0,
      name: passkeyData.name || 'Test Passkey',
      createdAt: new Date()
    }
  });

  return passkey;
}

/**
 * Generate random test email
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

/**
 * Generate random test data
 */
export function generateTestString(prefix: string = 'test', length: number = 8): string {
  const random = Math.random().toString(36).substring(2, 2 + length);
  return `${prefix}-${random}`;
}

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clean up ALL data in test environment (for global teardown)
 */
export async function cleanupAllTestData(): Promise<void> {
  if (process.env.NODE_ENV !== 'test') {
    console.log('⚠️  Skipping cleanup - not in test environment');
    return;
  }

  try {
    console.log('🧹 Cleaning up ALL test data (global teardown)...');
    
    // Delete in order to respect foreign key constraints
    await prisma.comment.deleteMany({});
    await prisma.pledge.deleteMany({});
    await prisma.milestone.deleteMany({});
    await prisma.pledgeTier.deleteMany({});
    await prisma.stretchGoal.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.campaign.deleteMany({});
    await prisma.passkey.deleteMany({});
    await prisma.otpCode.deleteMany({});
    await prisma.organizationTeamMember.deleteMany({});
    await prisma.organizationService.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.waitlist.deleteMany({});
    await prisma.user.deleteMany({});
    
    console.log('✅ All test data cleaned up');
  } catch (error) {
    console.error('❌ Error during global cleanup:', error);
  }
}

/**
 * Clean up test data for individual tests
 */
export async function cleanupTestData(): Promise<void> {
  try {
    console.log('🧹 Cleaning up test data...');

    // Strategy 1: Clean up by test patterns and recent data
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'test' } },
          { email: { contains: 'testsignup' } }, // Our actual test user
          { email: { endsWith: '@example.com' } }, // Common test domain
          { email: { endsWith: '@demo.dev' } }, // Demo emails
          { email: { endsWith: '@sonnenreich.com' } }, // Our test domain
          { name: { contains: 'test' } },
          { name: { contains: 'Test' } }
        ]
      }
    });

    // Get campaigns created in the last 2 hours (during test runs)
    const recentCampaigns = await prisma.campaign.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
        }
      }
    });

    // Strategy 2: If no specific test data found, check for any test environment data
    let allCampaigns = [];
    if (testUsers.length === 0 && recentCampaigns.length === 0) {
      // In test environment, clean up everything
      if (process.env.NODE_ENV === 'test') {
        allCampaigns = await prisma.campaign.findMany();
        console.log(`Test environment: Found ${allCampaigns.length} total campaigns to clean up`);
      }
    }

    const testUserIds = testUsers.map(u => u.id);
    const campaignsToClean = recentCampaigns.length > 0 ? recentCampaigns : allCampaigns;
    const testCampaignIds = campaignsToClean.map(c => c.id);

    console.log(`Found ${testUsers.length} test users and ${campaignsToClean.length} campaigns to clean up`);
    
    if (testUsers.length === 0 && campaignsToClean.length === 0) {
      console.log('✅ No test data to clean up');
      return;
    }

    if (campaignsToClean.length > 0) {
      console.log(`Cleaning up campaigns: ${testCampaignIds.slice(0, 3).join(', ')}${testCampaignIds.length > 3 ? '...' : ''}`);
    }

    // Delete comments first
    await prisma.comment.deleteMany({
      where: {
        userId: {
          in: testUserIds
        }
      }
    });

    // Use the campaigns we already identified for deletion
    // testCampaignIds is already set above

    // Delete pledges, milestones, tiers, team members
    await prisma.pledge.deleteMany({
      where: {
        OR: [
          { backerId: { in: testUserIds } },
          { campaignId: { in: testCampaignIds } }
        ]
      }
    });

    await prisma.milestone.deleteMany({
      where: {
        campaignId: {
          in: testCampaignIds
        }
      }
    });

    await prisma.pledgeTier.deleteMany({
      where: {
        campaignId: {
          in: testCampaignIds
        }
      }
    });

    await prisma.stretchGoal.deleteMany({
      where: {
        campaignId: {
          in: testCampaignIds
        }
      }
    });

    await prisma.teamMember.deleteMany({
      where: {
        OR: [
          { userId: { in: testUserIds } },
          { campaignId: { in: testCampaignIds } }
        ]
      }
    });

    // Delete campaigns
    await prisma.campaign.deleteMany({
      where: {
        id: {
          in: testCampaignIds
        }
      }
    });

    // Delete auth-related data
    await prisma.passkey.deleteMany({
      where: {
        userId: {
          in: testUserIds
        }
      }
    });

    await prisma.otpCode.deleteMany({
      where: {
        userId: {
          in: testUserIds
        }
      }
    });

    // Delete organization data
    const testOrganizations = await prisma.organization.findMany({
      where: {
        OR: [
          { ownerId: { in: testUserIds } },
          { email: { contains: 'test' } }
        ]
      }
    });

    const testOrgIds = testOrganizations.map(o => o.id);

    await prisma.organizationTeamMember.deleteMany({
      where: {
        OR: [
          { userId: { in: testUserIds } },
          { organizationId: { in: testOrgIds } }
        ]
      }
    });

    await prisma.organizationService.deleteMany({
      where: {
        organizationId: {
          in: testOrgIds
        }
      }
    });

    await prisma.organization.deleteMany({
      where: {
        id: {
          in: testOrgIds
        }
      }
    });

    // Delete waitlist entries
    await prisma.waitlist.deleteMany({
      where: {
        email: {
          contains: 'test'
        }
      }
    });

    // Finally, delete users
    await prisma.user.deleteMany({
      where: {
        id: {
          in: testUserIds
        }
      }
    });

    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('⚠️  Error during test cleanup:', error);
    // Don't throw - cleanup failures shouldn't fail tests
  }
}

/**
 * Reset database to clean state
 */
export async function resetTestDatabase(): Promise<void> {
  await cleanupTestData();
  console.log('🔄 Test database reset completed');
}

/**
 * Create a complete test scenario with user, organization, and campaign
 */
export async function createTestScenario() {
  const user = await createTestUser({
    email: generateTestEmail('scenario'),
    name: 'Scenario Test User',
    roles: ['user']
  });

  const organization = await createTestOrganization({
    name: 'Test Scenario Org',
    email: generateTestEmail('org'),
    ownerId: user.id,
    type: 'creator',
    status: 'approved'
  });

  const campaign = await createTestCampaign({
    makerId: user.id,
    organizationId: organization.id,
    title: 'Complete Test Campaign',
    summary: 'Full scenario test campaign',
    description: 'This is a comprehensive test campaign with all features',
    fundingGoalDollars: 100000,
    status: 'published'
  });

  const milestone = await createTestMilestone(campaign.id, {
    name: 'First Milestone',
    pct: 50
  });

  const pledgeTier = await createTestPledgeTier(campaign.id, {
    title: 'Early Bird',
    amountDollars: 25
  });

  return {
    user,
    organization,
    campaign,
    milestone,
    pledgeTier
  };
}

/**
 * Mock authentication helper
 */
export function createAuthHeaders(userId: string): Record<string, string> {
  return {
    'x-test-user-id': userId,
    'Content-Type': 'application/json'
  };
}

/**
 * Mock admin authentication helper
 */
export function createAdminAuthHeaders(userId: string): Record<string, string> {
  return {
    'x-test-user-id': userId,
    'x-test-admin': 'true',
    'Content-Type': 'application/json'
  };
}

export { prisma as testPrisma };