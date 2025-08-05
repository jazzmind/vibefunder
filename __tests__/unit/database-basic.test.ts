/**
 * Basic Database Tests for VibeFunder
 * 
 * Tests basic database connectivity and simple operations
 */

import { testPrisma } from '../utils/test-helpers';

describe('Database Basic Tests', () => {
  beforeAll(async () => {
    // Ensure we can connect to the test database
    try {
      await testPrisma.$connect();
    } catch (error) {
      console.error('Failed to connect to test database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up connection
    await testPrisma.$disconnect();
  });

  it('should connect to test database', async () => {
    const result = await testPrisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
  });

  it('should have the correct database schema', async () => {
    // Check that key tables exist
    const tables = await testPrisma.$queryRaw`
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
    const user = await testPrisma.user.create({
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
    const foundUser = await testPrisma.user.findUnique({
      where: { email: testEmail }
    });
    expect(foundUser).toBeTruthy();
    expect(foundUser?.id).toBe(user.id);

    // Clean up
    await testPrisma.user.delete({
      where: { id: user.id }
    });

    // Verify user is deleted
    const deletedUser = await testPrisma.user.findUnique({
      where: { email: testEmail }
    });
    expect(deletedUser).toBeNull();
  });

  it('should enforce unique email constraint', async () => {
    const testEmail = `unique-test-${Date.now()}@example.com`;
    
    // Create first user
    const user1 = await testPrisma.user.create({
      data: {
        email: testEmail,
        name: 'First User'
      }
    });

    // Try to create second user with same email
    await expect(
      testPrisma.user.create({
        data: {
          email: testEmail,
          name: 'Second User'
        }
      })
    ).rejects.toThrow();

    // Clean up
    await testPrisma.user.delete({
      where: { id: user1.id }
    });
  });

  it('should handle foreign key relationships', async () => {
    const testEmail = `fk-test-${Date.now()}@example.com`;
    
    // Create user
    const user = await testPrisma.user.create({
      data: {
        email: testEmail,
        name: 'FK Test User'
      }
    });

    // Create campaign
    const campaign = await testPrisma.campaign.create({
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
    const campaignWithUser = await testPrisma.campaign.findUnique({
      where: { id: campaign.id },
      include: { maker: true }
    });

    expect(campaignWithUser?.maker.email).toBe(testEmail);

    // Clean up (order matters due to FK constraints)
    await testPrisma.campaign.delete({ where: { id: campaign.id } });
    await testPrisma.user.delete({ where: { id: user.id } });
  });

  it('should handle JSON fields correctly', async () => {
    const testEmail = `json-test-${Date.now()}@example.com`;
    
    // Create user and organization with JSON data
    const user = await testPrisma.user.create({
      data: {
        email: testEmail,
        name: 'JSON Test User',
        roles: ['user', 'admin'] // Array field
      }
    });

    const organization = await testPrisma.organization.create({
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
    const retrievedOrg = await testPrisma.organization.findUnique({
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
    await testPrisma.organization.delete({ where: { id: organization.id } });
    await testPrisma.user.delete({ where: { id: user.id } });
  });
});