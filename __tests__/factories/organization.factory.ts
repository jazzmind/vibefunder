import { faker } from '@faker-js/faker';
import { Organization, OrganizationType, OrganizationStatus } from '../../types/organization';

export interface OrganizationFactoryOptions {
  name?: string;
  type?: OrganizationType;
  status?: OrganizationStatus;
  ownerId?: string;
  memberCount?: number;
  verified?: boolean;
  withBranding?: boolean;
  withSettings?: boolean;
}

export class OrganizationFactory {
  static create(options: OrganizationFactoryOptions = {}): Organization {
    const {
      name = faker.company.name(),
      type = faker.helpers.enumValue(OrganizationType),
      status = OrganizationStatus.ACTIVE,
      ownerId = faker.string.uuid(),
      memberCount = faker.number.int({ min: 2, max: 50 }),
      verified = faker.datatype.boolean({ probability: 0.7 }),
      withBranding = true,
      withSettings = true
    } = options;

    const slug = faker.helpers.slugify(name).toLowerCase();

    const organization: Organization = {
      id: faker.string.uuid(),
      name,
      slug,
      description: faker.lorem.paragraphs(2),
      type,
      status,
      ownerId,
      verified,
      website: faker.internet.url(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postalCode: faker.location.zipCode(),
        country: faker.location.country()
      },
      socialLinks: {
        twitter: faker.internet.userName(),
        linkedin: faker.company.name().toLowerCase().replace(/\s+/g, ''),
        facebook: faker.internet.userName(),
        instagram: faker.internet.userName(),
        youtube: faker.internet.userName()
      },
      branding: withBranding ? {
        logo: faker.image.url({ width: 200, height: 200 }),
        coverImage: faker.image.url({ width: 1200, height: 400 }),
        primaryColor: faker.internet.color(),
        secondaryColor: faker.internet.color(),
        accentColor: faker.internet.color()
      } : null,
      settings: withSettings ? {
        publicProfile: faker.datatype.boolean({ probability: 0.8 }),
        allowMemberInvites: faker.datatype.boolean({ probability: 0.9 }),
        requireApprovalForMembers: faker.datatype.boolean({ probability: 0.3 }),
        allowExternalCampaigns: faker.datatype.boolean({ probability: 0.7 }),
        emailNotifications: {
          newCampaigns: faker.datatype.boolean({ probability: 0.9 }),
          campaignUpdates: faker.datatype.boolean({ probability: 0.8 }),
          memberActivity: faker.datatype.boolean({ probability: 0.6 }),
          systemUpdates: faker.datatype.boolean({ probability: 0.7 })
        },
        privacy: {
          showMemberList: faker.datatype.boolean({ probability: 0.6 }),
          showCampaignStats: faker.datatype.boolean({ probability: 0.8 }),
          allowMemberSearch: faker.datatype.boolean({ probability: 0.7 })
        }
      } : null,
      stats: {
        memberCount,
        activeCampaigns: faker.number.int({ min: 0, max: 20 }),
        totalCampaigns: faker.number.int({ min: memberCount, max: memberCount * 3 }),
        totalFundsRaised: faker.number.int({ min: 10000, max: 1000000 }),
        averageCampaignSuccess: faker.number.float({ min: 0.3, max: 0.9, fractionDigits: 2 })
      },
      subscription: {
        plan: faker.helpers.arrayElement(['free', 'basic', 'premium', 'enterprise']),
        status: faker.helpers.arrayElement(['active', 'trialing', 'past_due', 'canceled']),
        currentPeriodStart: faker.date.past(),
        currentPeriodEnd: faker.date.future(),
        stripeSubscriptionId: `sub_${faker.string.alphanumeric(24)}`,
        features: {
          maxCampaigns: faker.number.int({ min: 5, max: 100 }),
          maxMembers: faker.number.int({ min: 10, max: 500 }),
          customBranding: faker.datatype.boolean({ probability: 0.6 }),
          advancedAnalytics: faker.datatype.boolean({ probability: 0.4 }),
          prioritySupport: faker.datatype.boolean({ probability: 0.3 }),
          apiAccess: faker.datatype.boolean({ probability: 0.2 })
        }
      },
      createdAt: faker.date.past({ years: 2 }),
      updatedAt: faker.date.recent()
    };

    return organization;
  }

  static createMany(count: number, options: OrganizationFactoryOptions = {}): Organization[] {
    return Array.from({ length: count }, () => this.create(options));
  }

