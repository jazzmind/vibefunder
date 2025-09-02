/**
 * MilestoneSuggestionService Tests
 * 
 * Comprehensive tests for milestone suggestion service covering:
 * - AI integration and milestone generation
 * - Input validation with Zod schemas
 * - Percentage validation and calculation
 * - Error handling and retry logic
 * - Edge cases and boundary conditions
 * - Milestone acceptance criteria validation
 */

// Use global mock from jest.setup.js
const mockCallAI = global.mockCallAI;

// Import after mock setup
import { MilestoneSuggestionService } from '../../lib/services/MilestoneSuggestionService';
import type {
  MilestoneSuggestionInput,
  MilestoneSuggestionResponse,
  SuggestedMilestone
} from '../../lib/services/MilestoneSuggestionService';
import { AIError, AIErrorType } from '../../lib/ai/aiService';
import { MODELS } from '../../lib/ai/models';
import {
  createAIError,
  setupTestEnvironment,
  simulateTimeout,
  simulateRateLimit
} from '../lib/serviceTestHelpers';

describe('MilestoneSuggestionService', () => {
  let service: MilestoneSuggestionService;
  let restoreEnv: () => void;

  const mockInput: MilestoneSuggestionInput = {
    title: 'Revolutionary AI Testing Framework',
    summary: 'An AI-powered testing tool that revolutionizes software quality assurance',
    description: 'This innovative framework combines machine learning algorithms with automated testing to provide intelligent test case generation, predictive bug detection, and comprehensive quality metrics. Built for modern development teams who need reliable, fast, and intelligent testing solutions.',
    fundingGoal: 50000
  };

  const mockMilestoneResponse: MilestoneSuggestionResponse = {
    milestones: [
      {
        name: 'Project Setup and Architecture Design',
        pct: 20,
        acceptance: {
          checklist: [
            'Development environment and CI/CD pipeline configured',
            'Core architecture documentation completed',
            'Technology stack finalized and dependencies identified',
            'Project repository structure established with coding standards'
          ]
        },
        reason: 'Establishes the foundation for all subsequent development work and ensures proper project structure'
      },
      {
        name: 'Core Framework Implementation',
        pct: 35,
        acceptance: {
          checklist: [
            'AI-powered test case generation module completed',
            'Base testing framework with plugin architecture implemented',
            'Integration with popular testing libraries (Jest, Mocha, etc.)',
            'Basic machine learning models for predictive analysis trained and tested'
          ]
        },
        reason: 'Core functionality that delivers the primary value proposition of intelligent test generation'
      },
      {
        name: 'Advanced Features and Beta Testing',
        pct: 30,
        acceptance: {
          checklist: [
            'Predictive bug detection system fully functional',
            'Quality metrics dashboard with real-time insights',
            'Beta version released to select users for feedback',
            'Performance optimization and scalability testing completed'
          ]
        },
        reason: 'Advanced features that differentiate the product and validate market fit through user feedback'
      },
      {
        name: 'Production Release and Documentation',
        pct: 15,
        acceptance: {
          checklist: [
            'Comprehensive documentation and user guides published',
            'Production-ready v1.0 released with full feature set',
            'Support system and community resources established',
            'Marketing materials and case studies completed'
          ]
        },
        reason: 'Ensures market-ready product with proper support and documentation for widespread adoption'
      }
    ]
  };

  beforeEach(() => {
    restoreEnv = setupTestEnvironment();
    service = new MilestoneSuggestionService();
    jest.clearAllMocks();
    
    // Default successful response
    mockCallAI.mockResolvedValue(mockMilestoneResponse);
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('generate method', () => {
    describe('successful milestone generation', () => {
      it('should generate milestones with valid input data', async () => {
        const result = await service.suggestMilestones(mockInput);

        expect(result).toBeDefined();
        expect(result.data.milestones).toHaveLength(4);
        expect(result.data.milestones[0].name).toBe('Project Setup and Architecture Design');
        expect(result.data.milestones[0].pct).toBe(20);
      });

      it('should call AI with correct parameters', async () => {
        await service.suggestMilestones(mockInput);

        expect(mockCallAI).toHaveBeenCalledTimes(1);
        expect(mockCallAI).toHaveBeenCalledWith(
          MODELS.best,
          expect.any(Array),
          expect.any(Object), // schema
          'Milestone Generation',
          'milestone_suggestions'
        );
      });

      it('should validate percentage totals correctly', async () => {
        const result = await service.suggestMilestones(mockInput);
        
        const totalPct = result.data.milestones.reduce((sum, milestone) => sum + milestone.pct, 0);
        expect(totalPct).toBe(100);
      });

      it('should handle different funding goal amounts', async () => {
        const highFundingInput = { ...mockInput, fundingGoal: 100000 };
        
        const result = await service.suggestMilestones(highFundingInput);
        
        expect(result).toBeDefined();
        expect(mockCallAI).toHaveBeenCalledWith(
          MODELS.GPT_4O_MINI,
          expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('$100,000')
            })
          ]),
          expect.any(Object),
          'generateMilestones',
          'milestones'
        );
      });

      it('should generate different milestones for different project types', async () => {
        const hardwareInput = {
          ...mockInput,
          title: 'Smart Home IoT Device',
          description: 'A revolutionary IoT device for smart home automation with advanced sensors and AI capabilities.'
        };
        
        await service.suggestMilestones(hardwareInput);
        
        const callArgs = mockCallAI.mock.calls[0];
        const systemMessage = callArgs[1][0].content;
        expect(systemMessage).toContain('IoT device');
      });
    });

    describe('input validation', () => {
      it('should reject empty title', async () => {
        const invalidInput = { ...mockInput, title: '' };
        
        await expect(service.suggestMilestones(invalidInput))
          .rejects
          .toThrow('Title is required');
      });

      it('should reject very long title', async () => {
        const invalidInput = { ...mockInput, title: 'a'.repeat(201) };
        
        await expect(service.suggestMilestones(invalidInput))
          .rejects
          .toThrow('Title too long');
      });

      it('should reject empty summary', async () => {
        const invalidInput = { ...mockInput, summary: '' };
        
        await expect(service.suggestMilestones(invalidInput))
          .rejects
          .toThrow('Summary is required');
      });

      it('should reject very long summary', async () => {
        const invalidInput = { ...mockInput, summary: 'a'.repeat(501) };
        
        await expect(service.suggestMilestones(invalidInput))
          .rejects
          .toThrow('Summary too long');
      });

      it('should reject empty description', async () => {
        const invalidInput = { ...mockInput, description: '' };
        
        await expect(service.suggestMilestones(invalidInput))
          .rejects
          .toThrow('Description is required');
      });

      it('should reject very long description', async () => {
        const invalidInput = { ...mockInput, description: 'a'.repeat(50001) };
        
        await expect(service.suggestMilestones(invalidInput))
          .rejects
          .toThrow('Description too long');
      });

      it('should reject negative funding goal', async () => {
        const invalidInput = { ...mockInput, fundingGoal: -1000 };
        
        await expect(service.suggestMilestones(invalidInput))
          .rejects
          .toThrow('Funding goal must be positive');
      });

      it('should reject extremely high funding goal', async () => {
        const invalidInput = { ...mockInput, fundingGoal: 10000001 };
        
        await expect(service.suggestMilestones(invalidInput))
          .rejects
          .toThrow('Funding goal too high');
      });

      it('should handle zero funding goal', async () => {
        const invalidInput = { ...mockInput, fundingGoal: 0 };
        
        await expect(service.suggestMilestones(invalidInput))
          .rejects
          .toThrow('Funding goal must be positive');
      });
    });

    describe('error handling', () => {
      it('should handle AI API errors', async () => {
        const apiError = new AIError(AIErrorType.API_ERROR, 'API request failed');
        mockCallAI.mockRejectedValue(apiError);

        await expect(service.suggestMilestones(mockInput))
          .rejects
          .toThrow('API request failed');
      });

      it('should handle rate limiting', async () => {
        const rateLimitError = new AIError(AIErrorType.RATE_LIMIT, 'Rate limit exceeded', undefined, true);
        mockCallAI.mockRejectedValue(rateLimitError);

        await expect(service.suggestMilestones(mockInput))
          .rejects
          .toThrow('Rate limit exceeded');
      });

      it('should handle timeout errors', async () => {
        const timeoutError = new AIError(AIErrorType.TIMEOUT, 'Request timed out');
        mockCallAI.mockRejectedValue(timeoutError);

        await expect(service.suggestMilestones(mockInput))
          .rejects
          .toThrow('Request timed out');
      });

      it('should handle malformed AI responses', async () => {
        mockCallAI.mockResolvedValue({ invalid: 'response' });

        await expect(service.suggestMilestones(mockInput))
          .rejects
          .toThrow();
      });

      it('should handle network connectivity errors', async () => {
        const networkError = new AIError(AIErrorType.NETWORK, 'Network unavailable');
        mockCallAI.mockRejectedValue(networkError);

        await expect(service.suggestMilestones(mockInput))
          .rejects
          .toThrow('Network unavailable');
      });
    });

    describe('milestone validation', () => {
      it('should reject milestones with invalid percentage totals', async () => {
        const invalidMilestoneResponse = {
          milestones: [
            { name: 'Phase 1', pct: 60, acceptance: { checklist: ['Task 1'] }, reason: 'Reason 1' },
            { name: 'Phase 2', pct: 60, acceptance: { checklist: ['Task 2'] }, reason: 'Reason 2' }
          ]
        };
        
        mockCallAI.mockResolvedValue(invalidMilestoneResponse);

        await expect(service.suggestMilestones(mockInput))
          .rejects
          .toThrow();
      });

      it('should reject milestones with zero or negative percentages', async () => {
        const invalidMilestoneResponse = {
          milestones: [
            { name: 'Phase 1', pct: -10, acceptance: { checklist: ['Task 1'] }, reason: 'Reason 1' },
            { name: 'Phase 2', pct: 110, acceptance: { checklist: ['Task 2'] }, reason: 'Reason 2' }
          ]
        };
        
        mockCallAI.mockResolvedValue(invalidMilestoneResponse);

        await expect(service.suggestMilestones(mockInput))
          .rejects
          .toThrow();
      });

      it('should reject milestones without acceptance criteria', async () => {
        const invalidMilestoneResponse = {
          milestones: [
            { name: 'Phase 1', pct: 50, reason: 'Reason 1' },
            { name: 'Phase 2', pct: 50, reason: 'Reason 2' }
          ]
        };
        
        mockCallAI.mockResolvedValue(invalidMilestoneResponse);

        await expect(service.suggestMilestones(mockInput))
          .rejects
          .toThrow();
      });

      it('should reject milestones with empty names', async () => {
        const invalidMilestoneResponse = {
          milestones: [
            { name: '', pct: 50, acceptance: { checklist: ['Task 1'] }, reason: 'Reason 1' },
            { name: 'Phase 2', pct: 50, acceptance: { checklist: ['Task 2'] }, reason: 'Reason 2' }
          ]
        };
        
        mockCallAI.mockResolvedValue(invalidMilestoneResponse);

        await expect(service.suggestMilestones(mockInput))
          .rejects
          .toThrow();
      });
    });

    describe('edge cases and boundary conditions', () => {
      it('should handle minimum valid funding goal', async () => {
        const minFundingInput = { ...mockInput, fundingGoal: 1 };
        
        const result = await service.suggestMilestones(minFundingInput);
        
        expect(result).toBeDefined();
      });

      it('should handle maximum valid funding goal', async () => {
        const maxFundingInput = { ...mockInput, fundingGoal: 10000000 };
        
        const result = await service.suggestMilestones(maxFundingInput);
        
        expect(result).toBeDefined();
      });

      it('should handle unicode characters in input', async () => {
        const unicodeInput = {
          ...mockInput,
          title: 'Prøject 测试 🚀',
          summary: 'Súmmary with spëcial çharacters',
          description: 'Description with émojis 🎯 and unicode ñoñó'
        };
        
        const result = await service.suggestMilestones(unicodeInput);
        
        expect(result).toBeDefined();
      });

      it('should handle very short but valid inputs', async () => {
        const shortInput = {
          title: 'A',
          summary: 'B',
          description: 'C',
          fundingGoal: 1
        };
        
        const result = await service.suggestMilestones(shortInput);
        
        expect(result).toBeDefined();
      });

      it('should handle inputs at maximum length limits', async () => {
        const maxLengthInput = {
          title: 'a'.repeat(200),
          summary: 'b'.repeat(500),
          description: 'c'.repeat(50000),
          fundingGoal: 50000
        };
        
        const result = await service.suggestMilestones(maxLengthInput);
        
        expect(result).toBeDefined();
      });
    });

    describe('concurrent requests handling', () => {
      it('should handle multiple concurrent milestone generation requests', async () => {
        const inputs = [
          { ...mockInput, title: 'Project A' },
          { ...mockInput, title: 'Project B' },
          { ...mockInput, title: 'Project C' }
        ];
        
        const promises = inputs.map(input => service.suggestMilestones(input));
        const results = await Promise.all(promises);
        
        expect(results).toHaveLength(3);
        results.forEach(result => {
          expect(result).toBeDefined();
          expect(result.data.milestones).toBeDefined();
        });
      });

      it('should handle mixed success and failure in concurrent requests', async () => {
        mockCallAI
          .mockResolvedValueOnce(mockMilestoneResponse)
          .mockRejectedValueOnce(new AIError(AIErrorType.API_ERROR, 'API Error'))
          .mockResolvedValueOnce(mockMilestoneResponse);

        const inputs = [
          { ...mockInput, title: 'Success A' },
          { ...mockInput, title: 'Failure' },
          { ...mockInput, title: 'Success B' }
        ];
        
        const results = await Promise.allSettled(inputs.map(input => service.suggestMilestones(input)));
        
        expect(results[0].status).toBe('fulfilled');
        expect(results[1].status).toBe('rejected');
        expect(results[2].status).toBe('fulfilled');
      });
    });
  });
});