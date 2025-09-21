import { faker } from '@faker-js/faker';
import { Campaign, CampaignStatus, CampaignCategory } from '../../types/campaign';
import { PledgeTier } from '../../types/pledgeTier';

export interface CampaignFactoryOptions {
  creatorId?: string;
  status?: CampaignStatus;
  category?: CampaignCategory;
  fundingGoal?: number;
  currentFunding?: number;
  backerCount?: number;
  daysToGo?: number;
  withTiers?: boolean;
  tierCount?: number;
  featured?: boolean;
  withImages?: boolean;
  withVideo?: boolean;
}

export class CampaignFactory {
  static create(options: CampaignFactoryOptions = {}): Campaign {
    const {
      creatorId = faker.string.uuid(),
      status = CampaignStatus.ACTIVE,
      category = faker.helpers.enumValue(CampaignCategory),
      fundingGoal = faker.number.int({ min: 5000, max: 100000 }),
      currentFunding,
      backerCount = faker.number.int({ min: 0, max: 500 }),
      daysToGo = faker.number.int({ min: 1, max: 60 }),
      withTiers = true,
      tierCount = 4,
      featured = faker.datatype.boolean({ probability: 0.2 }),
      withImages = true,
      withVideo = faker.datatype.boolean({ probability: 0.7 })
    } = options;

    const title = faker.commerce.productName();
    const slug = faker.helpers.slugify(title).toLowerCase();
    
    // Calculate current funding if not provided
    let calculatedCurrentFunding = currentFunding;
    if (calculatedCurrentFunding === undefined) {
      switch (status) {
        case CampaignStatus.FUNDED:
          calculatedCurrentFunding = faker.number.int({ 
            min: fundingGoal, 
            max: fundingGoal * 2 
          });
          break;
        case CampaignStatus.FAILED:
          calculatedCurrentFunding = faker.number.int({ 
            min: 0, 
            max: fundingGoal * 0.8 
          });
          break;
        case CampaignStatus.ACTIVE:
          calculatedCurrentFunding = faker.number.int({ 
            min: 0, 
            max: fundingGoal * 1.5 
          });
          break;
        default:
          calculatedCurrentFunding = faker.number.int({ 
            min: 0, 
            max: fundingGoal * 0.5 
          });
      }
    }

    const createdAt = faker.date.past({ years: 1 });
    const launchDate = faker.date.between({ 
      from: createdAt, 
      to: new Date() 
    });
    const endDate = new Date(launchDate);
    endDate.setDate(endDate.getDate() + daysToGo);

    const campaign: Campaign = {
      id: faker.string.uuid(),
      title,
      slug,
      description: faker.lorem.paragraphs(3),
      shortDescription: faker.lorem.sentence(),
      story: faker.lorem.paragraphs(5),
      category,
      tags: faker.helpers.arrayElements([
        'tech', 'art', 'music', 'games', 'film', 'design', 'food', 'fashion',
        'publishing', 'crafts', 'dance', 'theater', 'comics', 'photography'
      ], { min: 2, max: 5 }),
      creatorId,
      fundingGoal,
      currentFunding: calculatedCurrentFunding,
      backerCount,
      status,
      featured,
      launchDate,
      endDate,
      createdAt,
      updatedAt: faker.date.recent(),
      media: {
        heroImage: withImages ? faker.image.url({ width: 1200, height: 600 }) : null,
        gallery: withImages ? Array.from({ length: faker.number.int({ min: 3, max: 8 }) }, () => ({
          id: faker.string.uuid(),
          url: faker.image.url({ width: 800, height: 600 }),
          caption: faker.lorem.sentence(),
          type: 'image' as const
        })) : [],
        video: withVideo ? {
          id: faker.string.uuid(),
          url: faker.internet.url(),
          thumbnail: faker.image.url({ width: 640, height: 360 }),
          duration: faker.number.int({ min: 60, max: 600 }),
          type: 'video' as const
        } : null
      },
      location: {
        city: faker.location.city(),
        country: faker.location.country(),
        coordinates: {
          lat: faker.location.latitude(),
          lng: faker.location.longitude()
        }
      },
      risks: faker.lorem.paragraph(),
      timeline: Array.from({ length: faker.number.int({ min: 3, max: 6 }) }, () => ({
        id: faker.string.uuid(),
        title: faker.lorem.words(3),
        description: faker.lorem.sentence(),
        date: faker.date.future(),
        completed: faker.datatype.boolean({ probability: 0.3 })
      })),
      faqs: Array.from({ length: faker.number.int({ min: 3, max: 8 }) }, () => ({
        id: faker.string.uuid(),
        question: faker.lorem.sentence() + '?',
        answer: faker.lorem.paragraph(),
        order: faker.number.int({ min: 1, max: 10 })
      })),
      pledgeTiers: withTiers ? this.createPledgeTiers(tierCount) : [],
      analytics: {
        views: faker.number.int({ min: 100, max: 10000 }),
        uniqueVisitors: faker.number.int({ min: 50, max: 5000 }),
        conversionRate: faker.number.float({ min: 0.01, max: 0.15, fractionDigits: 3 }),
        averagePledge: calculatedCurrentFunding > 0 ? 
          Math.round(calculatedCurrentFunding / Math.max(backerCount, 1)) : 0,
        topReferrers: [
          { source: 'direct', count: faker.number.int({ min: 10, max: 100 }) },
          { source: 'social', count: faker.number.int({ min: 5, max: 50 }) },
          { source: 'email', count: faker.number.int({ min: 3, max: 30 }) }
        ]
      }
    };

    return campaign;
  }

  static createMany(count: number, options: CampaignFactoryOptions = {}): Campaign[] {
    return Array.from({ length: count }, () => this.create(options));
  }

