/**
 * Test Data Factories for Integration Tests
 * 
 * Provides factory functions to create realistic test data
 * with proper relationships and constraints
 */

import { faker } from '@faker-js/faker';
import {
  createTestUser,
  createTestCampaign,
  createTestOrganization,
  createTestMilestone,
  createTestPledgeTier,
  createTestPledge,
  generateTestEmail,
  testPrisma,
} from './test-helpers';

// User factory with realistic data
export class UserFactory {
  static async create(overrides: any = {}) {
    const defaultData = {
      email: generateTestEmail(faker.internet.userName()),
      name: faker.person.fullName(),
      org: Math.random() > 0.7 ? faker.company.name() : undefined,
      roles: ['user'],
      ...overrides,
    };

    return await createTestUser(defaultData);
  }

  static async createCreator(overrides: any = {}) {
    return await this.create({
      name: faker.person.fullName() + ' (Creator)',
      org: faker.company.name(),
      roles: ['user', 'creator'],
      ...overrides,
    });
  }

  static async createAdmin(overrides: any = {}) {
    return await this.create({
      name: faker.person.fullName() + ' (Admin)',
      roles: ['user', 'admin'],
      ...overrides,
    });
  }

  static async createBacker(overrides: any = {}) {
    return await this.create({
      name: faker.person.fullName() + ' (Backer)',
      ...overrides,
    });
  }
}

// Organization factory
export class OrganizationFactory {
  static async create(ownerId?: string, overrides: any = {}) {
    let owner = null;
    if (!ownerId) {
      owner = await UserFactory.createCreator();
      ownerId = owner.id;
    }

    const organizationType = faker.helpers.arrayElement([
      'startup', 'nonprofit', 'enterprise', 'individual'
    ]);

    const defaultData = {
      name: faker.company.name(),
      email: generateTestEmail('org'),
      description: faker.company.catchPhrase() + '. ' + faker.lorem.paragraph(),
      website: faker.internet.url(),
      type: organizationType,
      ownerId,
      stripeAccountId: `acct_${Date.now()}_${faker.string.alphanumeric(10)}`,
      ...overrides,
    };

    const organization = await createTestOrganization(defaultData);
    return { organization, owner };
  }
}

// Campaign factory with realistic content
export class CampaignFactory {
  static async create(creatorId?: string, organizationId?: string, overrides: any = {}) {
    let creator = null;
    let organization = null;

    if (!creatorId) {
      creator = await UserFactory.createCreator();
      creatorId = creator.id;
    }

    if (!organizationId) {
      const orgResult = await OrganizationFactory.create(creatorId);
      organization = orgResult.organization;
      organizationId = organization.id;
    }

    const sectors = [
      'technology', 'healthcare', 'education', 'environment',
      'artificial-intelligence', 'blockchain', 'fintech', 'gaming',
      'social-impact', 'hardware', 'software', 'mobile-apps'
    ];

    const deployModes = [
      'cloud', 'on-premise', 'hybrid', 'saas', 'open-source'
    ];

    const campaignTypes = [
      {
        title: 'AI-Powered {product} Platform',
        products: ['Analytics', 'Healthcare', 'Education', 'Finance'],
        summary: 'Revolutionary AI platform that transforms {industry} with cutting-edge machine learning algorithms',
        industries: ['healthcare', 'education', 'finance', 'retail'],
      },
      {
        title: '{adjective} Mobile App for {purpose}',
        adjectives: ['Innovative', 'Smart', 'Next-Generation', 'Revolutionary'],
        purposes: ['Social Networking', 'Productivity', 'Health Tracking', 'Learning'],
        summary: 'A {adjective} mobile application designed to {benefit} users through {technology}',
        benefits: ['streamline workflows', 'improve health outcomes', 'enhance learning', 'connect communities'],
        technologies: ['AI-powered features', 'real-time synchronization', 'advanced analytics', 'blockchain integration'],
      },
      {
        title: 'Open Source {tool} for {target}',
        tools: ['Framework', 'Library', 'Tool', 'Platform'],
        targets: ['Developers', 'Researchers', 'Enterprises', 'Students'],
        summary: 'An open-source solution that empowers {target} to {capability} more efficiently',
        capabilities: ['build applications', 'analyze data', 'manage workflows', 'collaborate'],
      },
    ];

    const selectedType = faker.helpers.arrayElement(campaignTypes);
    const title = this.fillTemplate(selectedType.title, selectedType);
    const summary = this.fillTemplate(selectedType.summary, selectedType);

    const description = this.generateRealisticDescription(title, summary);

    const fundingGoals = [5000, 10000, 25000, 50000, 100000, 250000, 500000];
    const statuses = ['draft', 'published', 'pending_review'];

    const defaultData = {
      title,
      summary,
      description,
      fundingGoalDollars: faker.helpers.arrayElement(fundingGoals),
      status: faker.helpers.arrayElement(statuses),
      sectors: faker.helpers.arrayElements(sectors, { min: 1, max: 3 }),
      deployModes: faker.helpers.arrayElements(deployModes, { min: 1, max: 2 }),
      organizationId,
      endsAt: overrides.status === 'published' 
        ? new Date(Date.now() + faker.number.int({ min: 7, max: 60 }) * 24 * 60 * 60 * 1000)
        : undefined,
      ...overrides,
    };

    const campaign = await createTestCampaign(defaultData, creatorId);
    return { campaign, creator, organization };
  }

