import { faker } from '@faker-js/faker';
import { UserFactory } from '../factories/user.factory';
import { CampaignFactory } from '../factories/campaign.factory';
import { PaymentFactory } from '../factories/payment.factory';
import { OrganizationFactory, OrganizationMembershipFactory } from '../factories/organization.factory';
import { PledgeTierFactory } from '../factories/pledge-tier.factory';
import { User, UserRole } from '../../types/user';
import { Campaign, CampaignStatus } from '../../types/campaign';
import { Payment, PaymentStatus } from '../../types/payment';
import { Organization } from '../../types/organization';
import { PledgeTier } from '../../types/pledgeTier';

export interface SeederOptions {
  userCount?: number;
  campaignCount?: number;
  organizationCount?: number;
  realisticRelationships?: boolean;
  includeEdgeCases?: boolean;
  includeTestScenarios?: boolean;
  preserveExisting?: boolean;
}

export interface SeededData {
  users: User[];
  campaigns: Campaign[];
  payments: Payment[];
  organizations: Organization[];
  pledgeTiers: PledgeTier[];
  memberships: any[];
  summary: {
    totalRecords: number;
    breakdown: {
      users: number;
      campaigns: number;
      payments: number;
      organizations: number;
      pledgeTiers: number;
      memberships: number;
    };
    relationships: {
      userCampaigns: number;
      campaignPayments: number;
      userPayments: number;
      organizationMembers: number;
    };
  };
}

export class DatabaseSeeder {
  private static instance: DatabaseSeeder;
  
  static getInstance(): DatabaseSeeder {
    if (!this.instance) {
      this.instance = new DatabaseSeeder();
    }
    return this.instance;
  }