  private static createPledgeTiers(count: number): PledgeTier[] {
    return Array.from({ length: count }, (_, index) => {
      const baseAmount = (index + 1) * 25;
      const amount = faker.number.int({ min: baseAmount, max: baseAmount * 2 });
      
      return {
        id: faker.string.uuid(),
        title: faker.commerce.productName(),
        description: faker.lorem.paragraph(),
        amount,
        currency: 'USD',
        estimatedDelivery: faker.date.future(),
        shippingIncluded: faker.datatype.boolean(),
        limitedQuantity: faker.datatype.boolean({ probability: 0.3 }),
        maxQuantity: faker.datatype.boolean({ probability: 0.3 }) ? 
          faker.number.int({ min: 10, max: 500 }) : null,
        backerCount: faker.number.int({ min: 0, max: 50 }),
        rewards: Array.from({ 
          length: faker.number.int({ min: 1, max: 4 }) 
        }, () => faker.commerce.productName()),
        digitalRewards: faker.datatype.boolean({ probability: 0.6 }) ? 
          Array.from({ 
            length: faker.number.int({ min: 1, max: 3 }) 
          }, () => faker.lorem.words(3)) : [],
        physicalRewards: faker.datatype.boolean({ probability: 0.8 }) ? 
          Array.from({ 
            length: faker.number.int({ min: 1, max: 3 }) 
          }, () => faker.commerce.productName()) : [],
        order: index + 1,
        isActive: true,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent()
      };
    });
  }

  // Specialized factory methods
  static createSuccessfulCampaign(options: CampaignFactoryOptions = {}): Campaign {
    const fundingGoal = faker.number.int({ min: 10000, max: 50000 });
    return this.create({
      ...options,
      status: CampaignStatus.FUNDED,
      fundingGoal,
      currentFunding: faker.number.int({ 
        min: fundingGoal, 
        max: fundingGoal * 2 
      }),
      backerCount: faker.number.int({ min: 50, max: 500 }),
      featured: true
    });
  }

  static createFailedCampaign(options: CampaignFactoryOptions = {}): Campaign {
    const fundingGoal = faker.number.int({ min: 10000, max: 50000 });
    return this.create({
      ...options,
      status: CampaignStatus.FAILED,
      fundingGoal,
      currentFunding: faker.number.int({ 
        min: 0, 
        max: Math.floor(fundingGoal * 0.8) 
      }),
      backerCount: faker.number.int({ min: 0, max: 20 }),
      daysToGo: 0
    });
  }

  static createActiveCampaign(options: CampaignFactoryOptions = {}): Campaign {
    return this.create({
      ...options,
      status: CampaignStatus.ACTIVE,
      daysToGo: faker.number.int({ min: 5, max: 45 })
    });
  }

  static createDraftCampaign(options: CampaignFactoryOptions = {}): Campaign {
    return this.create({
      ...options,
      status: CampaignStatus.DRAFT,
      currentFunding: 0,
      backerCount: 0
    });
  }

  static createFeaturedCampaign(options: CampaignFactoryOptions = {}): Campaign {
    return this.create({
      ...options,
      featured: true,
      status: CampaignStatus.ACTIVE,
      withImages: true,
      withVideo: true
    });
  }

  // Edge cases
  static createMinimalCampaign(options: CampaignFactoryOptions = {}): Campaign {
    return this.create({
      ...options,
      withTiers: false,
      withImages: false,
      withVideo: false,
      currentFunding: 0,
      backerCount: 0
    });
  }

  static createExpensiveCampaign(options: CampaignFactoryOptions = {}): Campaign {
    return this.create({
      ...options,
      fundingGoal: faker.number.int({ min: 500000, max: 1000000 }),
      tierCount: 8
    });
  }

  // Batch creation helpers
  static createCampaignPortfolio(creatorId: string): {
    active: Campaign[];
    funded: Campaign[];
    failed: Campaign[];
    draft: Campaign[];
    all: Campaign[];
  } {
    const active = this.createMany(2, { 
      creatorId, 
      status: CampaignStatus.ACTIVE 
    });
    const funded = this.createMany(3, { 
      creatorId, 
      status: CampaignStatus.FUNDED 
    });
    const failed = this.createMany(1, { 
      creatorId, 
      status: CampaignStatus.FAILED 
    });
    const draft = this.createMany(2, { 
      creatorId, 
      status: CampaignStatus.DRAFT 
    });

    return {
      active,
      funded,
      failed,
      draft,
      all: [...active, ...funded, ...failed, ...draft]
    };
  }

  static createTestScenario(scenario: 'marketplace' | 'creator-dashboard' | 'edge-cases'): Campaign[] {
    switch (scenario) {
      case 'marketplace':
        return [
          ...this.createMany(5, { status: CampaignStatus.ACTIVE }),
          ...this.createMany(3, { status: CampaignStatus.FUNDED }),
          ...this.createMany(2, { featured: true })
        ];
      
      case 'creator-dashboard':
        const creatorId = faker.string.uuid();
        return this.createCampaignPortfolio(creatorId).all;
      
      case 'edge-cases':
        return [
          this.createMinimalCampaign(),
          this.createExpensiveCampaign(),
          this.createFailedCampaign()
        ];
      
      default:
        return this.createMany(5);
    }
  }
}

// Export utility functions
export const createCampaign = CampaignFactory.create.bind(CampaignFactory);
export const createCampaigns = CampaignFactory.createMany.bind(CampaignFactory);
export const createSuccessfulCampaign = CampaignFactory.createSuccessfulCampaign.bind(CampaignFactory);
export const createFailedCampaign = CampaignFactory.createFailedCampaign.bind(CampaignFactory);