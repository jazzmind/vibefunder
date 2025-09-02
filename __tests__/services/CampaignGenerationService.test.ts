/**
 * CampaignGenerationService Tests
 * 
 * Comprehensive tests for campaign generation service covering:
 * - AI integration and response parsing
 * - Input validation with Zod schemas
 * - Error handling and retry logic
 * - Repository analysis and content building
 * - Campaign enhancement functionality
 */

import { CampaignGenerationService } from '@/lib/services/CampaignGenerationService';
import { AIError, AIErrorType } from '@/lib/ai/aiService';
import { MODELS } from '@/lib/ai/models';
import {
  createMockAIResponse,
  createAIError,
  mockCampaignInput,
  mockGeneratedCampaign,
  setupTestEnvironment,
  expectValidationError,
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

describe('CampaignGenerationService', () => {
  let service: CampaignGenerationService;
  let restoreEnv: () => void;

  beforeEach(() => {
    restoreEnv = setupTestEnvironment();
    service = new CampaignGenerationService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('generateCampaign', () => {
    it('should generate a complete campaign from repository data', async () => {
      // Arrange
      mockCallAI.mockResolvedValue(mockGeneratedCampaign);

      // Act
      const result = await service.generateCampaign(mockCampaignInput);

      // Assert
      expect(result.data).toEqual(mockGeneratedCampaign);
      expect(result.metadata).toHaveProperty('executionTimeMs');
      expect(result.metadata).toHaveProperty('retries', 0);
      
      expect(mockCallAI).toHaveBeenCalledWith(
        MODELS.fast,
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        expect.any(Object), // Zod schema
        'Campaign Generation from Repository',
        'campaign_generation'
      );
    });

    it('should validate input data using Zod schema', async () => {
      // Arrange
      const invalidInput = {
        repository: {
          name: '', // Invalid - empty string
          full_name: 'test/repo',
          description: null,
          html_url: 'invalid-url', // Invalid URL format
          language: null,
          topics: []
        },
        readmeContent: null,
        docsContent: [],
        userPrompt: ''
      };

      // Act & Assert
      await expect(service.generateCampaign(invalidInput as any))
        .rejects.toThrow();
    });

    it('should handle missing repository data gracefully', async () => {
      // Arrange
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

      mockCallAI.mockResolvedValue(mockGeneratedCampaign);

      // Act
      const result = await service.generateCampaign(minimalInput);

      // Assert
      expect(result.data).toEqual(mockGeneratedCampaign);
      expect(mockCallAI).toHaveBeenCalled();
    });

    it('should include user prompt in AI request when provided', async () => {
      // Arrange
      const inputWithPrompt = {
        ...mockCampaignInput,
        userPrompt: 'Focus on enterprise features and scalability'
      };
      
      mockCallAI.mockResolvedValue(mockGeneratedCampaign);

      // Act
      await service.generateCampaign(inputWithPrompt);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('Focus on enterprise features and scalability');
    });

    it('should handle AI service errors appropriately', async () => {
      // Arrange
      const aiError = createAIError(AIErrorType.API_ERROR, 'OpenAI API error');
      mockCallAI.mockRejectedValue(aiError);

      // Act & Assert
      await expect(service.generateCampaign(mockCampaignInput))
        .rejects.toThrow('OpenAI API error');
    });

    it('should handle timeout errors with retry logic', async () => {
      // Arrange
      mockCallAI
        .mockRejectedValueOnce(createAIError(AIErrorType.TIMEOUT, 'Request timeout', true))
        .mockResolvedValueOnce(mockGeneratedCampaign);

      // Act
      const result = await service.generateCampaign(mockCampaignInput);

      // Assert
      expect(result.data).toEqual(mockGeneratedCampaign);
      expect(mockCallAI).toHaveBeenCalledTimes(2);
    });

    it('should handle rate limit errors with retry logic', async () => {
      // Arrange
      mockCallAI
        .mockRejectedValueOnce(createAIError(AIErrorType.RATE_LIMIT, 'Rate limit exceeded', true))
        .mockResolvedValueOnce(mockGeneratedCampaign);

      // Act
      const result = await service.generateCampaign(mockCampaignInput);

      // Assert
      expect(result.data).toEqual(mockGeneratedCampaign);
      expect(mockCallAI).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries on persistent errors', async () => {
      // Arrange
      const persistentError = createAIError(AIErrorType.API_ERROR, 'Persistent error', true);
      mockCallAI.mockRejectedValue(persistentError);

      // Act & Assert
      await expect(service.generateCampaign(mockCampaignInput))
        .rejects.toThrow('Persistent error');
    });
  });

  describe('buildRepositoryAnalysis', () => {
    it('should build comprehensive analysis from repository data', () => {
      // Use a public method to test buildRepositoryAnalysis indirectly
      // by examining the generated user message content
      mockCallAI.mockResolvedValue(mockGeneratedCampaign);

      // Act
      service.generateCampaign(mockCampaignInput);

      // Assert - verify the analysis includes key repository information
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      
      expect(userMessage.content).toContain('## Repository Overview');
      expect(userMessage.content).toContain(mockCampaignInput.repository.name);
      expect(userMessage.content).toContain(mockCampaignInput.repository.description);
      expect(userMessage.content).toContain(mockCampaignInput.repository.language);
      expect(userMessage.content).toContain('typescript');
      expect(userMessage.content).toContain('## README Content');
      expect(userMessage.content).toContain('## Additional Documentation');
    });

    it('should handle missing README content gracefully', () => {
      // Arrange
      const inputWithoutReadme = {
        ...mockCampaignInput,
        readmeContent: null
      };
      
      mockCallAI.mockResolvedValue(mockGeneratedCampaign);

      // Act
      service.generateCampaign(inputWithoutReadme);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      
      expect(userMessage.content).toContain('## Repository Overview');
      expect(userMessage.content).not.toContain('## README Content');
    });

    it('should handle empty documentation arrays', () => {
      // Arrange
      const inputWithoutDocs = {
        ...mockCampaignInput,
        docsContent: []
      };
      
      mockCallAI.mockResolvedValue(mockGeneratedCampaign);

      // Act
      service.generateCampaign(inputWithoutDocs);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      
      expect(userMessage.content).toContain('## Repository Overview');
      expect(userMessage.content).not.toContain('## Additional Documentation');
    });
  });

  describe('enhanceCampaignWithRepo', () => {
    const existingCampaign = {
      title: 'Existing Campaign Title',
      summary: 'Existing campaign summary',
      description: 'Existing campaign description with some details'
    };

    it('should enhance existing campaign with repository insights', async () => {
      // Arrange
      mockCallAI.mockResolvedValue(mockGeneratedCampaign);

      // Act
      const result = await service.enhanceCampaignWithRepo(existingCampaign, mockCampaignInput);

      // Assert
      expect(result.data).toEqual(mockGeneratedCampaign);
      expect(mockCallAI).toHaveBeenCalledWith(
        MODELS.best, // Uses best model for enhancement
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        expect.any(Object),
        'Campaign Enhancement with Repository',
        'campaign_enhancement'
      );
    });

    it('should include existing campaign data in enhancement request', async () => {
      // Arrange
      mockCallAI.mockResolvedValue(mockGeneratedCampaign);

      // Act
      await service.enhanceCampaignWithRepo(existingCampaign, mockCampaignInput);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      
      expect(userMessage.content).toContain('## Existing Campaign');
      expect(userMessage.content).toContain(existingCampaign.title);
      expect(userMessage.content).toContain(existingCampaign.summary);
      expect(userMessage.content).toContain(existingCampaign.description);
      expect(userMessage.content).toContain('## Repository Analysis');
    });

    it('should handle campaign without description', async () => {
      // Arrange
      const campaignWithoutDesc = {
        title: 'Title Only Campaign',
        summary: 'Just a summary'
      };
      
      mockCallAI.mockResolvedValue(mockGeneratedCampaign);

      // Act
      const result = await service.enhanceCampaignWithRepo(campaignWithoutDesc, mockCampaignInput);

      // Assert
      expect(result.data).toEqual(mockGeneratedCampaign);
      
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('No description provided');
    });

    it('should validate repository input for enhancement', async () => {
      // Arrange
      const invalidRepoInput = {
        ...mockCampaignInput,
        repository: {
          name: '', // Invalid
          full_name: '',
          description: null,
          html_url: '',
          language: null,
          topics: []
        }
      };

      // Act & Assert
      await expect(service.enhanceCampaignWithRepo(existingCampaign, invalidRepoInput as any))
        .rejects.toThrow();
    });

    it('should handle AI errors during enhancement', async () => {
      // Arrange
      const aiError = createAIError(AIErrorType.PROCESSING, 'Enhancement failed');
      mockCallAI.mockRejectedValue(aiError);

      // Act & Assert
      await expect(service.enhanceCampaignWithRepo(existingCampaign, mockCampaignInput))
        .rejects.toThrow('Enhancement failed');
    });
  });

  describe('output validation', () => {
    it('should validate generated campaign structure', async () => {
      // Arrange
      const invalidOutput = {
        ...mockGeneratedCampaign,
        fundingGoalDollars: -1000, // Invalid - negative amount
        milestones: [], // Invalid - must have at least 2 milestones
      };
      
      mockCallAI.mockResolvedValue(invalidOutput);

      // Act & Assert
      await expect(service.generateCampaign(mockCampaignInput))
        .rejects.toThrow();
    });

    it('should validate milestone structure and percentages', async () => {
      // Arrange
      const invalidMilestones = {
        ...mockGeneratedCampaign,
        milestones: [
          {
            name: 'Invalid Milestone',
            pct: 0, // Invalid - below minimum
            dueDate: null,
            acceptance: {
              criteria: 'Test',
              deliverables: []
            }
          }
        ]
      };
      
      mockCallAI.mockResolvedValue(invalidMilestones);

      // Act & Assert
      await expect(service.generateCampaign(mockCampaignInput))
        .rejects.toThrow();
    });

    it('should validate pledge tier structure', async () => {
      // Arrange
      const invalidTiers = {
        ...mockGeneratedCampaign,
        pledgeTiers: [
          {
            title: '', // Invalid - empty title
            description: 'Test',
            amountDollars: 0, // Invalid - must be positive
            order: 0, // Invalid - must be >= 1
            estimatedDelivery: ''
          }
        ]
      };
      
      mockCallAI.mockResolvedValue(invalidTiers);

      // Act & Assert
      await expect(service.generateCampaign(mockCampaignInput))
        .rejects.toThrow();
    });
  });

  describe('logging and monitoring', () => {
    it('should log successful campaign generation', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockCallAI.mockResolvedValue(mockGeneratedCampaign);

      // Act
      await service.generateCampaign(mockCampaignInput);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generated campaign: "Revolutionary Testing Tool for Developers"')
      );
      
      consoleSpy.mockRestore();
    });

    it('should log errors appropriately', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const aiError = createAIError(AIErrorType.API_ERROR, 'Test error');
      mockCallAI.mockRejectedValue(aiError);

      // Act & Assert
      await expect(service.generateCampaign(mockCampaignInput))
        .rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Campaign generation failed: Test error')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle very large README content', async () => {
      // Arrange
      const largeReadmeInput = {
        ...mockCampaignInput,
        readmeContent: 'A'.repeat(100000) // 100KB README
      };
      
      mockCallAI.mockResolvedValue(mockGeneratedCampaign);

      // Act
      const result = await service.generateCampaign(largeReadmeInput);

      // Assert
      expect(result.data).toEqual(mockGeneratedCampaign);
      expect(mockCallAI).toHaveBeenCalled();
    });

    it('should handle repository with many topics', async () => {
      // Arrange
      const manyTopicsInput = {
        ...mockCampaignInput,
        repository: {
          ...mockCampaignInput.repository,
          topics: Array.from({ length: 50 }, (_, i) => `topic-${i}`)
        }
      };
      
      mockCallAI.mockResolvedValue(mockGeneratedCampaign);

      // Act
      const result = await service.generateCampaign(manyTopicsInput);

      // Assert
      expect(result.data).toEqual(mockGeneratedCampaign);
    });

    it('should handle special characters in repository data', async () => {
      // Arrange
      const specialCharsInput = {
        ...mockCampaignInput,
        repository: {
          ...mockCampaignInput.repository,
          name: 'test-repo-with-émojis-🚀',
          description: 'Description with special chars: áéíóú & symbols <>'
        }
      };
      
      mockCallAI.mockResolvedValue(mockGeneratedCampaign);

      // Act
      const result = await service.generateCampaign(specialCharsInput);

      // Assert
      expect(result.data).toEqual(mockGeneratedCampaign);
    });
  });
});