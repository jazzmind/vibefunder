/**
 * Database Test Helpers
 * These helpers create real data in the test database for API testing
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * Create a test user in the database
 */
export async function createDbTestUser(data?: Partial<Prisma.UserCreateInput>) {
  const uniqueId = Date.now() + Math.random().toString(36).substring(7);
  
  const userData = {
    email: data?.email || `test-${uniqueId}@example.com`,
    name: data?.name || `Test User ${uniqueId}`,
    ...data,
  };
  
  // Remove emailVerified if it was passed in data
  delete (userData as any).emailVerified;
  
  return await prisma.user.create({
    data: userData,
  });
}

/**
 * Create a test campaign in the database
 */
export async function createDbTestCampaign(
  userId: string,
  data?: Partial<Prisma.CampaignCreateInput>
) {
  const uniqueId = Date.now() + Math.random().toString(36).substring(7);
  
  const campaignData: Prisma.CampaignCreateInput = {
    title: data?.title || `Test Campaign ${uniqueId}`,
    summary: data?.summary || 'Test campaign summary',
    description: data?.description || 'Test campaign description',
    fundingGoalDollars: data?.fundingGoalDollars || 10000,
    status: data?.status || 'published',
    endsAt: data?.endsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    maker: {
      connect: { id: userId }
    },
  };
  
  return await prisma.campaign.create({
    data: campaignData,
  });
}

/**
 * Create a test pledge tier in the database
 */
export async function createDbTestPledgeTier(
  campaignId: string,
  data?: Partial<Prisma.PledgeTierCreateInput>
) {
  const tierData: Prisma.PledgeTierCreateInput = {
    name: data?.name || 'Test Tier',
    description: data?.description || 'Test tier description',
    amountDollars: data?.amountDollars || 100,
    stockLimit: data?.stockLimit || 100,
    stockClaimed: data?.stockClaimed || 0,
    campaign: {
      connect: { id: campaignId }
    },
  };
  
  return await prisma.pledgeTier.create({
    data: tierData,
  });
}

/**
 * Create a test pledge in the database
 */
export async function createDbTestPledge(
  userId: string,
  campaignId: string,
  data?: Partial<Prisma.PledgeCreateInput>
) {
  return await prisma.pledge.create({
    data: {
      amountDollars: data?.amountDollars || 100,
      status: data?.status || 'pending',
      user: {
        connect: { id: userId }
      },
      campaign: {
        connect: { id: campaignId }
      },
      ...data,
    },
  });
}

/**
 * Clean up test data from the database
 * Deletes all data with test email patterns
 */
export async function cleanupDbTestData() {
  try {
    // Delete in correct order to respect foreign key constraints
    
    // First, delete pledges (simplified query)
    await prisma.pledge.deleteMany({});

    // Delete pledge tiers
    await prisma.pledgeTier.deleteMany({});

    // Delete campaigns with test pattern
    await prisma.campaign.deleteMany({
      where: {
        title: {
          contains: 'Test Campaign'
        }
      }
    });

    // Finally, delete test users
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-'
        }
      }
    });
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    // Continue anyway - test may still work
  }
}

/**
 * Create a complete test scenario with user, campaign, and tiers
 */
export async function createTestScenario() {
  const user = await createDbTestUser({
    name: 'Test Pledger',
  });

  const campaign = await createDbTestCampaign(user.id, {
    title: 'Active Test Campaign',
    fundingGoalDollars: 10000,
    status: 'published',
  });

  const tier1 = await createDbTestPledgeTier(campaign.id, {
    name: 'Bronze Tier',
    amountDollars: 50,
    stockLimit: 100,
  });

  const tier2 = await createDbTestPledgeTier(campaign.id, {
    name: 'Silver Tier',
    amountDollars: 100,
    stockLimit: 50,
  });

  const tier3 = await createDbTestPledgeTier(campaign.id, {
    name: 'Gold Tier',
    amountDollars: 500,
    stockLimit: 10,
  });

  return {
    user,
    campaign,
    tiers: [tier1, tier2, tier3],
  };
}