  private static fillTemplate(template: string, data: any): string {
    let result = template;
    
    const placeholders = template.match(/{(\w+)}/g);
    if (!placeholders) return result;

    placeholders.forEach(placeholder => {
      const key = placeholder.slice(1, -1); // Remove { }
      if (data[key + 's']) {
        const value = faker.helpers.arrayElement(data[key + 's']);
        result = result.replace(placeholder, value);
      }
    });

    return result;
  }

  private static generateRealisticDescription(title: string, summary: string): string {
    const sections = [
      `# ${title}`,
      '',
      `## The Problem`,
      faker.lorem.paragraph() + ' ' + faker.lorem.paragraph(),
      '',
      `## Our Solution`,
      summary + ' ' + faker.lorem.paragraph(),
      '',
      `## Key Features`,
      `- ${faker.hacker.phrase()}`,
      `- ${faker.hacker.phrase()}`,
      `- ${faker.hacker.phrase()}`,
      '',
      `## Why Now?`,
      faker.lorem.paragraph(),
      '',
      `## Team`,
      `Our team combines ${faker.number.int({ min: 10, max: 50 })} years of experience in ${faker.hacker.abbreviation()}, ${faker.hacker.abbreviation()}, and product development.`,
      '',
      `## Use of Funds`,
      `- 40% - Product Development`,
      `- 25% - Team Expansion`,
      `- 20% - Marketing & Sales`,
      `- 15% - Operations & Infrastructure`,
      '',
      `## Timeline`,
      `We plan to deliver our first milestone within ${faker.number.int({ min: 30, max: 120 })} days of reaching our funding goal.`,
    ];

    return sections.join('\n');
  }
}

// Milestone factory
export class MilestoneFactory {
  static async create(campaignId: string, overrides: any = {}) {
    const milestoneTypes = [
      {
        name: 'MVP Development Complete',
        pct: 25,
        daysFromNow: 45,
        criteria: 'Functional MVP with core features including {feature1}, {feature2}, and {feature3}',
        deliverables: [
          'Working prototype accessible via web interface',
          'API documentation for core endpoints',
          'Basic user authentication system',
          'Core functionality demonstration',
        ],
      },
      {
        name: 'Beta Testing Platform',
        pct: 50,
        daysFromNow: 90,
        criteria: 'Beta platform ready for limited user testing with {userCount} active beta testers',
        deliverables: [
          'Beta testing environment deployed',
          'User onboarding flow completed',
          'Performance benchmarks documented',
          'Initial user feedback collected',
        ],
      },
      {
        name: 'Production Release v1.0',
        pct: 100,
        daysFromNow: 120,
        criteria: 'Full production-ready platform with enterprise features and {metric} performance',
        deliverables: [
          'Production deployment with 99.9% uptime SLA',
          'Enterprise security compliance',
          'Customer support system',
          'Pricing and billing integration',
        ],
      },
    ];

    const selectedType = faker.helpers.arrayElement(milestoneTypes);
    
    const defaultData = {
      campaignId,
      name: selectedType.name,
      pct: selectedType.pct,
      dueDate: new Date(Date.now() + selectedType.daysFromNow * 24 * 60 * 60 * 1000),
      acceptance: {
        criteria: selectedType.criteria
          .replace('{feature1}', faker.hacker.noun())
          .replace('{feature2}', faker.hacker.noun())
          .replace('{feature3}', faker.hacker.noun())
          .replace('{userCount}', faker.number.int({ min: 10, max: 100 }).toString())
          .replace('{metric}', faker.helpers.arrayElement(['99.9% uptime', 'sub-second response', 'enterprise-grade'])),
        deliverables: selectedType.deliverables,
      },
      ...overrides,
    };

    return await createTestMilestone(campaignId, defaultData);
  }

