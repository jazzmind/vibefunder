/**
 * CampaignGenerationService Unit Tests
 * 
 * Focused unit tests for business logic without complex mocking
 */

import { z } from 'zod';

describe('CampaignGenerationService Schema Validation', () => {
  const CampaignGenerationInputSchema = z.object({
    repository: z.object({
      name: z.string(),
      full_name: z.string(),
      description: z.string().nullable(),
      html_url: z.string(),
      language: z.string().nullable(),
      topics: z.array(z.string()).default([])
    }),
    readmeContent: z.string().nullable(),
    docsContent: z.array(z.string()).default([]),
    userPrompt: z.string().default('')
  });

  const GeneratedCampaignSchema = z.object({
    title: z.string().min(1).max(200),
    summary: z.string().min(50).max(500),
    description: z.string().min(200),
    fundingGoalDollars: z.number().min(1000).max(10000000),
    sectors: z.array(z.string()).min(1).max(5),
    deployModes: z.array(z.string()).max(3),
    tags: z.array(z.string()).min(2).max(10),
    milestones: z.array(z.object({
      name: z.string().min(1).max(200),
      pct: z.number().min(5).max(100),
      dueDate: z.string().nullable(),
      acceptance: z.object({
        criteria: z.string().min(10),
        deliverables: z.array(z.string())
      })
    })).min(2).max(6),
    pledgeTiers: z.array(z.object({
      title: z.string().min(1).max(100),
      description: z.string().min(10).max(500),
      amountDollars: z.number().min(1),
      order: z.number().min(1),
      estimatedDelivery: z.string()
    })).min(2).max(8)
  });

  describe('input validation', () => {
    const validInput = {
      repository: {
        name: 'test-repo',
        full_name: 'user/test-repo',
        description: 'A test repository',
        html_url: 'https://github.com/user/test-repo',
        language: 'TypeScript',
        topics: ['testing', 'javascript']
      },
      readmeContent: '# Test Repo\nA testing repository',
      docsContent: ['Documentation content'],
      userPrompt: 'Create a campaign for developers'
    };

    it('should validate complete valid input', () => {
      const result = CampaignGenerationInputSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should validate minimal valid input', () => {
      const minimalInput = {
        repository: {
          name: 'test-repo',
          full_name: 'user/test-repo',
          description: null,
          html_url: 'https://github.com/user/test-repo',
          language: null,
          topics: []
        },
        readmeContent: null,
        docsContent: [],
        userPrompt: ''
      };

      const result = CampaignGenerationInputSchema.parse(minimalInput);
      expect(result).toEqual(minimalInput);
    });

    it('should apply default values', () => {
      const inputWithoutDefaults = {
        repository: {
          name: 'test-repo',
          full_name: 'user/test-repo',
          description: null,
          html_url: 'https://github.com/user/test-repo',
          language: null
          // topics missing
        },
        readmeContent: null
        // docsContent and userPrompt missing
      };

      const result = CampaignGenerationInputSchema.parse(inputWithoutDefaults);
      expect(result.repository.topics).toEqual([]);
      expect(result.docsContent).toEqual([]);
      expect(result.userPrompt).toEqual('');
    });

    it('should reject invalid repository data', () => {
      const invalidInput = {
        repository: {
          name: '', // Invalid - empty name
          full_name: 'user/test-repo',
          description: null,
          html_url: 'https://github.com/user/test-repo',
          language: null,
          topics: []
        },
        readmeContent: null,
        docsContent: [],
        userPrompt: ''
      };

      expect(() => {
        CampaignGenerationInputSchema.parse(invalidInput);
      }).toThrow();
    });
  });

  describe('output validation', () => {
    const validOutput = {
      title: 'Revolutionary Testing Framework',
      summary: 'A comprehensive testing solution that revolutionizes how developers write and maintain tests',
      description: 'Our innovative testing framework provides developers with powerful tools to create, run, and maintain comprehensive test suites. Built with modern TypeScript architecture, it offers unparalleled performance and developer experience.',
      fundingGoalDollars: 25000,
      sectors: ['Developer Tools', 'Software Development'],
      deployModes: ['npm package', 'CLI tool'],
      tags: ['testing', 'typescript', 'developer-tools', 'productivity'],
      milestones: [
        {
          name: 'Core Framework',
          pct: 40,
          dueDate: '3 months',
          acceptance: {
            criteria: 'Complete core testing framework with basic functionality',
            deliverables: ['Core library', 'Basic API']
          }
        },
        {
          name: 'Advanced Features',
          pct: 60,
          dueDate: '6 months',
          acceptance: {
            criteria: 'Advanced testing features and integrations',
            deliverables: ['Advanced API', 'Integrations']
          }
        }
      ],
      pledgeTiers: [
        {
          title: 'Supporter',
          description: 'Help support the development of this amazing testing framework',
          amountDollars: 25,
          order: 1,
          estimatedDelivery: 'Thank you message'
        },
        {
          title: 'Early Access',
          description: 'Get early access to the testing framework beta version',
          amountDollars: 100,
          order: 2,
          estimatedDelivery: 'Beta access 2 weeks early'
        }
      ]
    };

    it('should validate complete valid output', () => {
      const result = GeneratedCampaignSchema.parse(validOutput);
      expect(result).toEqual(validOutput);
    });

    it('should reject invalid title', () => {
      const invalidOutput = {
        ...validOutput,
        title: '' // Invalid - empty title
      };

      expect(() => {
        GeneratedCampaignSchema.parse(invalidOutput);
      }).toThrow();
    });

    it('should reject invalid funding goal', () => {
      const invalidOutput = {
        ...validOutput,
        fundingGoalDollars: 500 // Invalid - below minimum
      };

      expect(() => {
        GeneratedCampaignSchema.parse(invalidOutput);
      }).toThrow();
    });

    it('should reject invalid milestone structure', () => {
      const invalidOutput = {
        ...validOutput,
        milestones: [
          {
            name: 'Single Milestone',
            pct: 100,
            dueDate: null,
            acceptance: {
              criteria: 'Complete everything',
              deliverables: []
            }
          }
        ] // Invalid - need at least 2 milestones
      };

      expect(() => {
        GeneratedCampaignSchema.parse(invalidOutput);
      }).toThrow();
    });

    it('should reject invalid pledge tier amounts', () => {
      const invalidOutput = {
        ...validOutput,
        pledgeTiers: [
          {
            title: 'Free Tier',
            description: 'Free support tier',
            amountDollars: 0, // Invalid - must be positive
            order: 1,
            estimatedDelivery: 'Nothing'
          },
          {
            title: 'Premium Tier',
            description: 'Premium support tier',
            amountDollars: 100,
            order: 2,
            estimatedDelivery: 'Premium features'
          }
        ]
      };

      expect(() => {
        GeneratedCampaignSchema.parse(invalidOutput);
      }).toThrow();
    });

    it('should validate milestone percentage limits', () => {
      const invalidOutput = {
        ...validOutput,
        milestones: [
          {
            name: 'Invalid Milestone 1',
            pct: 0, // Invalid - below minimum
            dueDate: null,
            acceptance: {
              criteria: 'Complete task',
              deliverables: []
            }
          },
          {
            name: 'Invalid Milestone 2',
            pct: 150, // Invalid - above maximum
            dueDate: null,
            acceptance: {
              criteria: 'Complete task',
              deliverables: []
            }
          }
        ]
      };

      expect(() => {
        GeneratedCampaignSchema.parse(invalidOutput);
      }).toThrow();
    });

    it('should validate sector and tag limits', () => {
      const invalidSectors = {
        ...validOutput,
        sectors: [], // Invalid - need at least 1
        tags: ['single-tag'] // Invalid - need at least 2
      };

      expect(() => {
        GeneratedCampaignSchema.parse(invalidSectors);
      }).toThrow();

      const tooManySectors = {
        ...validOutput,
        sectors: ['1', '2', '3', '4', '5', '6'], // Invalid - max 5
        tags: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'] // Invalid - max 10
      };

      expect(() => {
        GeneratedCampaignSchema.parse(tooManySectors);
      }).toThrow();
    });
  });

  describe('business logic validation', () => {
    it('should validate reasonable funding goals for different project types', () => {
      const smallProject = {
        ...{ /* valid output template */ },
        fundingGoalDollars: 5000
      };

      const largeProject = {
        ...{ /* valid output template */ },
        fundingGoalDollars: 500000
      };

      expect(GeneratedCampaignSchema.parse({
        title: 'Small Project',
        summary: 'A small project that needs minimal funding for completion and launch',
        description: 'This is a small project that can be completed with minimal resources. It focuses on solving a specific problem with a simple, elegant solution.',
        fundingGoalDollars: 5000,
        sectors: ['Software'],
        deployModes: ['web'],
        tags: ['simple', 'minimal'],
        milestones: [
          {
            name: 'Development',
            pct: 70,
            dueDate: '2 months',
            acceptance: {
              criteria: 'Core development complete',
              deliverables: ['Working prototype']
            }
          },
          {
            name: 'Launch',
            pct: 30,
            dueDate: '3 months',
            acceptance: {
              criteria: 'Public launch ready',
              deliverables: ['Production deployment']
            }
          }
        ],
        pledgeTiers: [
          {
            title: 'Basic Support',
            description: 'Basic support for the project development',
            amountDollars: 10,
            order: 1,
            estimatedDelivery: 'Thank you'
          },
          {
            title: 'Premium Support',
            description: 'Premium support with early access to features',
            amountDollars: 50,
            order: 2,
            estimatedDelivery: 'Early access'
          }
        ]
      }).fundingGoalDollars).toBe(5000);

      expect(GeneratedCampaignSchema.parse({
        title: 'Large Enterprise Project',
        summary: 'A comprehensive enterprise solution requiring significant development resources and infrastructure',
        description: 'This large-scale project aims to revolutionize enterprise workflows through advanced automation and AI integration. It requires extensive development, testing, and infrastructure setup.',
        fundingGoalDollars: 500000,
        sectors: ['Enterprise', 'AI', 'Automation'],
        deployModes: ['cloud', 'on-premise'],
        tags: ['enterprise', 'ai', 'automation', 'scalable'],
        milestones: [
          {
            name: 'Foundation',
            pct: 25,
            dueDate: '6 months',
            acceptance: {
              criteria: 'Core infrastructure complete',
              deliverables: ['Infrastructure', 'Basic framework']
            }
          },
          {
            name: 'Core Features',
            pct: 50,
            dueDate: '12 months',
            acceptance: {
              criteria: 'Main features implemented',
              deliverables: ['Feature set', 'API']
            }
          },
          {
            name: 'Enterprise Ready',
            pct: 25,
            dueDate: '18 months',
            acceptance: {
              criteria: 'Enterprise deployment ready',
              deliverables: ['Enterprise version', 'Support system']
            }
          }
        ],
        pledgeTiers: [
          {
            title: 'Individual',
            description: 'Individual developer access',
            amountDollars: 100,
            order: 1,
            estimatedDelivery: 'Personal license'
          },
          {
            title: 'Team',
            description: 'Small team license with support',
            amountDollars: 500,
            order: 2,
            estimatedDelivery: 'Team license'
          },
          {
            title: 'Enterprise',
            description: 'Full enterprise license with premium support',
            amountDollars: 2000,
            order: 3,
            estimatedDelivery: 'Enterprise license'
          }
        ]
      }).fundingGoalDollars).toBe(500000);
    });
  });
});