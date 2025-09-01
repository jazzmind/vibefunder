/**
 * Basic Database Tests for VibeFunder
 * 
 * Tests basic database connectivity and simple operations
 */

import { 
  getPrismaClient, 
  setupTestEnvironment, 
  teardownTestEnvironment 
} from '../utils/test-helpers';

describe('Database Basic Tests', () => {
  let prisma: ReturnType<typeof getPrismaClient>;

  beforeAll(async () => {
    await setupTestEnvironment();
    prisma = getPrismaClient();
  });

  afterAll(async () => {
    const testPatterns = [
      {
        table: 'user',
        where: { email: { contains: 'test-basic@example.com' } }
      }
    ];
    await teardownTestEnvironment(testPatterns);
  });

  it('should connect to test database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
  });

  it('should have the correct database schema', async () => {
    // Check that key tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const tableNames = (tables as any[]).map(t => t.table_name);
    
    // Verify core tables exist
    expect(tableNames).toContain('User');
    expect(tableNames).toContain('Campaign');
    expect(tableNames).toContain('Organization');
    expect(tableNames).toContain('Pledge');
    expect(tableNames).toContain('Milestone');
  });

  it('should be able to create and delete a test user', async () => {
    const testEmail = `db-test-${Date.now()}@example.com`;
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Database Test User',
        roles: ['user']
      }
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe(testEmail);
    expect(user.name).toBe('Database Test User');

    // Verify user exists
    const foundUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    expect(foundUser).toBeTruthy();
    expect(foundUser?.id).toBe(user.id);

    // Clean up
    await prisma.user.delete({
      where: { id: user.id }
    });

    // Verify user is deleted
    const deletedUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    expect(deletedUser).toBeNull();
  });

  // TODO: Fix Jest async error handling - Prisma throws error but Jest doesn't catch it
  it.skip('should enforce unique email constraint', async () => {
    const testEmail = `unique-test-${Date.now()}@example.com`;
    
    // Create first user
    const user1 = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'First User'
      }
    });

    // Try to create second user with same email
    await expect(
      prisma.user.create({
        data: {
          email: testEmail,
          name: 'Second User'
        }
      })
    ).rejects.toThrow();

    // Clean up
    await prisma.user.delete({
      where: { id: user1.id }
    });
  });

  it('should handle foreign key relationships', async () => {
    const testEmail = `fk-test-${Date.now()}@example.com`;
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'FK Test User'
      }
    });

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        makerId: user.id,
        title: 'FK Test Campaign',
        summary: 'Testing foreign key relationships',
        fundingGoalDollars: 10000,
      }
    });

    expect(campaign.id).toBeDefined();
    expect(campaign.makerId).toBe(user.id);

    // Verify relationship works
    const campaignWithUser = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: { maker: true }
    });

    expect(campaignWithUser?.maker.email).toBe(testEmail);

    // Clean up (order matters due to FK constraints)
    await prisma.campaign.delete({ where: { id: campaign.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should handle JSON fields correctly', async () => {
    const testEmail = `json-test-${Date.now()}@example.com`;
    
    // Create user and organization with JSON data
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'JSON Test User',
        roles: ['user', 'admin'] // Array field
      }
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'JSON Test Org',
        email: `org-${testEmail}`,
        ownerId: user.id,
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zip: '12345'
        },
        portfolioItems: [
          { title: 'Project 1', description: 'First project' },
          { title: 'Project 2', description: 'Second project' }
        ]
      }
    });

    // Verify JSON data is stored and retrieved correctly
    const retrievedOrg = await prisma.organization.findUnique({
      where: { id: organization.id }
    });

    expect(retrievedOrg?.address).toEqual({
      street: '123 Test St',
      city: 'Test City',
      state: 'CA',
      zip: '12345'
    });

    expect(retrievedOrg?.portfolioItems).toHaveLength(2);
    expect((retrievedOrg?.portfolioItems as any[])[0].title).toBe('Project 1');

    // Clean up
    await prisma.organization.delete({ where: { id: organization.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});