  static async createMultiple(campaignId: string, count: number = 3) {
    const milestones = [];
    const percentages = [25, 50, 100];
    
    for (let i = 0; i < Math.min(count, percentages.length); i++) {
      const milestone = await this.create(campaignId, {
        pct: percentages[i],
      });
      milestones.push(milestone);
    }

    return milestones;
  }
}

// Pledge tier factory
export class PledgeTierFactory {
  static async create(campaignId: string, overrides: any = {}) {
    const tierTemplates = [
      {
        title: 'Early Bird Supporter',
        baseAmount: 25,
        description: 'Get in early and support our mission',
        benefits: [
          'Early access to beta platform',
          'Monthly progress updates',
          'Community Discord access',
          'Digital thank you certificate',
        ],
        maxBackers: 100,
      },
      {
        title: 'Professional User',
        baseAmount: 99,
        description: 'Perfect for professionals and small teams',
        benefits: [
          'All Early Bird benefits',
          '{months} months premium access',
          'Priority customer support',
          'Advanced features',
          'Custom themes',
        ],
        maxBackers: 500,
      },
      {
        title: 'Enterprise Pioneer',
        baseAmount: 499,
        description: 'For organizations ready to transform their workflow',
        benefits: [
          'All Professional benefits',
          '{months} months enterprise license',
          'Dedicated account manager',
          'Custom integrations consultation',
          'On-premise deployment option',
        ],
        maxBackers: 50,
      },
      {
        title: 'Strategic Partner',
        baseAmount: 2499,
        description: 'Partnership tier for serious backers and investors',
        benefits: [
          'All Enterprise benefits',
          'Lifetime license',
          'Product roadmap influence',
          'Co-marketing opportunities',
          'Revenue sharing agreement',
        ],
        maxBackers: 10,
      },
    ];

    const template = faker.helpers.arrayElement(tierTemplates);
    const amountMultiplier = faker.helpers.arrayElement([1, 1.2, 1.5, 2]);
    
    const defaultData = {
      campaignId,
      title: template.title,
      description: template.description,
      amountDollars: Math.floor(template.baseAmount * amountMultiplier),
      benefits: template.benefits.map(benefit => 
        benefit.replace('{months}', faker.number.int({ min: 3, max: 12 }).toString())
      ),
      maxBackers: template.maxBackers,
      ...overrides,
    };

    return await createTestPledgeTier(campaignId, defaultData);
  }

  static async createSet(campaignId: string, count: number = 4) {
    const tiers = [];
    
    for (let i = 0; i < count; i++) {
      const tier = await this.create(campaignId);
      tiers.push(tier);
    }

    // Sort by amount
    return tiers.sort((a, b) => a.amountDollars - b.amountDollars);
  }
}

// Pledge factory
export class PledgeFactory {
  static async create(campaignId: string, backerId?: string, overrides: any = {}) {
    let backer = null;
    if (!backerId) {
      backer = await UserFactory.createBacker();
      backerId = backer.id;
    }

    const amounts = [25, 50, 75, 100, 150, 250, 500, 1000, 2500];
    const statuses = ['pending', 'completed', 'cancelled', 'refunded'];
    
    const defaultData = {
      campaignId,
      backerId,
      amountDollars: faker.helpers.arrayElement(amounts),
      status: faker.helpers.arrayElement(statuses.slice(0, 2)), // Mostly pending or completed
      paymentRef: `test_payment_${Date.now()}_${faker.string.alphanumeric(8)}`,
      isAnonymous: faker.datatype.boolean({ probability: 0.1 }), // 10% anonymous
      message: Math.random() > 0.7 ? faker.lorem.sentence() : undefined,
      ...overrides,
    };

    const pledge = await createTestPledge(campaignId, backerId, defaultData);
    return { pledge, backer };
  }

