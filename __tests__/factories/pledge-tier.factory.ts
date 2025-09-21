import { faker } from '@faker-js/faker';
import { PledgeTier, RewardType, ShippingInfo } from '../../types/pledgeTier';

export interface PledgeTierFactoryOptions {
  campaignId?: string;
  title?: string;
  amount?: number;
  currency?: string;
  description?: string;
  estimatedDelivery?: Date;
  shippingIncluded?: boolean;
  limitedQuantity?: boolean;
  maxQuantity?: number | null;
  backerCount?: number;
  isActive?: boolean;
  order?: number;
  rewardTypes?: RewardType[];
  digitalRewards?: string[];
  physicalRewards?: string[];
  earlyBird?: boolean;
  earlyBirdDiscount?: number;
}

export class PledgeTierFactory {
  static create(options: PledgeTierFactoryOptions = {}): PledgeTier {
    const {
      campaignId = faker.string.uuid(),
      title = faker.commerce.productName(),
      amount = faker.number.int({ min: 25, max: 500 }),
      currency = 'USD',
      description = faker.lorem.paragraph(),
      estimatedDelivery = faker.date.future(),
      shippingIncluded = faker.datatype.boolean({ probability: 0.6 }),
      limitedQuantity = faker.datatype.boolean({ probability: 0.3 }),
      maxQuantity = limitedQuantity ? faker.number.int({ min: 10, max: 500 }) : null,
      backerCount = faker.number.int({ min: 0, max: maxQuantity || 100 }),
      isActive = true,
      order = faker.number.int({ min: 1, max: 10 }),
      rewardTypes = [],
      digitalRewards = [],
      physicalRewards = [],
      earlyBird = faker.datatype.boolean({ probability: 0.2 }),
      earlyBirdDiscount = earlyBird ? faker.number.int({ min: 10, max: 30 }) : 0
    } = options;

    // Generate rewards if not provided
    const finalRewardTypes = rewardTypes.length > 0 ? rewardTypes : 
      faker.helpers.arrayElements([RewardType.DIGITAL, RewardType.PHYSICAL], { min: 1, max: 2 });

    const finalDigitalRewards = digitalRewards.length > 0 ? digitalRewards :
      finalRewardTypes.includes(RewardType.DIGITAL) ? 
        Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => 
          faker.helpers.arrayElement([
            'Digital Download',
            'Exclusive Content Access',
            'Behind-the-scenes Video',
            'Digital Art Print',
            'E-book',
            'Software License',
            'Online Course Access',
            'Digital Wallpapers',
            'Exclusive Podcast Episode',
            'Virtual Meet & Greet'
          ])
        ) : [];

