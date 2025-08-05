/**
 * Test Helper Utilities for VibeFunder
 * 
 * Provides utilities for creating test data, cleanup, and common test operations
 */

import { PrismaClient } from '@prisma/client';

// Use singleton pattern for test database connection
let prisma: PrismaClient;

if (!global.testPrisma) {
  global.testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
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
  budgetDollars?: number;
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
      budgetDollars: campaignData.budgetDollars || 45000,
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
 * Clean up all test data
 */
export async function cleanupTestData(): Promise<void> {
  try {
    // Delete in order to respect foreign key constraints
    await prisma.comment.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test'
          }
        }
      }
    });

    await prisma.pledge.deleteMany({
      where: {
        backer: {
          email: {
            contains: 'test'
          }
        }
      }
    });

    await prisma.milestone.deleteMany({
      where: {
        campaign: {
          maker: {
            email: {
              contains: 'test'
            }
          }
        }
      }
    });

    await prisma.pledgeTier.deleteMany({
      where: {
        campaign: {
          maker: {
            email: {
              contains: 'test'
            }
          }
        }
      }
    });

    await prisma.teamMember.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test'
          }
        }
      }
    });

    await prisma.campaign.deleteMany({
      where: {
        maker: {
          email: {
            contains: 'test'
          }
        }
      }
    });

    await prisma.passkey.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test'
          }
        }
      }
    });

    await prisma.otpCode.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test'
          }
        }
      }
    });

    await prisma.organizationTeamMember.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test'
          }
        }
      }
    });

    await prisma.organizationService.deleteMany({
      where: {
        organization: {
          email: {
            contains: 'test'
          }
        }
      }
    });

    await prisma.organization.deleteMany({
      where: {
        email: {
          contains: 'test'
        }
      }
    });

    await prisma.waitlist.deleteMany({
      where: {
        email: {
          contains: 'test'
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test'
        }
      }
    });

    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('⚠️  Error during test cleanup:', error);
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