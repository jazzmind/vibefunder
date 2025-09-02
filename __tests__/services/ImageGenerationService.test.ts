/**
 * ImageGenerationService Tests
 * 
 * Comprehensive tests for image generation service covering:
 * - AI image generation with DALL-E integration
 * - Prompt generation based on campaign content
 * - Buffer handling and image processing
 * - File system operations for legacy function
 * - Error handling and validation
 * - Service configuration and availability checks
 */

import { ImageGenerationService, generateCampaignImage } from '@/lib/services/ImageGenerationService';
import { AIError, AIErrorType } from '@/lib/ai/aiService';
import { MODELS } from '@/lib/ai/models';
import {
  createAIError,
  setupTestEnvironment,
  expectValidationError
} from '../lib/serviceTestHelpers';
import fs from 'fs/promises';
import path from 'path';

// Mock the generateImage method of AIService
const mockGenerateImage = jest.fn();

// Mock the AIService class
jest.mock('@/lib/ai/aiService', () => {
  const actual = jest.requireActual('@/lib/ai/aiService');
  
  class MockAIService extends actual.AIService {
    generateImage = mockGenerateImage;
    log = jest.fn();
    config = { timeoutMs: 60000 };
  }
  
  return {
    ...actual,
    AIService: MockAIService,
    default: MockAIService,
  };
});

