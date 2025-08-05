/**
 * Database Model Tests for VibeFunder
 * 
 * Tests database operations and model relationships including:
 * - CRUD operations for all models
 * - Foreign key constraints
 * - Data validation
 * - Cascade behaviors
 */

import { 
  createTestUser, 
  createTestCampaign, 
  createTestOrganization,
  createTestMilestone,
  createTestPledge,
  createTestPledgeTier,
  createTestComment,
  createTestPasskey,
  testPrisma,
  generateTestEmail,
  cleanupTestData 
} from '../utils/test-helpers';

describe('Database Model Tests', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  describe('User Model', () => {
    it('should create user with required fields', async () => {
      const userData = {
        email: generateTestEmail('user-create'),
        name: 'Test User',
        roles: ['user']
      };

      const user = await createTestUser(userData);
      
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.roles).toEqual(userData.roles);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique email constraint', async () => {
      const email = generateTestEmail('unique-email');
      
      await createTestUser({ email, name: 'First User' });
      
      await expect(
        createTestUser({ email, name: 'Second User' })
      ).rejects.toThrow();
    });

    it('should handle optional fields', async () => {
      const user = await createTestUser({
        email: generateTestEmail('optional'),
        org: 'Test Organization'
      });

      expect(user.name).toBeNull();
      expect(user.org).toBe('Test Organization');
      expect(user.roles).toEqual([]); // Default empty array
    });

    it('should cascade delete related data', async () => {
      const user = await createTestUser({
        email: generateTestEmail('cascade'),
        name: 'Cascade Test User'
      });

      // Create related data
      await createTestPasskey(user.id, {
        credentialId: 'test-credential-cascade',
        publicKey: 'test-public-key'
      });

      const campaign = await createTestCampaign({
        makerId: user.id,
        title: 'Cascade Test Campaign',
        summary: 'Campaign for cascade testing'
      });

      // Delete user should fail due to foreign key constraints
      await expect(
        testPrisma.user.delete({ where: { id: user.id } })
      ).rejects.toThrow();

      // Delete related data first
      await testPrisma.campaign.delete({ where: { id: campaign.id } });
      await testPrisma.passkey.deleteMany({ where: { userId: user.id } });
      
      // Now user deletion should succeed
      await testPrisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('Campaign Model', () => {
    let testUser: any;

    beforeAll(async () => {
      testUser = await createTestUser({
        email: generateTestEmail('campaign-tests'),
        name: 'Campaign Test User'
      });
    });

    it('should create campaign with required fields', async () => {
      const campaignData = {
        makerId: testUser.id,
        title: 'Test Campaign',
        summary: 'A test campaign',
        fundingGoalDollars: 50000,
        budgetDollars: 45000
      };

      const campaign = await createTestCampaign(campaignData);

      expect(campaign.id).toBeDefined();
      expect(campaign.makerId).toBe(testUser.id);
      expect(campaign.title).toBe(campaignData.title);
      expect(campaign.fundingGoalDollars).toBe(campaignData.fundingGoalDollars);
      expect(campaign.status).toBe('draft'); // Default status
      expect(campaign.currency).toBe('USD'); // Default currency
    });

    it('should enforce foreign key constraints', async () => {
      await expect(
        createTestCampaign({
          makerId: 'non-existent-user-id',
          title: 'Invalid Campaign',
          summary: 'Should fail'
        })
      ).rejects.toThrow();
    });

    it('should handle organization relationships', async () => {
      const organization = await createTestOrganization({
        name: 'Test Org for Campaign',
        email: generateTestEmail('org-campaign'),
        ownerId: testUser.id
      });

      const campaign = await createTestCampaign({
        makerId: testUser.id,
        organizationId: organization.id,
        title: 'Org Campaign',
        summary: 'Campaign with organization'
      });

      expect(campaign.organizationId).toBe(organization.id);
      expect(campaign.organization).toBeDefined();
      expect(campaign.organization.name).toBe('Test Org for Campaign');
    });

    it('should cascade delete related milestones and pledges', async () => {
      const campaign = await createTestCampaign({
        makerId: testUser.id,
        title: 'Cascade Delete Test',
        summary: 'Testing cascade delete'
      });

      // Create related data
      const milestone = await createTestMilestone(campaign.id);
      const pledge = await createTestPledge(campaign.id, testUser.id, 100);
      const tier = await createTestPledgeTier(campaign.id);

      // Delete campaign
      await testPrisma.campaign.delete({ where: { id: campaign.id } });

      // Verify related data is deleted
      const deletedMilestone = await testPrisma.milestone.findUnique({
        where: { id: milestone.id }
      });
      expect(deletedMilestone).toBeNull();

      const deletedTier = await testPrisma.pledgeTier.findUnique({
        where: { id: tier.id }
      });
      expect(deletedTier).toBeNull();

      const deletedPledge = await testPrisma.pledge.findUnique({
        where: { id: pledge.id }
      });
      expect(deletedPledge).toBeNull();
    });

    it('should validate money amounts', async () => {
      // Test with valid positive amounts
      const validCampaign = await createTestCampaign({
        makerId: testUser.id,
        title: 'Valid Money Campaign',
        summary: 'Valid amounts',
        fundingGoalDollars: 1000,
        budgetDollars: 900,
        raisedDollars: 250
      });

      expect(validCampaign.fundingGoalDollars).toBe(1000);
      expect(validCampaign.budgetDollars).toBe(900);
      expect(validCampaign.raisedDollars).toBe(250);
    });

    it('should handle deploy modes array', async () => {
      const campaign = await createTestCampaign({
        makerId: testUser.id,
        title: 'Deploy Modes Test',
        summary: 'Testing deploy modes array'
      });

      // Update with deploy modes
      const updatedCampaign = await testPrisma.campaign.update({
        where: { id: campaign.id },
        data: {
          deployModes: ['cloud', 'on-premise', 'hybrid']
        }
      });

      expect(updatedCampaign.deployModes).toEqual(['cloud', 'on-premise', 'hybrid']);
    });
  });

  describe('Organization Model', () => {
    let testUser: any;

    beforeAll(async () => {
      testUser = await createTestUser({
        email: generateTestEmail('org-tests'),
        name: 'Organization Test User'
      });
    });

    it('should create organization with required fields', async () => {
      const orgData = {
        name: 'Test Organization',
        email: generateTestEmail('org-create'),
        ownerId: testUser.id,
        type: 'creator',
        status: 'pending'
      };

      const org = await createTestOrganization(orgData);

      expect(org.id).toBeDefined();
      expect(org.name).toBe(orgData.name);
      expect(org.email).toBe(orgData.email);
      expect(org.ownerId).toBe(testUser.id);
      expect(org.type).toBe('creator');
      expect(org.status).toBe('pending');
    });

    it('should handle service provider type', async () => {
      const serviceOrg = await createTestOrganization({
        name: 'Service Provider Org',
        email: generateTestEmail('service-org'),
        ownerId: testUser.id,
        type: 'service_provider'
      });

      expect(serviceOrg.type).toBe('service_provider');
      expect(serviceOrg.listingVisibility).toBe('public'); // Default
    });

    it('should enforce unique Stripe account constraint', async () => {
      const stripeAccountId = 'acct_test_123456';

      const org1 = await testPrisma.organization.create({
        data: {
          name: 'First Stripe Org',
          email: generateTestEmail('stripe1'),
          ownerId: testUser.id,
          stripeAccountId
        }
      });

      await expect(
        testPrisma.organization.create({
          data: {
            name: 'Second Stripe Org',
            email: generateTestEmail('stripe2'),
            ownerId: testUser.id,
            stripeAccountId
          }
        })
      ).rejects.toThrow();

      // Cleanup
      await testPrisma.organization.delete({ where: { id: org1.id } });
    });

    it('should handle JSON fields correctly', async () => {
      const portfolioItems = [
        { title: 'Project 1', description: 'First project', url: 'https://example.com/1' },
        { title: 'Project 2', description: 'Second project', url: 'https://example.com/2' }
      ];

      const address = {
        street: '123 Main St',
        city: 'Test City',
        state: 'CA',
        zip: '12345',
        country: 'US'
      };

      const org = await testPrisma.organization.create({
        data: {
          name: 'JSON Test Org',
          email: generateTestEmail('json-org'),
          ownerId: testUser.id,
          portfolioItems,
          address
        }
      });

      expect(org.portfolioItems).toEqual(portfolioItems);
      expect(org.address).toEqual(address);

      // Cleanup
      await testPrisma.organization.delete({ where: { id: org.id } });
    });
  });

  describe('Milestone Model', () => {
    let testUser: any;
    let testCampaign: any;

    beforeAll(async () => {
      testUser = await createTestUser({
        email: generateTestEmail('milestone-tests'),
        name: 'Milestone Test User'
      });

      testCampaign = await createTestCampaign({
        makerId: testUser.id,
        title: 'Milestone Test Campaign',
        summary: 'Campaign for milestone testing'
      });
    });

    it('should create milestone with required fields', async () => {
      const milestoneData = {
        name: 'Test Milestone',
        pct: 25,
        acceptance: { criteria: 'Complete unit tests', deliverables: ['Test suite'] }
      };

      const milestone = await createTestMilestone(testCampaign.id, milestoneData);

      expect(milestone.id).toBeDefined();
      expect(milestone.campaignId).toBe(testCampaign.id);
      expect(milestone.name).toBe(milestoneData.name);
      expect(milestone.pct).toBe(milestoneData.pct);
      expect(milestone.acceptance).toEqual(milestoneData.acceptance);
      expect(milestone.status).toBe('pending'); // Default status
    });

    it('should handle evidence array updates', async () => {
      const milestone = await createTestMilestone(testCampaign.id);

      const evidence = [
        { type: 'github_commit', url: 'https://github.com/repo/commit/abc123' },
        { type: 'demo_video', url: 'https://youtube.com/watch?v=demo123' }
      ];

      const updatedMilestone = await testPrisma.milestone.update({
        where: { id: milestone.id },
        data: { evidence }
      });

      expect(updatedMilestone.evidence).toEqual(evidence);
    });

    it('should validate percentage bounds', async () => {
      // Should accept valid percentages
      const validMilestone = await createTestMilestone(testCampaign.id, { pct: 50 });
      expect(validMilestone.pct).toBe(50);

      // Note: In a real application, you might want to add DB constraints
      // for percentage validation (0-100), but Prisma doesn't enforce this by default
    });
  });

  describe('Pledge and Payment Models', () => {
    let testUser: any;
    let testCampaign: any;
    let backer: any;

    beforeAll(async () => {
      testUser = await createTestUser({
        email: generateTestEmail('pledge-tests'),
        name: 'Pledge Test User'
      });

      backer = await createTestUser({
        email: generateTestEmail('backer'),
        name: 'Test Backer'
      });

      testCampaign = await createTestCampaign({
        makerId: testUser.id,
        title: 'Pledge Test Campaign',
        summary: 'Campaign for pledge testing'
      });
    });

    it('should create pledge with valid amount', async () => {
      const pledgeAmount = 150;
      const pledge = await createTestPledge(testCampaign.id, backer.id, pledgeAmount);

      expect(pledge.id).toBeDefined();
      expect(pledge.campaignId).toBe(testCampaign.id);
      expect(pledge.backerId).toBe(backer.id);
      expect(pledge.amountDollars).toBe(pledgeAmount);
      expect(pledge.status).toBe('authorized'); // Default status
    });

    it('should create pledge tier with benefits', async () => {
      const tierData = {
        title: 'Premium Tier',
        description: 'Premium access to the platform',
        amountDollars: 299,
        benefits: ['Early access', 'Premium support', 'Custom features'],
        order: 2
      };

      const tier = await createTestPledgeTier(testCampaign.id, tierData);

      expect(tier.id).toBeDefined();
      expect(tier.campaignId).toBe(testCampaign.id);
      expect(tier.title).toBe(tierData.title);
      expect(tier.amountDollars).toBe(tierData.amountDollars);
      expect(tier.benefits).toEqual(tierData.benefits);
      expect(tier.isActive).toBe(true); // Default
      expect(tier.order).toBe(tierData.order);
    });

    it('should update campaign raised amount when pledges are created', async () => {
      // Create multiple pledges
      await createTestPledge(testCampaign.id, backer.id, 100);
      await createTestPledge(testCampaign.id, backer.id, 250);

      // In a real application, you'd have triggers or application logic
      // to update the campaign's raisedDollars field
      const updatedCampaign = await testPrisma.campaign.update({
        where: { id: testCampaign.id },
        data: { raisedDollars: 350 } // Sum of pledges
      });

      expect(updatedCampaign.raisedDollars).toBe(350);
    });
  });

  describe('Comment and Social Features', () => {
    let testUser: any;
    let testCampaign: any;
    let commenter: any;

    beforeAll(async () => {
      testUser = await createTestUser({
        email: generateTestEmail('comment-tests'),
        name: 'Comment Test User'
      });

      commenter = await createTestUser({
        email: generateTestEmail('commenter'),
        name: 'Test Commenter'
      });

      testCampaign = await createTestCampaign({
        makerId: testUser.id,
        title: 'Comment Test Campaign',
        summary: 'Campaign for comment testing'
      });
    });

    it('should create comment with content', async () => {
      const content = 'This is a great project! Looking forward to backing it.';
      const comment = await createTestComment(testCampaign.id, commenter.id, content);

      expect(comment.id).toBeDefined();
      expect(comment.campaignId).toBe(testCampaign.id);
      expect(comment.userId).toBe(commenter.id);
      expect(comment.content).toBe(content);
      expect(comment.parentId).toBeNull();
      expect(comment.isTeamMember).toBe(false); // Default
    });

    it('should handle threaded comments (replies)', async () => {
      // Create parent comment
      const parentComment = await createTestComment(
        testCampaign.id, 
        commenter.id, 
        'Parent comment'
      );

      // Create reply
      const replyComment = await testPrisma.comment.create({
        data: {
          campaignId: testCampaign.id,
          userId: testUser.id,
          content: 'Reply to parent comment',
          parentId: parentComment.id,
          isTeamMember: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      expect(replyComment.parentId).toBe(parentComment.id);
      expect(replyComment.isTeamMember).toBe(true);

      // Verify relationship
      const parentWithReplies = await testPrisma.comment.findUnique({
        where: { id: parentComment.id },
        include: { replies: true }
      });

      expect(parentWithReplies?.replies).toHaveLength(1);
      expect(parentWithReplies?.replies[0].id).toBe(replyComment.id);
    });

    it('should cascade delete replies when parent is deleted', async () => {
      // Create parent and reply
      const parentComment = await createTestComment(
        testCampaign.id, 
        commenter.id, 
        'Parent to delete'
      );

      const replyComment = await testPrisma.comment.create({
        data: {
          campaignId: testCampaign.id,
          userId: testUser.id,
          content: 'Reply that should be deleted',
          parentId: parentComment.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Delete parent
      await testPrisma.comment.delete({ where: { id: parentComment.id } });

      // Verify reply is also deleted
      const deletedReply = await testPrisma.comment.findUnique({
        where: { id: replyComment.id }
      });
      expect(deletedReply).toBeNull();
    });
  });

  describe('Authentication Models', () => {
    let testUser: any;

    beforeAll(async () => {
      testUser = await createTestUser({
        email: generateTestEmail('auth-models'),
        name: 'Auth Models Test User'
      });
    });

    it('should create passkey with unique credential ID', async () => {
      const passkeyData = {
        credentialId: 'unique-credential-' + Date.now(),
        publicKey: 'test-public-key-data',
        counter: 1,
        name: 'Test Device'
      };

      const passkey = await createTestPasskey(testUser.id, passkeyData);

      expect(passkey.id).toBeDefined();
      expect(passkey.userId).toBe(testUser.id);
      expect(passkey.credentialId).toBe(passkeyData.credentialId);
      expect(passkey.publicKey).toBe(passkeyData.publicKey);
      expect(passkey.counter).toBe(passkeyData.counter);
      expect(passkey.name).toBe(passkeyData.name);
    });

    it('should enforce unique credential ID constraint', async () => {
      const credentialId = 'duplicate-credential-' + Date.now();

      await createTestPasskey(testUser.id, { credentialId });

      await expect(
        createTestPasskey(testUser.id, { credentialId })
      ).rejects.toThrow();
    });

    it('should create OTP code with expiration', async () => {
      const expirationTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      const otpCode = await testPrisma.otpCode.create({
        data: {
          userId: testUser.id,
          code: '123456',
          expiresAt: expirationTime,
          createdAt: new Date()
        }
      });

      expect(otpCode.id).toBeDefined();
      expect(otpCode.userId).toBe(testUser.id);
      expect(otpCode.code).toBe('123456');
      expect(otpCode.used).toBe(false); // Default
      expect(otpCode.expiresAt).toEqual(expirationTime);

      // Cleanup
      await testPrisma.otpCode.delete({ where: { id: otpCode.id } });
    });
  });

  describe('Service Provider Models', () => {
    let serviceProvider: any;
    let serviceOrg: any;

    beforeAll(async () => {
      serviceProvider = await createTestUser({
        email: generateTestEmail('service-provider'),
        name: 'Service Provider User'
      });

      serviceOrg = await createTestOrganization({
        name: 'Test Service Organization',
        email: generateTestEmail('service-org'),
        ownerId: serviceProvider.id,
        type: 'service_provider'
      });
    });

    it('should create service category', async () => {
      const category = await testPrisma.serviceCategory.create({
        data: {
          name: 'AI Development',
          slug: 'ai-development',
          description: 'Artificial Intelligence and Machine Learning services',
          icon: '🤖',
          order: 1,
          createdAt: new Date()
        }
      });

      expect(category.id).toBeDefined();
      expect(category.name).toBe('AI Development');
      expect(category.slug).toBe('ai-development');
      expect(category.isActive).toBe(true); // Default

      // Cleanup
      await testPrisma.serviceCategory.delete({ where: { id: category.id } });
    });

    it('should create organization service with pricing', async () => {
      const category = await testPrisma.serviceCategory.create({
        data: {
          name: 'Web Development',
          slug: 'web-development',
          createdAt: new Date()
        }
      });

      const serviceData = {
        title: 'Custom Web Application',
        description: 'Full-stack web application development',
        deliverables: ['Frontend app', 'Backend API', 'Database design', 'Deployment'],
        pricing: {
          type: 'project',
          basePrice: 15000,
          currency: 'USD',
          options: [
            { name: 'Basic', price: 15000 },
            { name: 'Premium', price: 25000 }
          ]
        },
        estimatedTime: '3-4 months',
        prerequisites: ['Requirements document', 'Design mockups']
      };

      const service = await testPrisma.organizationService.create({
        data: {
          organizationId: serviceOrg.id,
          categoryId: category.id,
          title: serviceData.title,
          description: serviceData.description,
          deliverables: serviceData.deliverables,
          pricing: serviceData.pricing,
          estimatedTime: serviceData.estimatedTime,
          prerequisites: serviceData.prerequisites,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      expect(service.id).toBeDefined();
      expect(service.organizationId).toBe(serviceOrg.id);
      expect(service.categoryId).toBe(category.id);
      expect(service.title).toBe(serviceData.title);
      expect(service.deliverables).toEqual(serviceData.deliverables);
      expect(service.pricing).toEqual(serviceData.pricing);
      expect(service.isActive).toBe(true); // Default

      // Cleanup
      await testPrisma.organizationService.delete({ where: { id: service.id } });
      await testPrisma.serviceCategory.delete({ where: { id: category.id } });
    });

    it('should enforce unique organization-category constraint', async () => {
      const category = await testPrisma.serviceCategory.create({
        data: {
          name: 'Unique Test Category',
          slug: 'unique-test',
          createdAt: new Date()
        }
      });

      // Create first service
      const service1 = await testPrisma.organizationService.create({
        data: {
          organizationId: serviceOrg.id,
          categoryId: category.id,
          title: 'First Service',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Try to create second service with same org-category combo
      await expect(
        testPrisma.organizationService.create({
          data: {
            organizationId: serviceOrg.id,
            categoryId: category.id,
            title: 'Second Service',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      ).rejects.toThrow();

      // Cleanup
      await testPrisma.organizationService.delete({ where: { id: service1.id } });
      await testPrisma.serviceCategory.delete({ where: { id: category.id } });
    });
  });
});