  // Specialized factory methods
  static createStartup(options: OrganizationFactoryOptions = {}): Organization {
    return this.create({
      ...options,
      type: OrganizationType.STARTUP,
      memberCount: faker.number.int({ min: 2, max: 15 }),
      verified: faker.datatype.boolean({ probability: 0.4 })
    });
  }

  static createNonProfit(options: OrganizationFactoryOptions = {}): Organization {
    return this.create({
      ...options,
      type: OrganizationType.NON_PROFIT,
      memberCount: faker.number.int({ min: 5, max: 100 }),
      verified: faker.datatype.boolean({ probability: 0.9 })
    });
  }

  static createCorporate(options: OrganizationFactoryOptions = {}): Organization {
    return this.create({
      ...options,
      type: OrganizationType.CORPORATE,
      memberCount: faker.number.int({ min: 20, max: 500 }),
      verified: true,
      withBranding: true
    });
  }

  static createEducational(options: OrganizationFactoryOptions = {}): Organization {
    return this.create({
      ...options,
      type: OrganizationType.EDUCATIONAL,
      name: `${faker.location.city()} ${faker.helpers.arrayElement(['University', 'College', 'Institute', 'School'])}`,
      memberCount: faker.number.int({ min: 10, max: 200 }),
      verified: faker.datatype.boolean({ probability: 0.8 })
    });
  }

  static createCommunity(options: OrganizationFactoryOptions = {}): Organization {
    return this.create({
      ...options,
      type: OrganizationType.COMMUNITY,
      memberCount: faker.number.int({ min: 5, max: 50 }),
      verified: faker.datatype.boolean({ probability: 0.5 })
    });
  }

  static createPendingOrganization(options: OrganizationFactoryOptions = {}): Organization {
    return this.create({
      ...options,
      status: OrganizationStatus.PENDING,
      verified: false,
      memberCount: faker.number.int({ min: 1, max: 5 })
    });
  }

  static createSuspendedOrganization(options: OrganizationFactoryOptions = {}): Organization {
    return this.create({
      ...options,
      status: OrganizationStatus.SUSPENDED,
      verified: false
    });
  }

  // Test scenario generators
  static createOrganizationHierarchy(parentOrgId?: string): {
    parent: Organization;
    subsidiaries: Organization[];
    all: Organization[];
  } {
    const parent = this.createCorporate({ ownerId: parentOrgId });
    const subsidiaries = this.createMany(3, {
      type: OrganizationType.STARTUP,
      memberCount: faker.number.int({ min: 5, max: 20 })
    });

    return {
      parent,
      subsidiaries,
      all: [parent, ...subsidiaries]
    };
  }

  static createMultiTypeOrganizations(): {
    startup: Organization;
    nonProfit: Organization;
    corporate: Organization;
    educational: Organization;
    community: Organization;
    all: Organization[];
  } {
    const startup = this.createStartup();
    const nonProfit = this.createNonProfit();
    const corporate = this.createCorporate();
    const educational = this.createEducational();
    const community = this.createCommunity();

    return {
      startup,
      nonProfit,
      corporate,
      educational,
      community,
      all: [startup, nonProfit, corporate, educational, community]
    };
  }

  static createOrganizationEcosystem(ownerUserId: string): {
    organizations: Organization[];
    memberships: OrganizationMembership[];
  } {
    // User owns 2 organizations
    const ownedOrgs = this.createMany(2, { ownerId: ownerUserId });
    
    // User is member of 3 other organizations
    const memberOrgs = this.createMany(3);
    
    const memberships: OrganizationMembership[] = [
      ...ownedOrgs.map(org => ({
        id: faker.string.uuid(),
        organizationId: org.id,
        userId: ownerUserId,
        role: 'owner' as const,
        status: 'active' as const,
        joinedAt: org.createdAt,
        permissions: ['all']
      })),
      ...memberOrgs.map(org => ({
        id: faker.string.uuid(),
        organizationId: org.id,
        userId: ownerUserId,
        role: faker.helpers.arrayElement(['member', 'admin', 'moderator']) as any,
        status: 'active' as const,
        joinedAt: faker.date.between({ from: org.createdAt, to: new Date() }),
        permissions: faker.helpers.arrayElements([
          'view_campaigns', 'create_campaigns', 'manage_campaigns', 
          'view_members', 'invite_members', 'manage_members'
        ])
      }))
    ];

    return {
      organizations: [...ownedOrgs, ...memberOrgs],
      memberships
    };
  }

