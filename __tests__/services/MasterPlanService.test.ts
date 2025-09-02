/**
 * MasterPlanService Tests
 * 
 * Comprehensive tests for master plan service covering:
 * - AI integration and plan generation
 * - Input validation and processing
 * - Repository document analysis
 * - Website content integration
 * - Research data synthesis
 * - Error handling and retry logic
 * - Output validation and structure
 */

import { MasterPlanService } from '@/lib/services/MasterPlanService';
import type { MasterPlan } from '@/lib/services/MasterPlanService';
import { AIError, AIErrorType } from '@/lib/ai/aiService';
import { MODELS } from '@/lib/ai/models';
import {
  createAIError,
  setupTestEnvironment,
  simulateTimeout,
  simulateRateLimit
} from '../lib/serviceTestHelpers';

// Mock the callAI method of AIService
const mockCallAI = jest.fn();

// Mock the AIService class
jest.mock('@/lib/ai/aiService', () => {
  const actual = jest.requireActual('@/lib/ai/aiService');
  
  class MockAIService extends actual.AIService {
    callAI = mockCallAI;
    log = jest.fn();
  }
  
  return {
    ...actual,
    AIService: MockAIService,
    default: MockAIService,
  };
});

describe('MasterPlanService', () => {
  let service: MasterPlanService;
  let restoreEnv: () => void;

  const mockCampaign = {
    title: 'Revolutionary AI Development Platform',
    summary: 'An AI-powered development platform that revolutionizes software creation',
    description: 'This comprehensive platform combines machine learning, automated code generation, and intelligent testing to create a seamless development experience. Built for modern teams who need efficient, reliable, and scalable development solutions.'
  };

  const mockRepoMd = [
    {
      path: 'README.md',
      text: '# AI Development Platform\n\nA revolutionary platform for AI-powered development.\n\n## Features\n- Automated code generation\n- Intelligent testing\n- ML model integration\n\n## Architecture\nBuilt with microservices architecture using Node.js and Python.'
    },
    {
      path: 'ARCHITECTURE.md',
      text: '# System Architecture\n\n## Overview\nThe platform consists of multiple microservices:\n\n### Core Services\n- API Gateway\n- Authentication Service\n- Code Generation Service\n- Testing Service\n\n### Data Layer\n- PostgreSQL for metadata\n- Redis for caching\n- S3 for file storage'
    },
    {
      path: 'API.md',
      text: '# API Documentation\n\n## REST Endpoints\n\n### Authentication\n- POST /auth/login\n- POST /auth/logout\n\n### Code Generation\n- POST /generate/code\n- GET /generate/status\n\n### Testing\n- POST /test/run\n- GET /test/results'
    }
  ];

  const mockWebsiteText = 'Company Website: We are a leading AI technology company specializing in developer tools and automation. Our mission is to make software development more efficient and accessible to everyone. Founded in 2020, we have served over 10,000 developers worldwide.';

  const mockResearch = {
    market: 'Developer tools market is growing at 15% CAGR with increasing demand for AI-powered solutions',
    competitors: 'Main competitors include GitHub Copilot, TabNine, and Replit with gaps in comprehensive testing integration',
    trends: 'Rising adoption of AI in software development, shift towards low-code/no-code solutions'
  };

  const mockMasterPlan: MasterPlan = {
    purpose: 'Create a comprehensive AI-powered development platform that streamlines the entire software development lifecycle from ideation to deployment',
    audience: [
      'Individual developers seeking AI assistance',
      'Small to medium development teams',
      'Enterprise development organizations',
      'DevOps engineers',
      'Technical leads and architects'
    ],
    mustHaveFeatures: [
      'AI-powered code generation with context awareness',
      'Intelligent automated testing suite',
      'Real-time collaboration tools',
      'Version control integration',
      'Multi-language support (JavaScript, Python, Java)',
      'Cloud deployment automation',
      'Performance monitoring and analytics'
    ],
    niceToHaveFeatures: [
      'Visual workflow designer',
      'Mobile app for monitoring',
      'Third-party API marketplace',
      'Custom ML model training',
      'Voice-activated coding assistant',
      'Blockchain integration capabilities'
    ],
    gaps: [
      'Limited support for legacy system integration',
      'No offline mode for code generation',
      'Lacks industry-specific templates',
      'Missing advanced security scanning'
    ],
    competitorAnalysis: {
      summary: 'The market has strong competitors like GitHub Copilot for code generation and various testing tools, but lacks a comprehensive platform that integrates all development phases with AI assistance.',
      competitors: [
        {
          name: 'GitHub Copilot',
          notes: 'Strong at code suggestions but limited testing integration'
        },
        {
          name: 'TabNine',
          notes: 'Good code completion but lacks project-level intelligence'
        },
        {
          name: 'Replit',
          notes: 'Great online IDE but limited enterprise features'
        }
      ]
    },
    roadmapMilestones: [
      {
        title: 'Core Platform Development',
        description: 'Build foundational architecture and core AI services',
        acceptance: [
          'Microservices architecture implemented',
          'Authentication and authorization system functional',
          'Basic AI code generation working',
          'API endpoints documented and tested'
        ]
      },
      {
        title: 'Advanced AI Features',
        description: 'Implement intelligent testing and advanced code analysis',
        acceptance: [
          'Automated test generation functional',
          'Code quality analysis implemented',
          'ML models for bug prediction deployed',
          'Performance optimization suggestions working'
        ]
      },
      {
        title: 'Integration and Collaboration',
        description: 'Add team collaboration features and external integrations',
        acceptance: [
          'Real-time collaborative editing implemented',
          'Git integration fully functional',
          'Third-party tool integrations working',
          'Team management and permissions system complete'
        ]
      },
      {
        title: 'Enterprise Features and Launch',
        description: 'Implement enterprise-grade features and prepare for launch',
        acceptance: [
          'Enterprise security features implemented',
          'Scalability testing completed',
          'Documentation and onboarding materials ready',
          'Beta testing with select customers completed'
        ]
      }
    ]
  };

  beforeEach(() => {
    restoreEnv = setupTestEnvironment();
    service = new MasterPlanService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(service).toBeInstanceOf(MasterPlanService);
      expect(service['config']).toMatchObject({
        logPrefix: 'MasterPlan'
      });
    });
  });

  describe('generate method', () => {
    it('should generate master plan with full input data', async () => {
      // Arrange
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd,
        websiteText: mockWebsiteText,
        research: mockResearch
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      const result = await service.generate(input);

      // Assert
      expect(result).toEqual(mockMasterPlan);
      expect(mockCallAI).toHaveBeenCalledWith(
        MODELS.best,
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        expect.any(Object), // Zod schema
        'Master Plan Generation',
        'master_plan'
      );
    });

    it('should handle minimal input with just campaign data', async () => {
      // Arrange
      const minimalInput = {
        campaign: mockCampaign,
        repoMd: []
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      const result = await service.generate(minimalInput);

      // Assert
      expect(result).toEqual(mockMasterPlan);
      expect(mockCallAI).toHaveBeenCalled();
    });

    it('should handle undefined optional parameters', async () => {
      // Arrange
      const inputWithUndefined = {
        campaign: mockCampaign,
        repoMd: mockRepoMd,
        websiteText: undefined,
        research: undefined
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      const result = await service.generate(inputWithUndefined);

      // Assert
      expect(result).toEqual(mockMasterPlan);
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('WEBSITE (if any): ');
      expect(userMessage.content).toContain('RESEARCH (optional): ');
    });

    it('should include all campaign data in user message', async () => {
      // Arrange
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      await service.generate(input);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      
      expect(userMessage.content).toContain(`Title: ${mockCampaign.title}`);
      expect(userMessage.content).toContain(`Summary: ${mockCampaign.summary}`);
      expect(userMessage.content).toContain(`Description:\n${mockCampaign.description}`);
    });

    it('should process and include repository documents', async () => {
      // Arrange
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd,
        websiteText: mockWebsiteText
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      await service.generate(input);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      
      expect(userMessage.content).toContain('REPO DOCS (subset of .md):');
      expect(userMessage.content).toContain('# README.md');
      expect(userMessage.content).toContain('# ARCHITECTURE.md');
      expect(userMessage.content).toContain('# API.md');
      expect(userMessage.content).toContain('AI Development Platform');
      expect(userMessage.content).toContain('System Architecture');
    });

    it('should include website text when provided', async () => {
      // Arrange
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd,
        websiteText: mockWebsiteText
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      await service.generate(input);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      
      expect(userMessage.content).toContain('WEBSITE (if any):');
      expect(userMessage.content).toContain('leading AI technology company');
      expect(userMessage.content).toContain('10,000 developers worldwide');
    });

    it('should include research data when provided', async () => {
      // Arrange
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd,
        research: mockResearch
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      await service.generate(input);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      
      expect(userMessage.content).toContain('RESEARCH (optional):');
      expect(userMessage.content).toContain('Developer tools market');
      expect(userMessage.content).toContain('GitHub Copilot');
    });

    it('should limit repository documents to first 20 files', async () => {
      // Arrange
      const manyRepoMd = Array.from({ length: 25 }, (_, i) => ({
        path: `doc${i}.md`,
        text: `# Document ${i}\nContent for document ${i}`
      }));
      
      const input = {
        campaign: mockCampaign,
        repoMd: manyRepoMd
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      await service.generate(input);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      
      // Should include doc0 through doc19
      expect(userMessage.content).toContain('# doc0.md');
      expect(userMessage.content).toContain('# doc19.md');
      // Should not include doc20 and beyond
      expect(userMessage.content).not.toContain('# doc20.md');
      expect(userMessage.content).not.toContain('# doc24.md');
    });

    it('should truncate long repository documents to 5000 characters', async () => {
      // Arrange
      const longRepoMd = [{
        path: 'LONG_DOC.md',
        text: 'A'.repeat(10000) // 10k characters
      }];
      
      const input = {
        campaign: mockCampaign,
        repoMd: longRepoMd
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      await service.generate(input);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      
      // Should contain truncated content (5000 A's + header)
      const docSection = userMessage.content.split('# LONG_DOC.md\n')[1];
      const contentOnly = docSection ? docSection.split('\n\n---\n\n')[0] : '';
      expect(contentOnly.length).toBeLessThanOrEqual(5000);
    });

    it('should truncate research data to 8000 characters', async () => {
      // Arrange
      const largeResearch = {
        detailed_analysis: 'X'.repeat(15000) // 15k characters
      };
      
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd,
        research: largeResearch
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      await service.generate(input);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      
      const researchSection = userMessage.content.split('RESEARCH (optional):\n')[1];
      expect(researchSection.length).toBeLessThanOrEqual(8000);
    });
  });

  describe('system message configuration', () => {
    it('should use appropriate system message for product strategy', async () => {
      // Arrange
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      await service.generate(input);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const systemMessage = messages.find((m: any) => m.role === 'system');
      
      expect(systemMessage.content).toContain('product strategy');
      expect(systemMessage.content).toContain('software delivery consultant');
      expect(systemMessage.content).toContain('master plan');
      expect(systemMessage.content).toContain('purpose, audience, features');
      expect(systemMessage.content).toContain('must-have vs nice-to-have');
      expect(systemMessage.content).toContain('competitor context');
      expect(systemMessage.content).toContain('pragmatic milestone roadmap');
    });

    it('should include JSON output instructions', async () => {
      // Arrange
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      await service.generate(input);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      
      expect(userMessage.content).toContain('JSON per schema');
      expect(userMessage.content).toContain('realistic, implementable recommendations');
      expect(userMessage.content).toContain('Populate all schema fields');
    });
  });

  describe('output validation', () => {
    it('should validate master plan response structure', async () => {
      // Arrange
      const invalidOutput = {
        purpose: 'Valid purpose',
        audience: [], // Invalid - must have at least 1 item
        mustHaveFeatures: [], // Invalid - must have at least 1 item
        roadmapMilestones: [] // Invalid - must have at least 1 item
      };
      
      mockCallAI.mockResolvedValue(invalidOutput);

      // Act & Assert
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd
      };
      
      await expect(service.generate(input))
        .rejects.toThrow();
    });

    it('should validate milestone structure', async () => {
      // Arrange
      const invalidMilestones = {
        ...mockMasterPlan,
        roadmapMilestones: [
          {
            title: '', // Invalid - empty title
            description: 'Valid description',
            acceptance: [] // Invalid - must have at least 1 item
          }
        ]
      };
      
      mockCallAI.mockResolvedValue(invalidMilestones);

      // Act & Assert
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd
      };
      
      await expect(service.generate(input))
        .rejects.toThrow();
    });

    it('should validate competitor analysis structure', async () => {
      // Arrange
      const validCompetitorAnalysis = {
        ...mockMasterPlan,
        competitorAnalysis: {
          summary: 'Valid summary',
          competitors: [
            {
              name: 'Competitor 1',
              notes: 'Valid notes'
            },
            {
              name: 'Competitor 2',
              notes: null // Valid - nullable field
            }
          ]
        }
      };
      
      mockCallAI.mockResolvedValue(validCompetitorAnalysis);

      // Act
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd
      };
      
      const result = await service.generate(input);

      // Assert
      expect(result).toEqual(validCompetitorAnalysis);
    });
  });

  describe('error handling', () => {
    it('should handle AI service errors', async () => {
      // Arrange
      const aiError = createAIError(AIErrorType.API_ERROR, 'AI service unavailable');
      mockCallAI.mockRejectedValue(aiError);

      // Act & Assert
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd
      };
      
      await expect(service.generate(input))
        .rejects.toThrow('AI service unavailable');
    });

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = createAIError(AIErrorType.TIMEOUT, 'Request timeout', true);
      mockCallAI.mockRejectedValue(timeoutError);

      // Act & Assert
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd
      };
      
      await expect(service.generate(input))
        .rejects.toThrow('Request timeout');
    });

    it('should handle rate limit errors', async () => {
      // Arrange
      const rateLimitError = createAIError(AIErrorType.RATE_LIMIT, 'Rate limit exceeded', true);
      mockCallAI.mockRejectedValue(rateLimitError);

      // Act & Assert
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd
      };
      
      await expect(service.generate(input))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle network errors with retry logic', async () => {
      // Arrange
      const networkError = createAIError(AIErrorType.NETWORK, 'Network error', true);
      mockCallAI
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockMasterPlan);

      // Act
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd
      };
      
      const result = await service.generate(input);

      // Assert
      expect(result).toEqual(mockMasterPlan);
      expect(mockCallAI).toHaveBeenCalledTimes(2);
    });

    it('should handle malformed JSON responses', async () => {
      // Arrange
      mockCallAI.mockResolvedValue('invalid json response');

      // Act & Assert
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd
      };
      
      await expect(service.generate(input))
        .rejects.toThrow();
    });
  });

  describe('different project types', () => {
    it('should handle SaaS projects', async () => {
      // Arrange
      const saasCampaign = {
        title: 'Cloud CRM Platform',
        summary: 'Comprehensive customer relationship management in the cloud',
        description: 'A modern CRM platform built for sales teams with AI-powered lead scoring, automated workflows, and real-time analytics.'
      };
      
      const input = {
        campaign: saasCampaign,
        repoMd: mockRepoMd
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      const result = await service.generate(input);

      // Assert
      expect(result).toEqual(mockMasterPlan);
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('Cloud CRM Platform');
      expect(userMessage.content).toContain('AI-powered lead scoring');
    });

    it('should handle mobile app projects', async () => {
      // Arrange
      const mobileCampaign = {
        title: 'Fitness Tracking App',
        summary: 'AI-powered fitness tracking for iOS and Android',
        description: 'A comprehensive fitness application with workout planning, nutrition tracking, and personalized coaching powered by machine learning.'
      };
      
      const input = {
        campaign: mobileCampaign,
        repoMd: [{
          path: 'MOBILE_ARCH.md',
          text: '# Mobile Architecture\n\n## React Native\nCross-platform development with React Native\n\n## Backend\nNode.js API with MongoDB'
        }]
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      const result = await service.generate(input);

      // Assert
      expect(result).toEqual(mockMasterPlan);
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('Fitness Tracking App');
      expect(userMessage.content).toContain('React Native');
    });

    it('should handle hardware projects', async () => {
      // Arrange
      const hardwareCampaign = {
        title: 'Smart Home Security Device',
        summary: 'AI-powered home security with edge computing',
        description: 'An intelligent security camera with facial recognition, anomaly detection, and edge AI processing for privacy and performance.'
      };
      
      const input = {
        campaign: hardwareCampaign,
        repoMd: [{
          path: 'HARDWARE.md',
          text: '# Hardware Specifications\n\n## Processor\nARM Cortex-A78 with dedicated NPU\n\n## Sensors\n- 4K camera module\n- PIR motion sensor\n- Temperature/humidity sensor'
        }]
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      const result = await service.generate(input);

      // Assert
      expect(result).toEqual(mockMasterPlan);
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('Smart Home Security Device');
      expect(userMessage.content).toContain('ARM Cortex-A78');
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle empty repository documents array', async () => {
      // Arrange
      const input = {
        campaign: mockCampaign,
        repoMd: []
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      const result = await service.generate(input);

      // Assert
      expect(result).toEqual(mockMasterPlan);
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('REPO DOCS (subset of .md):\n\n\nWEBSITE');
    });

    it('should handle very short campaign descriptions', async () => {
      // Arrange
      const shortCampaign = {
        title: 'A',
        summary: 'B',
        description: 'C'
      };
      
      const input = {
        campaign: shortCampaign,
        repoMd: mockRepoMd
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      const result = await service.generate(input);

      // Assert
      expect(result).toEqual(mockMasterPlan);
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('Title: A');
      expect(userMessage.content).toContain('Summary: B');
    });

    it('should handle special characters in campaign data', async () => {
      // Arrange
      const specialCampaign = {
        title: 'Título with Émojis 🚀 & Symbols <>"',
        summary: 'Summary with "quotes" and <brackets>',
        description: 'Description with ñ, ü, and other ñøñ-ASCII chars'
      };
      
      const input = {
        campaign: specialCampaign,
        repoMd: mockRepoMd
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      const result = await service.generate(input);

      // Assert
      expect(result).toEqual(mockMasterPlan);
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('Título with Émojis 🚀');
    });

    it('should handle empty website text', async () => {
      // Arrange
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd,
        websiteText: ''
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      const result = await service.generate(input);

      // Assert
      expect(result).toEqual(mockMasterPlan);
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('WEBSITE (if any): ');
    });

    it('should handle null research data', async () => {
      // Arrange
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd,
        research: null
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      const result = await service.generate(input);

      // Assert
      expect(result).toEqual(mockMasterPlan);
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('RESEARCH (optional): ');
    });

    it('should handle repository documents with empty text', async () => {
      // Arrange
      const emptyRepoMd = [
        {
          path: 'EMPTY.md',
          text: ''
        },
        {
          path: 'WHITESPACE.md',
          text: '   \n\t   '
        }
      ];
      
      const input = {
        campaign: mockCampaign,
        repoMd: emptyRepoMd
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      const result = await service.generate(input);

      // Assert
      expect(result).toEqual(mockMasterPlan);
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('# EMPTY.md');
      expect(userMessage.content).toContain('# WHITESPACE.md');
    });
  });

  describe('service configuration', () => {
    it('should use MODELS.best for master plan generation', async () => {
      // Arrange
      const input = {
        campaign: mockCampaign,
        repoMd: mockRepoMd
      };
      
      mockCallAI.mockResolvedValue(mockMasterPlan);

      // Act
      await service.generate(input);

      // Assert
      expect(mockCallAI).toHaveBeenCalledWith(
        MODELS.best,
        expect.any(Array),
        expect.any(Object),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should use correct log prefix', () => {
      // The service should be configured with appropriate log prefix
      expect(service['config'].logPrefix).toBe('MasterPlan');
    });
  });

  describe('concurrent plan generation', () => {
    it('should handle multiple concurrent requests', async () => {
      // Arrange
      const inputs = [
        {
          campaign: { ...mockCampaign, title: 'Project A' },
          repoMd: mockRepoMd
        },
        {
          campaign: { ...mockCampaign, title: 'Project B' },
          repoMd: mockRepoMd
        },
        {
          campaign: { ...mockCampaign, title: 'Project C' },
          repoMd: mockRepoMd
        }
      ];
      
      mockCallAI.mockImplementation((model, messages) => {
        const userMessage = messages.find((m: any) => m.role === 'user');
        if (userMessage.content.includes('Project A')) {
          return Promise.resolve({ ...mockMasterPlan, purpose: 'Purpose A' });
        }
        if (userMessage.content.includes('Project B')) {
          return Promise.resolve({ ...mockMasterPlan, purpose: 'Purpose B' });
        }
        return Promise.resolve({ ...mockMasterPlan, purpose: 'Purpose C' });
      });

      // Act
      const promises = inputs.map(input => service.generate(input));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].purpose).toBe('Purpose A');
      expect(results[1].purpose).toBe('Purpose B');
      expect(results[2].purpose).toBe('Purpose C');
      expect(mockCallAI).toHaveBeenCalledTimes(3);
    });
  });
});