    const finalPhysicalRewards = physicalRewards.length > 0 ? physicalRewards :
      finalRewardTypes.includes(RewardType.PHYSICAL) ? 
        Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => 
          faker.helpers.arrayElement([
            'T-Shirt',
            'Sticker Pack',
            'Poster',
            'Mug',
            'Tote Bag',
            'Pin Badge',
            'Keychain',
            'Notebook',
            'Art Print',
            'Signed Copy',
            'Limited Edition Item',
            'Product Sample'
          ])
        ) : [];

    // Generate shipping info for physical rewards
    const shippingInfo: ShippingInfo | null = finalRewardTypes.includes(RewardType.PHYSICAL) ? {
      domesticShipping: faker.number.int({ min: 5, max: 15 }),
      internationalShipping: faker.number.int({ min: 15, max: 50 }),
      estimatedWeight: faker.number.float({ min: 0.1, max: 2.0, fractionDigits: 2 }),
      dimensions: {
        length: faker.number.float({ min: 5, max: 30, fractionDigits: 1 }),
        width: faker.number.float({ min: 5, max: 20, fractionDigits: 1 }),
        height: faker.number.float({ min: 1, max: 10, fractionDigits: 1 })
      },
      restrictedCountries: faker.datatype.boolean({ probability: 0.2 }) ? 
        faker.helpers.arrayElements(['CN', 'RU', 'IR', 'KP'], { min: 1, max: 3 }) : [],
      handlingTime: faker.number.int({ min: 1, max: 14 })
    } : null;

    const pledgeTier: PledgeTier = {
      id: faker.string.uuid(),
      campaignId,
      title,
      description,
      amount,
      currency,
      originalAmount: earlyBird ? amount + Math.round(amount * earlyBirdDiscount / 100) : amount,
      estimatedDelivery,
      shippingIncluded,
      shippingInfo,
      limitedQuantity,
      maxQuantity,
      backerCount,
      availableQuantity: maxQuantity ? Math.max(0, maxQuantity - backerCount) : null,
      rewardTypes: finalRewardTypes,
      digitalRewards: finalDigitalRewards,
      physicalRewards: finalPhysicalRewards,
      rewardDetails: {
        digitalDeliveryMethod: finalDigitalRewards.length > 0 ? 
          faker.helpers.arrayElement(['email', 'download_link', 'platform_access']) : null,
        physicalFulfillmentPartner: finalPhysicalRewards.length > 0 ? 
          faker.company.name() : null,
        qualityAssuranceProcess: finalPhysicalRewards.length > 0 ? 
          faker.lorem.sentence() : null
      },
      isActive,
      isEarlyBird: earlyBird,
      earlyBirdDiscount: earlyBirdDiscount,
      earlyBirdExpiry: earlyBird ? faker.date.future() : null,
      order,
      visibility: faker.helpers.arrayElement(['public', 'backers_only', 'hidden']),
      restrictions: {
        minAge: faker.datatype.boolean({ probability: 0.1 }) ? 
          faker.number.int({ min: 13, max: 21 }) : null,
        geographicRestrictions: faker.datatype.boolean({ probability: 0.1 }) ? 
          faker.helpers.arrayElements(['US', 'CA', 'UK', 'EU'], { min: 1, max: 3 }) : [],
        maxPerBacker: faker.datatype.boolean({ probability: 0.3 }) ? 
          faker.number.int({ min: 1, max: 5 }) : null
      },
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent()
    };

    return pledgeTier;
  }

  static createMany(count: number, options: PledgeTierFactoryOptions = {}): PledgeTier[] {
    return Array.from({ length: count }, (_, index) => 
      this.create({ 
        ...options, 
        order: options.order || index + 1 
      })
    );
  }

  // Specialized factory methods
  static createTierSet(campaignId: string, tierCount = 4): PledgeTier[] {
    const baseTiers = [
      {
        title: 'Early Supporter',
        amount: 25,
        rewardTypes: [RewardType.DIGITAL],
        digitalRewards: ['Digital Thank You', 'Project Updates'],
        earlyBird: true
      },
      {
        title: 'Basic Backer',
        amount: 50,
        rewardTypes: [RewardType.DIGITAL, RewardType.PHYSICAL],
        digitalRewards: ['Digital Content Pack'],
        physicalRewards: ['Sticker Pack']
      },
      {
        title: 'Premium Supporter',
        amount: 100,
        rewardTypes: [RewardType.DIGITAL, RewardType.PHYSICAL],
        digitalRewards: ['Exclusive Content', 'Behind-the-scenes Access'],
        physicalRewards: ['T-Shirt', 'Poster']
      },
      {
        title: 'Super Backer',
        amount: 250,
        rewardTypes: [RewardType.DIGITAL, RewardType.PHYSICAL],
        digitalRewards: ['All Digital Content', 'Video Call Access'],
        physicalRewards: ['Complete Merchandise Pack', 'Signed Item'],
        limitedQuantity: true,
        maxQuantity: 50
      }
    ];

    return baseTiers.slice(0, tierCount).map((tierOptions, index) => 
      this.create({
        campaignId,
        order: index + 1,
        ...tierOptions
      })
    );
  }

  static createDigitalOnlyTier(options: PledgeTierFactoryOptions = {}): PledgeTier {
    return this.create({
      ...options,
      rewardTypes: [RewardType.DIGITAL],
      digitalRewards: [
        'Digital Download Package',
        'Exclusive Content Access',
        'Behind-the-scenes Material'
      ],
      physicalRewards: [],
      shippingIncluded: false,
      amount: faker.number.int({ min: 15, max: 75 })
    });
  }

  static createPhysicalTier(options: PledgeTierFactoryOptions = {}): PledgeTier {
    return this.create({
      ...options,
      rewardTypes: [RewardType.PHYSICAL],
      physicalRewards: [
        faker.helpers.arrayElement(['T-Shirt', 'Hoodie', 'Mug', 'Poster']),
        'Sticker Pack'
      ],
      digitalRewards: [],
      shippingIncluded: true,
      amount: faker.number.int({ min: 35, max: 150 })
    });
  }

  static createLimitedTier(options: PledgeTierFactoryOptions = {}): PledgeTier {
    const maxQuantity = faker.number.int({ min: 10, max: 100 });
    return this.create({
      ...options,
      limitedQuantity: true,
      maxQuantity,
      backerCount: faker.number.int({ min: 0, max: maxQuantity }),
      amount: faker.number.int({ min: 100, max: 1000 }),
      title: `Limited Edition ${faker.commerce.productName()}`,
      physicalRewards: ['Limited Edition Item', 'Certificate of Authenticity']
    });
  }

  static createEarlyBirdTier(options: PledgeTierFactoryOptions = {}): PledgeTier {
    const originalAmount = faker.number.int({ min: 75, max: 200 });
    const discount = faker.number.int({ min: 15, max: 40 });
    
    return this.create({
      ...options,
      earlyBird: true,
      earlyBirdDiscount: discount,
      amount: originalAmount - Math.round(originalAmount * discount / 100),
      originalAmount,
      earlyBirdExpiry: faker.date.future({ days: 30 }),
      limitedQuantity: true,
      maxQuantity: faker.number.int({ min: 25, max: 100 }),
      title: `Early Bird ${faker.commerce.productName()}`
    });
  }

  static createPremiumTier(options: PledgeTierFactoryOptions = {}): PledgeTier {
    return this.create({
      ...options,
      amount: faker.number.int({ min: 500, max: 2500 }),
      rewardTypes: [RewardType.DIGITAL, RewardType.PHYSICAL],
      digitalRewards: [
        'Complete Digital Collection',
        'Exclusive Video Content',
        'Personal Thank You Message',
        'Credit in Project'
      ],
      physicalRewards: [
        'Premium Merchandise Bundle',
        'Signed Limited Edition',
        'Personalized Item'
      ],
      limitedQuantity: true,
      maxQuantity: faker.number.int({ min: 5, max: 25 }),
      title: `Premium ${faker.commerce.productName()} Package`
    });
  }

  // Test scenario generators
  static createTierProgression(campaignId: string): {
    early: PledgeTier;
    basic: PledgeTier;
    standard: PledgeTier;
    premium: PledgeTier;
    limited: PledgeTier;
    all: PledgeTier[];
  } {
    const early = this.createEarlyBirdTier({ campaignId, order: 1 });
    const basic = this.createDigitalOnlyTier({ campaignId, order: 2 });
    const standard = this.create({ 
      campaignId, 
      order: 3,
      amount: 100,
      rewardTypes: [RewardType.DIGITAL, RewardType.PHYSICAL]
    });
    const premium = this.createPremiumTier({ campaignId, order: 4 });
    const limited = this.createLimitedTier({ campaignId, order: 5 });

    return {
      early,
      basic,
      standard,
      premium,
      limited,
      all: [early, basic, standard, premium, limited]
    };
  }

  // Edge cases and special scenarios
  static createMinimumTier(options: PledgeTierFactoryOptions = {}): PledgeTier {
    return this.create({
      ...options,
      amount: 1,
      title: 'Minimum Pledge',
      description: 'Thank you for your support!',
      digitalRewards: ['Thank You Message'],
      physicalRewards: [],
      shippingIncluded: false
    });
  }

  static createMaximumTier(options: PledgeTierFactoryOptions = {}): PledgeTier {
    return this.create({
      ...options,
      amount: 10000,
      title: 'Ultimate Supporter',
      description: 'The ultimate package with everything included!',
      digitalRewards: [
        'Complete Digital Archive',
        'Exclusive Access to Everything',
        'Personal Video Message',
        'Credit as Executive Producer'
      ],
      physicalRewards: [
        'Complete Physical Collection',
        'Signed Memorabilia',
        'Custom Created Item',
        'VIP Experience'
      ],
      limitedQuantity: true,
      maxQuantity: 1
    });
  }

  static createInternationalRestrictedTier(options: PledgeTierFactoryOptions = {}): PledgeTier {
    return this.create({
      ...options,
      physicalRewards: ['Restricted Item', 'Special Product'],
      shippingInfo: {
        domesticShipping: 10,
        internationalShipping: 0, // No international shipping
        estimatedWeight: 1.0,
        dimensions: { length: 20, width: 15, height: 5 },
        restrictedCountries: ['*'], // All countries except domestic
        handlingTime: 5
      },
      restrictions: {
        geographicRestrictions: ['US'], // US only
        minAge: null,
        maxPerBacker: null
      }
    });
  }

  static createTestScenarios(): {
    basic: PledgeTier[];
    comprehensive: PledgeTier[];
    edgeCases: PledgeTier[];
    realistic: PledgeTier[];
  } {
    const campaignId = faker.string.uuid();
    
    return {
      basic: this.createMany(3, { campaignId }),
      comprehensive: this.createTierProgression(campaignId).all,
      edgeCases: [
        this.createMinimumTier({ campaignId }),
        this.createMaximumTier({ campaignId }),
        this.createInternationalRestrictedTier({ campaignId })
      ],
      realistic: this.createTierSet(campaignId, 5)
    };
  }

  // Bulk creation with relationships
  static createCampaignTierSuite(campaignId: string, options: {
    includeEarlyBird?: boolean;
    includeLimited?: boolean;
    includeDigitalOnly?: boolean;
    includePhysicalOnly?: boolean;
    tierCount?: number;
  } = {}): PledgeTier[] {
    const {
      includeEarlyBird = true,
      includeLimited = true,
      includeDigitalOnly = true,
      includePhysicalOnly = true,
      tierCount = 6
    } = options;

    const tiers: PledgeTier[] = [];
    let order = 1;

    if (includeEarlyBird) {
      tiers.push(this.createEarlyBirdTier({ campaignId, order: order++ }));
    }

    if (includeDigitalOnly) {
      tiers.push(this.createDigitalOnlyTier({ campaignId, order: order++ }));
    }

    // Standard tiers
    const standardCount = tierCount - tiers.length - (includeLimited ? 1 : 0) - (includePhysicalOnly ? 1 : 0);
    for (let i = 0; i < standardCount; i++) {
      tiers.push(this.create({ 
        campaignId, 
        order: order++,
        amount: 50 + (i * 50)
      }));
    }

    if (includePhysicalOnly) {
      tiers.push(this.createPhysicalTier({ campaignId, order: order++ }));
    }

    if (includeLimited) {
      tiers.push(this.createLimitedTier({ campaignId, order: order++ }));
    }

    return tiers;
  }
}

// Export utility functions
export const createPledgeTier = PledgeTierFactory.create.bind(PledgeTierFactory);
export const createPledgeTiers = PledgeTierFactory.createMany.bind(PledgeTierFactory);
export const createTierSet = PledgeTierFactory.createTierSet.bind(PledgeTierFactory);
export const createEarlyBirdTier = PledgeTierFactory.createEarlyBirdTier.bind(PledgeTierFactory);
export const createLimitedTier = PledgeTierFactory.createLimitedTier.bind(PledgeTierFactory);