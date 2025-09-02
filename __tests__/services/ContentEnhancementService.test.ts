/**
 * ContentEnhancementService Tests
 * 
 * Comprehensive tests for content enhancement service covering:
 * - Content analysis and improvement suggestions
 * - Zod schema validation for input and output
 * - AI integration for content processing
 * - Error handling and edge cases
 * - Context handling (repository and website)
 */

import { ContentEnhancementService } from '@/lib/services/ContentEnhancementService';
import { AIError, AIErrorType } from '@/lib/ai/aiService';
import { MODELS } from '@/lib/ai/models';
import {
  createAIError,
  mockContentSuggestions,
  setupTestEnvironment,
  expectValidationError
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

describe('ContentEnhancementService', () => {
  let service: ContentEnhancementService;
  let restoreEnv: () => void;

  const mockInput = {
    title: 'Revolutionary Testing Framework',
    summary: 'A comprehensive testing solution for modern developers',
    content: `# Revolutionary Testing Framework

## Overview
Our testing framework revolutionizes how developers write and run tests. Built with TypeScript, it offers unparalleled performance and ease of use.

## Features
- Fast execution
- Easy setup
- Great documentation
- TypeScript support

## Benefits
This framework will save developers time and improve code quality. It's designed for teams of all sizes.

## Funding Goal
We need $25,000 to complete development and launch this amazing tool.`,
    repoContext: 'GitHub repository: testuser/awesome-testing-framework with TypeScript, Jest integration',
    websiteContext: 'Company website showcases other developer tools with focus on productivity'
  };

  beforeEach(() => {
    restoreEnv = setupTestEnvironment();
    service = new ContentEnhancementService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('enhanceContent', () => {
    it('should generate content enhancement suggestions', async () => {
      // Arrange
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      const result = await service.enhanceContent(mockInput);

      // Assert
      expect(result.data).toEqual(mockContentSuggestions);
      expect(result.metadata).toHaveProperty('executionTimeMs');
      expect(result.metadata).toHaveProperty('retries', 0);
      
      expect(mockCallAI).toHaveBeenCalledWith(
        MODELS.best,
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        expect.any(Object), // Zod schema
        'Content Enhancement Analysis',
        'content_enhancement'
      );
    });

    it('should validate input data with Zod schema', async () => {
      // Arrange
      const invalidInput = {
        title: '', // Invalid - empty title
        summary: 'Valid summary',
        content: 'x'.repeat(51000), // Invalid - too long
        repoContext: 'Valid context'
      };

      // Act & Assert
      await expect(service.enhanceContent(invalidInput as any))
        .rejects.toThrow();
    });

    it('should handle minimum valid input', async () => {
      // Arrange
      const minimalInput = {
        title: 'Test',
        summary: 'Test summary',
        content: 'Test content'
      };
      
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      const result = await service.enhanceContent(minimalInput);

      // Assert
      expect(result.data).toEqual(mockContentSuggestions);
      expect(mockCallAI).toHaveBeenCalled();
    });

    it('should include repository context in AI prompt when provided', async () => {
      // Arrange
      const inputWithRepo = {
        ...mockInput,
        repoContext: 'Repository shows advanced TypeScript patterns and testing utilities'
      };
      
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      await service.enhanceContent(inputWithRepo);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('REPOSITORY CONTEXT');
      expect(userMessage.content).toContain('Repository shows advanced TypeScript patterns');
    });

    it('should include website context in AI prompt when provided', async () => {
      // Arrange
      const inputWithWebsite = {
        ...mockInput,
        websiteContext: 'Company specializes in developer productivity tools with proven track record'
      };
      
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      await service.enhanceContent(inputWithWebsite);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('WEBSITE/COMPANY CONTEXT');
      expect(userMessage.content).toContain('Company specializes in developer productivity tools');
    });

    it('should handle content without additional context', async () => {
      // Arrange
      const inputWithoutContext = {
        title: mockInput.title,
        summary: mockInput.summary,
        content: mockInput.content
      };
      
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      const result = await service.enhanceContent(inputWithoutContext);

      // Assert
      expect(result.data).toEqual(mockContentSuggestions);
      
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).not.toContain('REPOSITORY CONTEXT');
      expect(userMessage.content).not.toContain('WEBSITE/COMPANY CONTEXT');
    });
  });

  describe('system message configuration', () => {
    it('should use appropriate system message for content analysis', async () => {
      // Arrange
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      await service.enhanceContent(mockInput);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const systemMessage = messages.find((m: any) => m.role === 'system');
      
      expect(systemMessage.content).toContain('expert content strategist');
      expect(systemMessage.content).toContain('crowdfunding campaign content');
      expect(systemMessage.content).toContain('IMPROVEMENT TYPES');
      expect(systemMessage.content).toContain('addition');
      expect(systemMessage.content).toContain('modification');
      expect(systemMessage.content).toContain('restructure');
    });

    it('should include content analysis guidelines', async () => {
      // Arrange
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      await service.enhanceContent(mockInput);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const systemMessage = messages.find((m: any) => m.role === 'system');
      
      expect(systemMessage.content).toContain('ANALYSIS APPROACH');
      expect(systemMessage.content).toContain('emotional connection');
      expect(systemMessage.content).toContain('specific metrics');
      expect(systemMessage.content).toContain('target audience clarity');
    });
  });

  describe('output validation', () => {
    it('should validate suggestion response structure', async () => {
      // Arrange
      const invalidOutput = {
        suggestions: [] // Invalid - must have at least 1 suggestion
      };
      
      mockCallAI.mockResolvedValue(invalidOutput);

      // Act & Assert
      await expect(service.enhanceContent(mockInput))
        .rejects.toThrow();
    });

    it('should validate individual suggestion structure', async () => {
      // Arrange
      const invalidSuggestions = {
        suggestions: [
          {
            type: 'invalid_type', // Invalid enum value
            section: 'Test Section',
            originalText: 'Original text',
            enhancedText: 'Enhanced text',
            reason: 'Test reason'
          }
        ]
      };
      
      mockCallAI.mockResolvedValue(invalidSuggestions);

      // Act & Assert
      await expect(service.enhanceContent(mockInput))
        .rejects.toThrow();
    });

    it('should validate required fields in suggestions', async () => {
      // Arrange
      const incompleteSuggestions = {
        suggestions: [
          {
            type: 'addition',
            section: '', // Invalid - empty section
            originalText: 'Original text',
            enhancedText: '', // Invalid - empty enhanced text
            reason: 'Test reason'
          }
        ]
      };
      
      mockCallAI.mockResolvedValue(incompleteSuggestions);

      // Act & Assert
      await expect(service.enhanceContent(mockInput))
        .rejects.toThrow();
    });

    it('should validate suggestion count limits', async () => {
      // Arrange
      const tooManySuggestions = {
        suggestions: Array.from({ length: 10 }, (_, i) => ({
          type: 'addition' as const,
          section: `Section ${i}`,
          originalText: `Original text ${i}`,
          enhancedText: `Enhanced text ${i}`,
          reason: `Reason ${i}`
        }))
      };
      
      mockCallAI.mockResolvedValue(tooManySuggestions);

      // Act & Assert
      await expect(service.enhanceContent(mockInput))
        .rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle AI service errors', async () => {
      // Arrange
      const aiError = createAIError(AIErrorType.API_ERROR, 'AI service unavailable');
      mockCallAI.mockRejectedValue(aiError);

      // Act & Assert
      await expect(service.enhanceContent(mockInput))
        .rejects.toThrow('AI service unavailable');
    });

    it('should handle validation errors for input', async () => {
      // Arrange
      const invalidInput = {
        title: 'x'.repeat(201), // Too long
        summary: 'Valid summary',
        content: 'Valid content'
      };

      // Act & Assert
      await expect(service.enhanceContent(invalidInput as any))
        .rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = createAIError(AIErrorType.TIMEOUT, 'Request timeout', true);
      mockCallAI.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(service.enhanceContent(mockInput))
        .rejects.toThrow('Request timeout');
    });

    it('should handle rate limit errors', async () => {
      // Arrange
      const rateLimitError = createAIError(AIErrorType.RATE_LIMIT, 'Rate limit exceeded', true);
      mockCallAI.mockRejectedValue(rateLimitError);

      // Act & Assert
      await expect(service.enhanceContent(mockInput))
        .rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('content analysis scenarios', () => {
    it('should analyze technical content effectively', async () => {
      // Arrange
      const technicalContent = {
        title: 'Advanced Kubernetes Orchestration Tool',
        summary: 'Cloud-native container management platform',
        content: `# Kubernetes Management Platform

## Technical Specifications
- Supports Kubernetes 1.25+
- Multi-cluster management
- GitOps integration
- RBAC security model

## Architecture
Built on microservices architecture with event-driven communication patterns.`,
        repoContext: 'Repository shows complex Kubernetes operators and CRDs'
      };
      
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      const result = await service.enhanceContent(technicalContent);

      // Assert
      expect(result.data).toEqual(mockContentSuggestions);
      
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('Kubernetes');
      expect(userMessage.content).toContain('microservices architecture');
    });

    it('should analyze consumer-focused content', async () => {
      // Arrange
      const consumerContent = {
        title: 'Smart Home Automation Hub',
        summary: 'Easy-to-use smart home control system',
        content: `# Smart Home Hub

## For Everyone
Our hub works with all your smart devices. No technical knowledge required.

## Simple Setup
- Plug in the device
- Download the app
- Start controlling your home

## Family-Friendly
Safe for kids, easy for grandparents.`,
        websiteContext: 'Company focuses on consumer electronics with family-friendly design'
      };
      
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      const result = await service.enhanceContent(consumerContent);

      // Assert
      expect(result.data).toEqual(mockContentSuggestions);
      
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('Smart Home Hub');
      expect(userMessage.content).toContain('family-friendly');
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle very long content', async () => {
      // Arrange
      const longContent = {
        title: 'Test Title',
        summary: 'Test summary',
        content: 'x'.repeat(49999) // Just under the limit
      };
      
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      const result = await service.enhanceContent(longContent);

      // Assert
      expect(result.data).toEqual(mockContentSuggestions);
    });

    it('should handle content with special characters', async () => {
      // Arrange
      const specialCharContent = {
        title: 'Título con Acentos & Símbolos 🚀',
        summary: 'Summary with "quotes" and <brackets>',
        content: `# Content with Special Characters

## Unicode Support ✓
Supports émojis 🎉 and accénted characters.

## Code Examples
\`\`\`javascript
const test = "Hello <world>";
\`\`\`

## Mathematical Notation
E = mc² and ∑(i=1 to n) xi`
      };
      
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      const result = await service.enhanceContent(specialCharContent);

      // Assert
      expect(result.data).toEqual(mockContentSuggestions);
    });

    it('should handle minimal content', async () => {
      // Arrange
      const minimalContent = {
        title: 'A',
        summary: 'B',
        content: 'C'
      };
      
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      const result = await service.enhanceContent(minimalContent);

      // Assert
      expect(result.data).toEqual(mockContentSuggestions);
    });

    it('should handle content with only whitespace', async () => {
      // Arrange
      const whitespaceContent = {
        title: '   Valid Title   ',
        summary: '   Valid Summary   ',
        content: '   \n\n   Valid Content   \n   '
      };
      
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      const result = await service.enhanceContent(whitespaceContent);

      // Assert
      expect(result.data).toEqual(mockContentSuggestions);
    });
  });

  describe('logging and monitoring', () => {
    it('should log successful enhancement completion', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      await service.enhanceContent(mockInput);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generated 2 enhancement suggestions')
      );
      
      consoleSpy.mockRestore();
    });

    it('should log errors appropriately', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const aiError = createAIError(AIErrorType.API_ERROR, 'Test error');
      mockCallAI.mockRejectedValue(aiError);

      // Act & Assert
      await expect(service.enhanceContent(mockInput))
        .rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Content enhancement failed: Test error')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('service configuration', () => {
    it('should initialize with correct configuration', () => {
      // The service should be initialized with appropriate timeout and logging
      expect(service).toBeInstanceOf(ContentEnhancementService);
    });

    it('should use MODELS.best for content enhancement', async () => {
      // Arrange
      mockCallAI.mockResolvedValue(mockContentSuggestions);

      // Act
      await service.enhanceContent(mockInput);

      // Assert
      expect(mockCallAI).toHaveBeenCalledWith(
        MODELS.best,
        expect.any(Array),
        expect.any(Object),
        expect.any(String),
        expect.any(String)
      );
    });
  });
});