  /**
   * Seeds the database with comprehensive test data
   */
  async seed(options: SeederOptions = {}): Promise<SeededData> {
    const {
      userCount = 50,
      campaignCount = 25,
      organizationCount = 8,
      realisticRelationships = true,
      includeEdgeCases = true,
      includeTestScenarios = true,
      preserveExisting = false
    } = options;

    console.log('🌱 Starting database seeding...');
    
    const seededData: SeededData = {
      users: [],
      campaigns: [],
      payments: [],
      organizations: [],
      pledgeTiers: [],
      memberships: [],
      summary: {
        totalRecords: 0,
        breakdown: { users: 0, campaigns: 0, payments: 0, organizations: 0, pledgeTiers: 0, memberships: 0 },
        relationships: { userCampaigns: 0, campaignPayments: 0, userPayments: 0, organizationMembers: 0 }
      }
    };

    try {
      // Step 1: Create Users
      console.log('👥 Creating users...');
      seededData.users = await this.seedUsers(userCount, includeEdgeCases);
      
      // Step 2: Create Organizations
      console.log('🏢 Creating organizations...');
      seededData.organizations = await this.seedOrganizations(organizationCount, seededData.users);
      
      // Step 3: Create Organization Memberships
      console.log('🤝 Creating memberships...');
      seededData.memberships = await this.seedMemberships(seededData.organizations, seededData.users);
      
      // Step 4: Create Campaigns
      console.log('🎯 Creating campaigns...');
      const campaignData = await this.seedCampaigns(campaignCount, seededData.users, includeEdgeCases);
      seededData.campaigns = campaignData.campaigns;
      seededData.pledgeTiers = campaignData.pledgeTiers;
      
      // Step 5: Create Payments (if realistic relationships enabled)
      if (realisticRelationships) {
        console.log('💳 Creating payments...');
        seededData.payments = await this.seedPayments(seededData.campaigns, seededData.users, seededData.pledgeTiers);
      }
      
      // Step 6: Add test scenarios
      if (includeTestScenarios) {
        console.log('🧪 Adding test scenarios...');
        await this.addTestScenarios(seededData);
      }
      
      // Calculate summary
      seededData.summary = this.calculateSummary(seededData);
      
      console.log('✅ Database seeding completed successfully!');
      this.printSummary(seededData.summary);
      
      return seededData;
      
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Seeds users with various roles and states
   */
  private async seedUsers(count: number, includeEdgeCases: boolean): Promise<User[]> {
    const users: User[] = [];
    
    // Create admin users (5% of total)
    const adminCount = Math.max(1, Math.floor(count * 0.05));
    users.push(...await UserFactory.createMany(adminCount, { role: UserRole.ADMIN }));
    
    // Create creator users (20% of total)
    const creatorCount = Math.floor(count * 0.2);
    users.push(...await UserFactory.createMany(creatorCount, { role: UserRole.CREATOR }));
    
    // Create regular users (remaining)
    const regularCount = count - adminCount - creatorCount;
    users.push(...await UserFactory.createMany(regularCount, { role: UserRole.USER }));
    
    // Add edge cases
    if (includeEdgeCases) {
      users.push(
        await UserFactory.createPendingUser(),
        await UserFactory.createInactiveUser(),
        await UserFactory.createUserWithLongName(),
        await UserFactory.createUserWithSpecialCharsEmail(),
        await UserFactory.createMinimalUser()
      );
    }
    
    return users;
  }

  /**
   * Seeds organizations with realistic distribution
   */
  private async seedOrganizations(count: number, users: User[]): Promise<Organization[]> {
    const organizations: Organization[] = [];
    const owners = users.filter(u => u.role === UserRole.CREATOR || u.role === UserRole.ADMIN);
    
    // Distribute organization types
    const typeDistribution = {
      startup: Math.floor(count * 0.4),
      corporate: Math.floor(count * 0.2),
      nonProfit: Math.floor(count * 0.2),
      educational: Math.floor(count * 0.1),
      community: Math.floor(count * 0.1)
    };
    
    organizations.push(...OrganizationFactory.createMany(typeDistribution.startup, { type: 'STARTUP' as any }));
    organizations.push(...OrganizationFactory.createMany(typeDistribution.corporate, { type: 'CORPORATE' as any }));
    organizations.push(...OrganizationFactory.createMany(typeDistribution.nonProfit, { type: 'NON_PROFIT' as any }));
    organizations.push(...OrganizationFactory.createMany(typeDistribution.educational, { type: 'EDUCATIONAL' as any }));
    organizations.push(...OrganizationFactory.createMany(typeDistribution.community, { type: 'COMMUNITY' as any }));
    
    // Assign owners
    organizations.forEach((org, index) => {
      if (owners[index % owners.length]) {
        org.ownerId = owners[index % owners.length].id;
      }
    });
    
    return organizations;
  }

  /**
   * Seeds organization memberships
   */
  private async seedMemberships(organizations: Organization[], users: User[]): Promise<any[]> {
    const memberships: any[] = [];
    
    for (const org of organizations) {
      // Create owner membership
      memberships.push(OrganizationMembershipFactory.create({
        organizationId: org.id,
        userId: org.ownerId,
        role: 'owner'
      }));
      
      // Add random members (3-12 per organization)
      const memberCount = faker.number.int({ min: 3, max: 12 });
      const availableUsers = users
        .filter(u => u.id !== org.ownerId)
        .sort(() => Math.random() - 0.5)
        .slice(0, memberCount);
      
      for (const user of availableUsers) {
        memberships.push(OrganizationMembershipFactory.create({
          organizationId: org.id,
          userId: user.id
        }));
      }
    }
    
    return memberships;
  }

  /**
   * Seeds campaigns with pledge tiers
   */
  private async seedCampaigns(count: number, users: User[], includeEdgeCases: boolean): Promise<{
    campaigns: Campaign[];
    pledgeTiers: PledgeTier[];
  }> {
    const campaigns: Campaign[] = [];
    const pledgeTiers: PledgeTier[] = [];
    const creators = users.filter(u => u.role === UserRole.CREATOR);
    
    // Status distribution
    const statusDistribution = {
      [CampaignStatus.ACTIVE]: Math.floor(count * 0.4),
      [CampaignStatus.FUNDED]: Math.floor(count * 0.3),
      [CampaignStatus.DRAFT]: Math.floor(count * 0.15),
      [CampaignStatus.FAILED]: Math.floor(count * 0.15)
    };
    
    // Create campaigns by status
    Object.entries(statusDistribution).forEach(([status, statusCount]) => {
      for (let i = 0; i < statusCount; i++) {
        const creator = creators[i % creators.length];
        const campaign = CampaignFactory.create({
          creatorId: creator.id,
          status: status as CampaignStatus
        });
        campaigns.push(campaign);
        
        // Create pledge tiers for each campaign
        const tierCount = faker.number.int({ min: 3, max: 6 });
        const campaignTiers = PledgeTierFactory.createTierSet(campaign.id, tierCount);
        pledgeTiers.push(...campaignTiers);
      }
    });
    
    // Add edge cases
    if (includeEdgeCases) {
      const edgeCampaigns = [
        CampaignFactory.createMinimalCampaign({ creatorId: creators[0]?.id }),
        CampaignFactory.createExpensiveCampaign({ creatorId: creators[1]?.id })
      ];
      campaigns.push(...edgeCampaigns);
      
      // Add tiers for edge campaigns
      edgeCampaigns.forEach(campaign => {
        const edgeTiers = PledgeTierFactory.createTestScenarios().edgeCases
          .map(tier => ({ ...tier, campaignId: campaign.id }));
        pledgeTiers.push(...edgeTiers);
      });
    }
    
    return { campaigns, pledgeTiers };
  }

  /**
   * Seeds payments with realistic patterns
   */
  private async seedPayments(campaigns: Campaign[], users: User[], pledgeTiers: PledgeTier[]): Promise<Payment[]> {
    const payments: Payment[] = [];
    const backers = users.filter(u => u.role === UserRole.USER || u.role === UserRole.CREATOR);
    
    // Create payments for successful and active campaigns
    const fundablesCampaigns = campaigns.filter(c => 
      c.status === CampaignStatus.FUNDED || c.status === CampaignStatus.ACTIVE
    );
    
    for (const campaign of fundablesCampaigns) {
      const campaignTiers = pledgeTiers.filter(t => t.campaignId === campaign.id);
      const paymentCount = Math.min(campaign.backerCount, faker.number.int({ min: 5, max: 20 }));
      
      for (let i = 0; i < paymentCount; i++) {
        const backer = backers[i % backers.length];
        const tier = faker.helpers.arrayElement(campaignTiers);
        
        // 90% successful payments, 10% failed
        const status = faker.datatype.boolean({ probability: 0.9 }) ? 
          PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;
        
        payments.push(PaymentFactory.create({
          userId: backer.id,
          campaignId: campaign.id,
          pledgeTierId: tier.id,
          amount: tier.amount,
          status
        }));
      }
    }
    
    // Add some refunded payments (2% of successful payments)
    const successfulPayments = payments.filter(p => p.status === PaymentStatus.SUCCEEDED);
    const refundCount = Math.max(1, Math.floor(successfulPayments.length * 0.02));
    
    for (let i = 0; i < refundCount; i++) {
      payments.push(PaymentFactory.createRefundedPayment({
        userId: successfulPayments[i].userId,
        campaignId: successfulPayments[i].campaignId
      }));
    }
    
    return payments;
  }

  /**
   * Adds specific test scenarios
   */
  private async addTestScenarios(seededData: SeededData): Promise<void> {
    // Scenario 1: High-activity user
    const superUser = await UserFactory.createCreator();
    seededData.users.push(superUser);
    
    const userCampaigns = CampaignFactory.createCampaignPortfolio(superUser.id);
    seededData.campaigns.push(...userCampaigns.all);
    
    // Add tiers for user campaigns
    userCampaigns.all.forEach(campaign => {
      const tiers = PledgeTierFactory.createTierSet(campaign.id, 4);
      seededData.pledgeTiers.push(...tiers);
    });
    
    // Scenario 2: Large organization with multiple campaigns
    const largeOrg = OrganizationFactory.createLargeOrganization({ ownerId: superUser.id });
    seededData.organizations.push(largeOrg);
    
    // Scenario 3: Failed campaign with no payments
    const failedCampaign = CampaignFactory.createFailedCampaign({ 
      creatorId: seededData.users[0].id 
    });
    seededData.campaigns.push(failedCampaign);
    
    // Scenario 4: Campaign with complex tier structure
    const complexCampaign = CampaignFactory.createSuccessfulCampaign({ 
      creatorId: seededData.users[1].id 
    });
    seededData.campaigns.push(complexCampaign);
    
    const complexTiers = PledgeTierFactory.createCampaignTierSuite(complexCampaign.id, {
      includeEarlyBird: true,
      includeLimited: true,
      tierCount: 8
    });
    seededData.pledgeTiers.push(...complexTiers);
  }

  /**
   * Creates realistic test scenarios for specific use cases
   */
  async createScenario(scenario: 'marketplace' | 'creator-dashboard' | 'admin-panel' | 'payment-flow'): Promise<SeededData> {
    console.log(`🎭 Creating ${scenario} test scenario...`);
    
    const baseData: SeededData = {
      users: [],
      campaigns: [],
      payments: [],
      organizations: [],
      pledgeTiers: [],
      memberships: [],
      summary: {
        totalRecords: 0,
        breakdown: { users: 0, campaigns: 0, payments: 0, organizations: 0, pledgeTiers: 0, memberships: 0 },
        relationships: { userCampaigns: 0, campaignPayments: 0, userPayments: 0, organizationMembers: 0 }
      }
    };

    switch (scenario) {
      case 'marketplace':
        return this.createMarketplaceScenario(baseData);
      case 'creator-dashboard':
        return this.createCreatorDashboardScenario(baseData);
      case 'admin-panel':
        return this.createAdminPanelScenario(baseData);
      case 'payment-flow':
        return this.createPaymentFlowScenario(baseData);
      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }
  }

  private async createMarketplaceScenario(baseData: SeededData): Promise<SeededData> {
    // Create diverse campaigns for browsing
    const creators = await UserFactory.createMany(5, { role: UserRole.CREATOR });
    baseData.users.push(...creators);
    
    // Featured active campaigns
    const featuredCampaigns = CampaignFactory.createMany(3, { 
      featured: true, 
      status: CampaignStatus.ACTIVE 
    });
    baseData.campaigns.push(...featuredCampaigns);
    
    // Various category campaigns
    const categoryCampaigns = [
      ...CampaignFactory.createMany(2, { category: 'TECHNOLOGY' as any }),
      ...CampaignFactory.createMany(2, { category: 'ART' as any }),
      ...CampaignFactory.createMany(2, { category: 'MUSIC' as any })
    ];
    baseData.campaigns.push(...categoryCampaigns);
    
    // Add pledge tiers
    baseData.campaigns.forEach(campaign => {
      const tiers = PledgeTierFactory.createTierSet(campaign.id);
      baseData.pledgeTiers.push(...tiers);
    });
    
    baseData.summary = this.calculateSummary(baseData);
    return baseData;
  }

  private async createCreatorDashboardScenario(baseData: SeededData): Promise<SeededData> {
    const creator = await UserFactory.createCreator();
    baseData.users.push(creator);
    
    // Creator's campaign portfolio
    const portfolio = CampaignFactory.createCampaignPortfolio(creator.id);
    baseData.campaigns.push(...portfolio.all);
    
    // Add comprehensive payment history
    const paymentHistory = PaymentFactory.createPaymentHistory(creator.id);
    baseData.payments.push(...paymentHistory);
    
    // Add pledge tiers
    portfolio.all.forEach(campaign => {
      const tiers = PledgeTierFactory.createTierSet(campaign.id);
      baseData.pledgeTiers.push(...tiers);
    });
    
    baseData.summary = this.calculateSummary(baseData);
    return baseData;
  }

  private async createAdminPanelScenario(baseData: SeededData): Promise<SeededData> {
    const admin = await UserFactory.createAdmin();
    baseData.users.push(admin);
    
    // Mix of users for management
    const mixedUsers = await UserFactory.createUserCohort(2, 5, 20);
    baseData.users.push(...mixedUsers.all);
    
    // Organizations with various states
    const orgs = OrganizationFactory.createTestScenario('mixed-types');
    baseData.organizations.push(...orgs);
    
    // Campaigns with various statuses for monitoring
    const adminCampaigns = [
      ...CampaignFactory.createMany(5, { status: CampaignStatus.ACTIVE }),
      ...CampaignFactory.createMany(3, { status: CampaignStatus.PENDING_REVIEW as any }),
      ...CampaignFactory.createMany(2, { status: CampaignStatus.SUSPENDED as any })
    ];
    baseData.campaigns.push(...adminCampaigns);
    
    baseData.summary = this.calculateSummary(baseData);
    return baseData;
  }

  private async createPaymentFlowScenario(baseData: SeededData): Promise<SeededData> {
    const users = await UserFactory.createMany(10);
    baseData.users.push(...users);
    
    const campaign = CampaignFactory.createActiveCampaign({ 
      creatorId: users[0].id 
    });
    baseData.campaigns.push(campaign);
    
    const tiers = PledgeTierFactory.createTierSet(campaign.id);
    baseData.pledgeTiers.push(...tiers);
    
    // Comprehensive payment scenarios
    const paymentScenarios = PaymentFactory.createStripeTestScenario();
    baseData.payments.push(...paymentScenarios.all);
    
    baseData.summary = this.calculateSummary(baseData);
    return baseData;
  }

  /**
   * Calculates summary statistics
   */
  private calculateSummary(data: SeededData): SeededData['summary'] {
    const breakdown = {
      users: data.users.length,
      campaigns: data.campaigns.length,
      payments: data.payments.length,
      organizations: data.organizations.length,
      pledgeTiers: data.pledgeTiers.length,
      memberships: data.memberships.length
    };

    const relationships = {
      userCampaigns: data.campaigns.filter(c => 
        data.users.some(u => u.id === c.creatorId)
      ).length,
      campaignPayments: data.payments.filter(p => 
        data.campaigns.some(c => c.id === p.campaignId)
      ).length,
      userPayments: data.payments.filter(p => 
        data.users.some(u => u.id === p.userId)
      ).length,
      organizationMembers: data.memberships.length
    };

    return {
      totalRecords: Object.values(breakdown).reduce((sum, count) => sum + count, 0),
      breakdown,
      relationships
    };
  }

  /**
   * Prints seeding summary
   */
  private printSummary(summary: SeededData['summary']): void {
    console.log('\n📊 Seeding Summary:');
    console.log('===================');
    console.log(`Total Records: ${summary.totalRecords}`);
    console.log('\nBreakdown:');
    Object.entries(summary.breakdown).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('\nRelationships:');
    Object.entries(summary.relationships).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('===================\n');
  }
}

// Export singleton instance and utility functions
export const databaseSeeder = DatabaseSeeder.getInstance();
export const seedDatabase = databaseSeeder.seed.bind(databaseSeeder);
export const createScenario = databaseSeeder.createScenario.bind(databaseSeeder);

// Pre-configured seeding functions
export const seedMinimalData = () => seedDatabase({
  userCount: 10,
  campaignCount: 5,
  organizationCount: 2,
  realisticRelationships: true,
  includeEdgeCases: false
});

export const seedDevelopmentData = () => seedDatabase({
  userCount: 25,
  campaignCount: 15,
  organizationCount: 5,
  realisticRelationships: true,
  includeEdgeCases: true,
  includeTestScenarios: true
});

export const seedProductionLikeData = () => seedDatabase({
  userCount: 100,
  campaignCount: 50,
  organizationCount: 15,
  realisticRelationships: true,
  includeEdgeCases: true,
  includeTestScenarios: true
});