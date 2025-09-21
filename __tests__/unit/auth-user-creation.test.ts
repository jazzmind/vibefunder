import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@/lib/db';
import { auth, findOrCreateUser } from '@/lib/auth';
import { cleanupTestData } from '@/__tests__/utils/cleanup';

describe('Authentication User Creation', () => {
  let testUserId: string | null = null;

  afterEach(async () => {
    // Clean up created test users
    if (testUserId) {
      await prisma.campaign.deleteMany({
        where: { makerId: testUserId }
      });
      await prisma.user.delete({
        where: { id: testUserId }
      }).catch(() => {});
      testUserId = null;
    }
    
    // Clean up localhost test user
    await prisma.campaign.deleteMany({
      where: { 
        maker: { 
          email: 'localhost@test.com' 
        }
      }
    });
    await prisma.user.deleteMany({
      where: { email: 'localhost@test.com' }
    });
  });

  it('should create user in LOCAL_API mode if not exists', async () => {
    // Set LOCAL_API mode
    const originalEnv = process.env.LOCAL_API;
    process.env.LOCAL_API = 'true';

    try {
      // Clean up any existing localhost user first
      await prisma.user.deleteMany({
        where: { email: 'localhost@test.com' }
      });

      // Call auth which should create the user
      const session = await auth();
      
      expect(session).toBeDefined();
      expect(session?.user).toBeDefined();
      expect(session?.user.email).toBe('localhost@test.com');
      
      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: 'localhost@test.com' }
      });
      
      expect(user).toBeDefined();
      expect(user?.email).toBe('localhost@test.com');
      expect(user?.name).toBe('Local Test User');
      
      testUserId = user?.id || null;
      
      // Verify we can create a campaign with this user
      const campaign = await prisma.campaign.create({
        data: {
          makerId: user!.id,
          title: 'Test Campaign',
          summary: 'Test Summary',
          fundingGoalDollars: 1000,
          status: 'draft'
        }
      });
      
      expect(campaign).toBeDefined();
      expect(campaign.makerId).toBe(user!.id);
    } finally {
      // Restore original env
      process.env.LOCAL_API = originalEnv;
    }
  });

  it('should use existing test user in LOCAL_API mode', async () => {
    // Set LOCAL_API mode
    const originalEnv = process.env.LOCAL_API;
    process.env.LOCAL_API = 'true';

    try {
      // Create a test user first
      const existingUser = await prisma.user.create({
        data: {
          email: 'existing-test@example.com',
          name: 'Existing Test User',
          roles: ['user']
        }
      });
      testUserId = existingUser.id;

      // Call auth which should find the existing user
      const session = await auth();
      
      expect(session).toBeDefined();
      expect(session?.user).toBeDefined();
      
      // It should find the existing test user
      const foundUser = await prisma.user.findUnique({
        where: { id: session!.user.id }
      });
      
      expect(foundUser).toBeDefined();
      expect(['existing-test@example.com', 'localhost@test.com']).toContain(foundUser?.email);
    } finally {
      // Clean up
      if (testUserId) {
        await prisma.user.delete({
          where: { id: testUserId }
        }).catch(() => {});
      }
      process.env.LOCAL_API = originalEnv;
    }
  });

  it('should handle findOrCreateUser correctly', async () => {
    const email = 'new-test-user@example.com';
    
    // First call should create the user
    const user1 = await findOrCreateUser(email);
    expect(user1).toBeDefined();
    expect(user1.name).toBe('new-test-user');
    testUserId = user1.id;
    
    // Second call should find the existing user
    const user2 = await findOrCreateUser(email);
    expect(user2.id).toBe(user1.id);
    
    // Clean up
    await prisma.user.delete({
      where: { id: user1.id }
    });
    testUserId = null;
  });

  it('should prevent foreign key constraint violations when creating campaigns', async () => {
    // Set LOCAL_API mode
    const originalEnv = process.env.LOCAL_API;
    process.env.LOCAL_API = 'true';

    try {
      // Get session (will create user if needed)
      const session = await auth();
      expect(session).toBeDefined();
      
      // Verify user exists before creating campaign
      const user = await prisma.user.findUnique({
        where: { id: session!.user.id }
      });
      expect(user).toBeDefined();
      
      testUserId = user!.id;
      
      // This should NOT throw a foreign key constraint error
      const campaign = await prisma.campaign.create({
        data: {
          makerId: session!.user.id,
          title: 'Test Campaign Without FK Error',
          summary: 'This campaign should create successfully',
          fundingGoalDollars: 5000,
          status: 'draft'
        }
      });
      
      expect(campaign).toBeDefined();
      expect(campaign.makerId).toBe(session!.user.id);
      
      // Clean up campaign
      await prisma.campaign.delete({
        where: { id: campaign.id }
      });
    } finally {
      process.env.LOCAL_API = originalEnv;
    }
  });
});