// Mock file system operations
jest.mock('fs/promises');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('ImageGenerationService', () => {
  let service: ImageGenerationService;
  let restoreEnv: () => void;

  const mockInput = {
    id: 'test-campaign-123',
    title: 'Revolutionary AI Testing Framework',
    summary: 'An AI-powered testing tool that revolutionizes software quality assurance',
    description: 'This innovative AI and machine learning platform provides dashboard analytics for developer teams working on automation and workflow optimization.'
  };

  const mockImageBuffer = Buffer.from('fake-image-data');

  beforeEach(() => {
    restoreEnv = setupTestEnvironment();
    service = new ImageGenerationService();
    jest.clearAllMocks();

    // Set up default environment
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    restoreEnv();
    delete process.env.OPENAI_API_KEY;
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(service).toBeInstanceOf(ImageGenerationService);
    });
  });

  describe('generateCampaignImage', () => {
    it('should generate campaign image successfully', async () => {
      // Arrange
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      const result = await service.generateCampaignImage(mockInput);

      // Assert
      expect(result.data.image).toBe(mockImageBuffer);
      expect(result.data.prompt).toContain('Revolutionary AI Testing Framework');
      expect(result.metadata).toHaveProperty('executionTimeMs');
      expect(result.metadata).toHaveProperty('retries', 0);
      expect(result.metadata.model).toBe(MODELS.image);

      expect(mockGenerateImage).toHaveBeenCalledWith(
        MODELS.image,
        expect.stringContaining('Revolutionary AI Testing Framework'),
        '1024x1024',
        1,
        'medium'
      );
    });

    it('should validate input using Zod schema', async () => {
      // Arrange
      const invalidInput = {
        id: '', // Invalid - empty ID
        title: 'x'.repeat(201), // Invalid - too long
        summary: 'Valid summary'
      };

      // Act & Assert
      await expect(service.generateCampaignImage(invalidInput as any))
        .rejects.toThrow();
    });

    it('should handle minimum valid input', async () => {
      // Arrange
      const minimalInput = {
        id: 'test-id',
        title: 'Test Title'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      const result = await service.generateCampaignImage(minimalInput);

      // Assert
      expect(result.data.image).toBe(mockImageBuffer);
      expect(result.data.prompt).toContain('Test Title');
    });

    it('should throw error when no image is returned', async () => {
      // Arrange
      mockGenerateImage.mockResolvedValue(null);

      // Act & Assert
      await expect(service.generateCampaignImage(mockInput))
        .rejects.toThrow('No image returned from AI service');
    });

    it('should handle AI service errors', async () => {
      // Arrange
      const aiError = createAIError(AIErrorType.API_ERROR, 'Image generation failed');
      mockGenerateImage.mockRejectedValue(aiError);

      // Act & Assert
      await expect(service.generateCampaignImage(mockInput))
        .rejects.toThrow('Image generation failed');
    });

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = createAIError(AIErrorType.TIMEOUT, 'Request timeout');
      mockGenerateImage.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(service.generateCampaignImage(mockInput))
        .rejects.toThrow('Request timeout');
    });

    it('should handle rate limit errors', async () => {
      // Arrange
      const rateLimitError = createAIError(AIErrorType.RATE_LIMIT, 'Rate limit exceeded');
      mockGenerateImage.mockRejectedValue(rateLimitError);

      // Act & Assert
      await expect(service.generateCampaignImage(mockInput))
        .rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('generateImagePrompt', () => {
    it('should generate basic prompt from title only', async () => {
      // Arrange
      const basicInput = {
        id: 'test-id',
        title: 'Simple Test Campaign'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(basicInput);

      // Assert
      const [, prompt] = mockGenerateImage.mock.calls[0];
      expect(prompt).toContain('Simple Test Campaign');
      expect(prompt).toContain('professional, modern hero image');
      expect(prompt).toContain('Clean, professional, modern tech aesthetic');
    });

    it('should include summary in prompt when provided', async () => {
      // Arrange
      const inputWithSummary = {
        ...mockInput,
        description: undefined
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(inputWithSummary);

      // Assert
      const [, prompt] = mockGenerateImage.mock.calls[0];
      expect(prompt).toContain('AI-powered testing tool');
    });

    it('should detect AI themes in description', async () => {
      // Arrange
      const aiInput = {
        id: 'ai-campaign',
        title: 'AI Platform',
        description: 'This platform uses artificial intelligence and machine learning to solve complex problems'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(aiInput);

      // Assert
      const [, prompt] = mockGenerateImage.mock.calls[0];
      expect(prompt).toContain('AI and machine learning themes');
    });

    it('should detect dashboard themes in description', async () => {
      // Arrange
      const dashboardInput = {
        id: 'dashboard-campaign',
        title: 'Analytics Dashboard',
        description: 'A comprehensive dashboard for analytics and data visualization'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(dashboardInput);

      // Assert
      const [, prompt] = mockGenerateImage.mock.calls[0];
      expect(prompt).toContain('data visualization and dashboard elements');
    });

    it('should detect mobile app themes', async () => {
      // Arrange
      const mobileInput = {
        id: 'mobile-campaign',
        title: 'Mobile App',
        description: 'A revolutionary mobile app for iOS and Android'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(mobileInput);

      // Assert
      const [, prompt] = mockGenerateImage.mock.calls[0];
      expect(prompt).toContain('mobile and app development themes');
    });

    it('should detect cloud/SaaS themes', async () => {
      // Arrange
      const cloudInput = {
        id: 'cloud-campaign',
        title: 'Cloud Platform',
        description: 'A scalable cloud computing SaaS solution'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(cloudInput);

      // Assert
      const [, prompt] = mockGenerateImage.mock.calls[0];
      expect(prompt).toContain('cloud computing and SaaS concepts');
    });

    it('should detect developer themes', async () => {
      // Arrange
      const devInput = {
        id: 'dev-campaign',
        title: 'Developer Tool',
        description: 'A powerful code editor for developer productivity'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(devInput);

      // Assert
      const [, prompt] = mockGenerateImage.mock.calls[0];
      expect(prompt).toContain('software development and coding themes');
    });

    it('should detect automation themes', async () => {
      // Arrange
      const automationInput = {
        id: 'auto-campaign',
        title: 'Workflow Tool',
        description: 'Automation platform for streamlining business workflows'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(automationInput);

      // Assert
      const [, prompt] = mockGenerateImage.mock.calls[0];
      expect(prompt).toContain('workflow automation and process optimization');
    });

    it('should detect security themes', async () => {
      // Arrange
      const securityInput = {
        id: 'security-campaign',
        title: 'Security Platform',
        description: 'Advanced cybersecurity solution for enterprise security'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(securityInput);

      // Assert
      const [, prompt] = mockGenerateImage.mock.calls[0];
      expect(prompt).toContain('cybersecurity and data protection');
    });

    it('should detect blockchain themes', async () => {
      // Arrange
      const blockchainInput = {
        id: 'blockchain-campaign',
        title: 'Crypto Platform',
        description: 'Innovative blockchain technology for crypto transactions'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(blockchainInput);

      // Assert
      const [, prompt] = mockGenerateImage.mock.calls[0];
      expect(prompt).toContain('blockchain and cryptocurrency technology');
    });

    it('should detect IoT themes', async () => {
      // Arrange
      const iotInput = {
        id: 'iot-campaign',
        title: 'IoT Platform',
        description: 'Internet of Things solution for connected devices'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(iotInput);

      // Assert
      const [, prompt] = mockGenerateImage.mock.calls[0];
      expect(prompt).toContain('IoT and connected device concepts');
    });

    it('should detect fintech themes', async () => {
      // Arrange
      const fintechInput = {
        id: 'fintech-campaign',
        title: 'Financial Platform',
        description: 'Revolutionary fintech solution for financial services'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(fintechInput);

      // Assert
      const [, prompt] = mockGenerateImage.mock.calls[0];
      expect(prompt).toContain('fintech and financial technology');
    });

    it('should combine multiple themes', async () => {
      // Arrange
      const multiThemeInput = {
        id: 'multi-campaign',
        title: 'Multi-Platform Solution',
        description: 'An AI-powered mobile app with blockchain technology for fintech automation'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(multiThemeInput);

      // Assert
      const [, prompt] = mockGenerateImage.mock.calls[0];
      expect(prompt).toContain('AI and machine learning themes');
      expect(prompt).toContain('mobile and app development themes');
      expect(prompt).toContain('blockchain and cryptocurrency technology');
      expect(prompt).toContain('fintech and financial technology');
      expect(prompt).toContain('workflow automation and process optimization');
    });

    it('should include style guidelines in all prompts', async () => {
      // Arrange
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(mockInput);

      // Assert
      const [, prompt] = mockGenerateImage.mock.calls[0];
      expect(prompt).toContain('Clean, professional, modern tech aesthetic');
      expect(prompt).toContain('vibrant gradients');
      expect(prompt).toContain('No text or logos in the image');
      expect(prompt).toContain('16:9 aspect ratio');
    });
  });

  describe('static methods and configuration', () => {
    it('should check availability based on API key', () => {
      // Arrange
      process.env.OPENAI_API_KEY = 'test-key';

      // Act & Assert
      expect(ImageGenerationService.isAvailable()).toBe(true);
    });

    it('should return false when API key is missing', () => {
      // Arrange
      delete process.env.OPENAI_API_KEY;

      // Act & Assert
      expect(ImageGenerationService.isAvailable()).toBe(false);
    });

    it('should return configuration info', () => {
      // Arrange
      process.env.OPENAI_API_KEY = 'test-key';

      // Act
      const config = service.getConfig();

      // Assert
      expect(config).toEqual({
        isAvailable: true,
        hasApiKey: true,
        model: MODELS.image,
        timeout: 60000
      });
    });

    it('should return config with no API key', () => {
      // Arrange
      delete process.env.OPENAI_API_KEY;

      // Act
      const config = service.getConfig();

      // Assert
      expect(config).toEqual({
        isAvailable: false,
        hasApiKey: false,
        model: MODELS.image,
        timeout: 60000
      });
    });
  });

  describe('legacy generateCampaignImage function', () => {
    beforeEach(() => {
      // Mock path operations
      mockPath.join.mockImplementation((...args) => args.join('/'));
      
      // Mock fs operations
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should generate and save campaign image', async () => {
      // Arrange
      mockGenerateImage.mockResolvedValue(mockImageBuffer);
      const mockTimestamp = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      // Act
      const result = await generateCampaignImage(mockInput);

      // Assert
      expect(result).toBe(`/images/campaigns/${mockInput.id}-${mockTimestamp}.png`);
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('public/images/campaigns'),
        { recursive: true }
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(`${mockInput.id}-${mockTimestamp}.png`),
        mockImageBuffer
      );
    });

    it('should return null when service is not available', async () => {
      // Arrange
      delete process.env.OPENAI_API_KEY;

      // Act
      const result = await generateCampaignImage(mockInput);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when image generation fails', async () => {
      // Arrange
      mockGenerateImage.mockRejectedValue(new Error('Generation failed'));

      // Act
      const result = await generateCampaignImage(mockInput);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when no image buffer is returned', async () => {
      // Arrange
      mockGenerateImage.mockResolvedValue(null);

      // Act
      const result = await generateCampaignImage(mockInput);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle file system errors gracefully', async () => {
      // Arrange
      mockGenerateImage.mockResolvedValue(mockImageBuffer);
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      // Act
      const result = await generateCampaignImage(mockInput);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle directory creation errors gracefully', async () => {
      // Arrange
      mockGenerateImage.mockResolvedValue(mockImageBuffer);
      mockFs.mkdir.mockRejectedValue(new Error('Directory exists'));
      const mockTimestamp = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      // Act
      const result = await generateCampaignImage(mockInput);

      // Assert
      expect(result).toBe(`/images/campaigns/${mockInput.id}-${mockTimestamp}.png`);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('logging and error handling', () => {
    it('should log successful image generation', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      await service.generateCampaignImage(mockInput);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generating AI image for campaign: Revolutionary AI Testing Framework')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using prompt:')
      );
      
      consoleSpy.mockRestore();
    });

    it('should log errors appropriately', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const error = new Error('Test error');
      mockGenerateImage.mockRejectedValue(error);

      // Act & Assert
      await expect(service.generateCampaignImage(mockInput))
        .rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Image generation failed: Test error'),
        'error'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle very long titles and descriptions', async () => {
      // Arrange
      const longInput = {
        id: 'long-campaign',
        title: 'A'.repeat(200), // Maximum length
        description: 'B'.repeat(10000) // Very long description
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      const result = await service.generateCampaignImage(longInput);

      // Assert
      expect(result.data.image).toBe(mockImageBuffer);
    });

    it('should handle special characters in campaign data', async () => {
      // Arrange
      const specialCharInput = {
        id: 'special-chars-123',
        title: 'Título with Émojis 🚀 & Symbols <>&"',
        summary: 'Summary with "quotes" and <brackets>',
        description: 'Description with ñ, ü, and other ñøñ-ASCII chars'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      const result = await service.generateCampaignImage(specialCharInput);

      // Assert
      expect(result.data.image).toBe(mockImageBuffer);
      expect(result.data.prompt).toContain('Título with Émojis 🚀 & Symbols');
    });

    it('should handle campaigns with no themes detected', async () => {
      // Arrange
      const genericInput = {
        id: 'generic-campaign',
        title: 'Generic Product',
        description: 'A simple product for everyday use'
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      const result = await service.generateCampaignImage(genericInput);

      // Assert
      expect(result.data.image).toBe(mockImageBuffer);
      expect(result.data.prompt).not.toContain('Focus on:');
    });

    it('should handle empty optional fields', async () => {
      // Arrange
      const emptyFieldsInput = {
        id: 'empty-fields',
        title: 'Campaign Title',
        summary: '',
        description: ''
      };
      
      mockGenerateImage.mockResolvedValue(mockImageBuffer);

      // Act
      const result = await service.generateCampaignImage(emptyFieldsInput);

      // Assert
      expect(result.data.image).toBe(mockImageBuffer);
    });
  });
});