  static async createMultiple(campaignId: string, count: number = 5) {
    const pledges = [];
    
    for (let i = 0; i < count; i++) {
      const { pledge } = await this.create(campaignId);
      pledges.push(pledge);
    }

    return pledges;
  }
}

// Complete campaign scenario factory
export class ScenarioFactory {
  static async createFullCampaign(overrides: any = {}) {
    // Create creator and organization
    const { organization, owner: creator } = await OrganizationFactory.create();
    
    // Create campaign
    const { campaign } = await CampaignFactory.create(creator.id, organization.id, {
      status: 'published',
      ...overrides,
    });

    // Add milestones
    const milestones = await MilestoneFactory.createMultiple(campaign.id);
    
    // Add pledge tiers
    const pledgeTiers = await PledgeTierFactory.createSet(campaign.id);
    
    // Add some pledges
    const pledges = await PledgeFactory.createMultiple(campaign.id, 3);

    return {
      creator,
      organization,
      campaign,
      milestones,
      pledgeTiers,
      pledges,
    };
  }

  static async createUserJourney() {
    // Create a new user
    const user = await UserFactory.create();
    
    // Create a published campaign for them to back
    const { campaign, pledgeTiers } = await this.createFullCampaign();
    
    // User makes a pledge
    const { pledge } = await PledgeFactory.create(campaign.id, user.id, {
      status: 'completed',
      pledgeTierId: pledgeTiers[0].id,
      amountDollars: pledgeTiers[0].amountDollars,
    });

    return {
      user,
      campaign,
      pledge,
      pledgeTier: pledgeTiers[0],
    };
  }

  static async createAdminScenario() {
    // Create admin user
    const admin = await UserFactory.createAdmin();
    
    // Create various campaigns needing admin attention
    const pendingCampaign = await CampaignFactory.create(undefined, undefined, {
      status: 'pending_review',
    });
    
    const flaggedCampaign = await CampaignFactory.create(undefined, undefined, {
      status: 'flagged',
    });
    
    // Create some regular users
    const users = [];
    for (let i = 0; i < 3; i++) {
      const user = await UserFactory.create();
      users.push(user);
    }

    return {
      admin,
      pendingCampaign: pendingCampaign.campaign,
      flaggedCampaign: flaggedCampaign.campaign,
      users,
    };
  }

  // Clean up all created test data
  static async cleanup() {
    try {
      // Delete in dependency order
      await testPrisma.pledge.deleteMany({
        where: {
          OR: [
            { paymentRef: { contains: 'test_payment' } },
            { backer: { email: { contains: '@example.com' } } },
          ],
        },
      });

      await testPrisma.pledgeTier.deleteMany({
        where: {
          campaign: {
            OR: [
              { title: { contains: 'Test' } },
              { maker: { email: { contains: '@example.com' } } },
            ],
          },
        },
      });

      await testPrisma.milestone.deleteMany({
        where: {
          campaign: {
            OR: [
              { title: { contains: 'Test' } },
              { maker: { email: { contains: '@example.com' } } },
            ],
          },
        },
      });

      await testPrisma.campaign.deleteMany({
        where: {
          OR: [
            { title: { contains: 'Test' } },
            { maker: { email: { contains: '@example.com' } } },
          ],
        },
      });

      await testPrisma.organization.deleteMany({
        where: {
          OR: [
            { email: { contains: '@example.com' } },
            { owner: { email: { contains: '@example.com' } } },
          ],
        },
      });

      await testPrisma.user.deleteMany({
        where: {
          email: { contains: '@example.com' },
        },
      });
    } catch (error) {
      console.error('Factory cleanup error:', error);
    }
  }
}

export default {
  UserFactory,
  OrganizationFactory,
  CampaignFactory,
  MilestoneFactory,
  PledgeTierFactory,
  PledgeFactory,
  ScenarioFactory,
};