  // Edge cases
  static createMinimalOrganization(options: OrganizationFactoryOptions = {}): Organization {
    return this.create({
      ...options,
      withBranding: false,
      withSettings: false,
      memberCount: 1,
      verified: false
    });
  }

  static createLargeOrganization(options: OrganizationFactoryOptions = {}): Organization {
    return this.create({
      ...options,
      type: OrganizationType.CORPORATE,
      memberCount: faker.number.int({ min: 500, max: 2000 }),
      verified: true,
      withBranding: true
    });
  }

  static createTestScenario(scenario: 'basic' | 'enterprise' | 'mixed-types' | 'edge-cases'): Organization[] {
    switch (scenario) {
      case 'basic':
        return this.createMany(5);
      
      case 'enterprise':
        return [
          this.createLargeOrganization(),
          ...this.createMany(3, { type: OrganizationType.CORPORATE }),
          this.createNonProfit()
        ];
      
      case 'mixed-types':
        return this.createMultiTypeOrganizations().all;
      
      case 'edge-cases':
        return [
          this.createMinimalOrganization(),
          this.createSuspendedOrganization(),
          this.createPendingOrganization(),
          this.createLargeOrganization()
        ];
      
      default:
        return this.createMany(5);
    }
  }
}

// Organization membership factory
export interface OrganizationMembershipFactoryOptions {
  organizationId?: string;
  userId?: string;
  role?: 'owner' | 'admin' | 'moderator' | 'member';
  status?: 'active' | 'pending' | 'suspended';
  permissions?: string[];
}

export class OrganizationMembershipFactory {
  static create(options: OrganizationMembershipFactoryOptions = {}): OrganizationMembership {
    const {
      organizationId = faker.string.uuid(),
      userId = faker.string.uuid(),
      role = faker.helpers.arrayElement(['owner', 'admin', 'moderator', 'member']),
      status = 'active',
      permissions = []
    } = options;

    const defaultPermissions = this.getDefaultPermissions(role);
    const finalPermissions = permissions.length > 0 ? permissions : defaultPermissions;

    return {
      id: faker.string.uuid(),
      organizationId,
      userId,
      role,
      status,
      permissions: finalPermissions,
      joinedAt: faker.date.past(),
      invitedBy: role !== 'owner' ? faker.string.uuid() : null,
      invitedAt: role !== 'owner' ? faker.date.past() : null,
      lastActive: faker.date.recent()
    };
  }

  static createMany(count: number, options: OrganizationMembershipFactoryOptions = {}): OrganizationMembership[] {
    return Array.from({ length: count }, () => this.create(options));
  }

  static createTeam(organizationId: string, memberCount = 10): OrganizationMembership[] {
    return [
      // One owner
      this.create({ organizationId, role: 'owner' }),
      // 1-2 admins
      ...this.createMany(faker.number.int({ min: 1, max: 2 }), {
        organizationId,
        role: 'admin'
      }),
      // 2-3 moderators
      ...this.createMany(faker.number.int({ min: 2, max: 3 }), {
        organizationId,
        role: 'moderator'
      }),
      // Remaining as members
      ...this.createMany(memberCount - 4, {
        organizationId,
        role: 'member'
      })
    ];
  }

  private static getDefaultPermissions(role: string): string[] {
    switch (role) {
      case 'owner':
        return ['all'];
      case 'admin':
        return [
          'view_campaigns', 'create_campaigns', 'manage_campaigns', 'delete_campaigns',
          'view_members', 'invite_members', 'manage_members', 'remove_members',
          'view_analytics', 'manage_settings', 'manage_billing'
        ];
      case 'moderator':
        return [
          'view_campaigns', 'create_campaigns', 'manage_campaigns',
          'view_members', 'invite_members', 'view_analytics'
        ];
      case 'member':
        return ['view_campaigns', 'create_campaigns', 'view_members'];
      default:
        return ['view_campaigns'];
    }
  }
}

// Types for organization membership
export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  status: 'active' | 'pending' | 'suspended';
  permissions: string[];
  joinedAt: Date;
  invitedBy?: string | null;
  invitedAt?: Date | null;
  lastActive?: Date;
}

// Export utility functions
export const createOrganization = OrganizationFactory.create.bind(OrganizationFactory);
export const createOrganizations = OrganizationFactory.createMany.bind(OrganizationFactory);
export const createMembership = OrganizationMembershipFactory.create.bind(OrganizationMembershipFactory);