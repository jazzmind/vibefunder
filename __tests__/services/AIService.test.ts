/**
 * AIService Base Class Tests
 * 
 * Comprehensive tests for the AI service base class covering:
 * - Service initialization and configuration
 * - Error handling and retry logic
 * - Input validation with Zod schemas
 * - Timeout management and cleanup
 * - Logging functionality
 * - AI client integration
 * - Test mode detection and behavior
 */

import AIService, { AIError, AIErrorType, CommonSchemas } from '@/lib/ai/aiService';
import { z } from 'zod';
import {
  createAIError,
  setupTestEnvironment,
  simulateTimeout,
  simulateRateLimit
} from '../lib/serviceTestHelpers';

// Mock the AI client
jest.mock('@/lib/ai/aiClient', () => ({
  aiClient: {
    responses: {
      parse: jest.fn()
    },
    images: {
      generate: jest.fn()
    }
  }
}));

// Test implementation of AIService for testing abstract base class
class TestAIService extends AIService {
  constructor(config?: any) {
    super(config);
  }

  // Expose protected methods for testing
  public testCallAI = this.callAI.bind(this);
  public testValidateInput = this.validateInput.bind(this);
  public testLog = this.log.bind(this);
  public testCreateFileInput = this.createFileInput.bind(this);
  public testCreateTextInput = this.createTextInput.bind(this);
}

describe('AIService', () => {
  let service: TestAIService;
  let restoreEnv: () => void;

  beforeEach(() => {
    restoreEnv = setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('constructor and initialization', () => {
    it('should initialize with default configuration', () => {
      service = new TestAIService();
      
      expect(service).toBeInstanceOf(AIService);
      expect(service['config']).toMatchObject({
        maxRetries: 3,
        timeoutMs: 30000,
        backoffMultiplier: 2,
        enableLogging: true,
        logPrefix: 'TestAIService',
        enableDebugLogging: true // Test mode
      });
    });

    it('should initialize with custom configuration', () => {
      service = new TestAIService({
        maxRetries: 5,
        timeoutMs: 60000,
        backoffMultiplier: 3,
        enableLogging: false,
        logPrefix: 'CustomService',
        organizationId: 'custom-org'
      });
      
      expect(service['config']).toMatchObject({
        maxRetries: 5,
        timeoutMs: 60000,
        backoffMultiplier: 3,
        enableLogging: false,
        logPrefix: 'CustomService',
        organizationId: 'custom-org'
      });
    });

    it('should detect test mode and enable debug logging', () => {
      process.env.NODE_ENV = 'test';
      
      service = new TestAIService();
      
      expect(service['config'].enableDebugLogging).toBe(true);
      expect(service['config'].organizationId).toBe('test-org-ai-debug');
    });

    it('should use test session ID when provided', () => {
      process.env.AI_TEST_SESSION_ID = 'custom-test-session';
      
      service = new TestAIService();
      
      expect(service['sessionId']).toBe('custom-test-session');
    });

    it('should generate session ID when not provided', () => {
      delete process.env.AI_TEST_SESSION_ID;
      
      service = new TestAIService();
      
      expect(service['sessionId']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('input validation', () => {
    beforeEach(() => {
      service = new TestAIService();
    });

    it('should validate valid input against schema', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().positive()
      });
      
      const validInput = { name: 'John', age: 25 };
      
      const result = service.testValidateInput(validInput, schema, 'testOperation');
      
      expect(result).toEqual(validInput);
    });

    it('should throw validation error for invalid input', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().positive()
      });
      
      const invalidInput = { name: '', age: -5 };
      
      expect(() => {
        service.testValidateInput(invalidInput, schema, 'testOperation');
      }).toThrow(AIError);
    });

    it('should include operation name in validation error', () => {
      const schema = z.string().min(5);
      
      try {
        service.testValidateInput('abc', schema, 'customOperation');
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIError);
        expect(error.type).toBe(AIErrorType.VALIDATION);
        expect(error.message).toContain('customOperation');
      }
    });
  });

  describe('common schemas', () => {
    beforeEach(() => {
      service = new TestAIService();
    });

    it('should validate non-empty string', () => {
      expect(() => {
        service.testValidateInput('', CommonSchemas.nonEmptyString, 'test');
      }).toThrow('String cannot be empty');
      
      expect(() => {
        service.testValidateInput('valid', CommonSchemas.nonEmptyString, 'test');
      }).not.toThrow();
    });

    it('should validate positive number', () => {
      expect(() => {
        service.testValidateInput(-5, CommonSchemas.positiveNumber, 'test');
      }).toThrow('Number must be positive');
      
      expect(() => {
        service.testValidateInput(5, CommonSchemas.positiveNumber, 'test');
      }).not.toThrow();
    });

    it('should validate entity ID format', () => {
      expect(() => {
        service.testValidateInput('invalid-uuid', CommonSchemas.entityId, 'test');
      }).toThrow('Invalid entity ID format');
      
      expect(() => {
        service.testValidateInput('123e4567-e89b-12d3-a456-426614174000', CommonSchemas.entityId, 'test');
      }).not.toThrow();
    });

    it('should validate entity type enum', () => {
      expect(() => {
        service.testValidateInput('invalid', CommonSchemas.entityType, 'test');
      }).toThrow();
      
      expect(() => {
        service.testValidateInput('opportunity', CommonSchemas.entityType, 'test');
      }).not.toThrow();
    });
  });

  describe('callAI functionality', () => {
    beforeEach(() => {
      service = new TestAIService();
    });

    it('should call AI client with correct parameters', async () => {
      const mockResponse = {
        output_parsed: { result: 'test result' },
        usage: { total_tokens: 100 },
        model: 'gpt-4'
      };
      
      const { aiClient } = await import('@/lib/ai/aiClient');
      (aiClient.responses.parse as jest.Mock).mockResolvedValue(mockResponse);
      
      const schema = z.object({ result: z.string() });
      const input = [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message' }
      ];
      
      const result = await service.testCallAI('gpt-4', input, schema, 'testOperation');
      
      expect(result).toEqual({ result: 'test result' });
      expect(aiClient.responses.parse).toHaveBeenCalledWith({
        model: 'gpt-4',
        input,
        text: { format: expect.any(Object) }
      });
    });

    it('should handle AI client errors', async () => {
      const { aiClient } = await import('@/lib/ai/aiClient');
      const aiError = new Error('AI client error');
      (aiClient.responses.parse as jest.Mock).mockRejectedValue(aiError);
      
      const schema = z.object({ result: z.string() });
      
      await expect(service.testCallAI('gpt-4', [], schema, 'testOperation'))
        .rejects.toThrow();
    });

    it('should retry on retryable errors', async () => {
      const { aiClient } = await import('@/lib/ai/aiClient');
      const retryableError = createAIError(AIErrorType.RATE_LIMIT, 'Rate limited', true);
      const successResponse = {
        output_parsed: { result: 'success' }
      };
      
      (aiClient.responses.parse as jest.Mock)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(successResponse);
      
      const schema = z.object({ result: z.string() });
      
      const result = await service.testCallAI('gpt-4', [], schema, 'testOperation');
      
      expect(result).toEqual({ result: 'success' });
      expect(aiClient.responses.parse).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const { aiClient } = await import('@/lib/ai/aiClient');
      const nonRetryableError = createAIError(AIErrorType.VALIDATION, 'Invalid input', false);
      
      (aiClient.responses.parse as jest.Mock).mockRejectedValue(nonRetryableError);
      
      const schema = z.object({ result: z.string() });
      
      await expect(service.testCallAI('gpt-4', [], schema, 'testOperation'))
        .rejects.toThrow('Invalid input');
      
      expect(aiClient.responses.parse).toHaveBeenCalledTimes(1);
    });
  });

  describe('logging functionality', () => {
    beforeEach(() => {
      service = new TestAIService({ enableLogging: true, logPrefix: 'TestService' });
    });

    it('should log info messages', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.testLog('Test info message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] TestService: Test info message/)
      );
      
      consoleSpy.mockRestore();
    });

    it('should log warning messages', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      service.testLog('Test warning message', 'warn');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] TestService: ⚠️  Test warning message/)
      );
      
      consoleSpy.mockRestore();
    });

    it('should log error messages', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      service.testLog('Test error message', 'error');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] TestService: ❌ Test error message/)
      );
      
      consoleSpy.mockRestore();
    });

    it('should not log when logging is disabled', () => {
      const serviceNoLog = new TestAIService({ enableLogging: false });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      serviceNoLog.testLog('This should not appear');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      service = new TestAIService();
    });

    it('should create file input content', () => {
      const fileInput = service.testCreateFileInput('test-file-id');
      
      expect(fileInput).toEqual({
        type: 'input_file',
        file_id: 'test-file-id'
      });
    });

    it('should create text input content', () => {
      const textInput = service.testCreateTextInput('test text content');
      
      expect(textInput).toEqual({
        type: 'input_text',
        text: 'test text content'
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      service = new TestAIService();
    });

    it('should create AIError from OpenAI rate limit error', () => {
      const openAIError = { status: 429, message: 'Rate limit exceeded' };
      
      const aiError = AIError.fromOpenAIError(openAIError);
      
      expect(aiError).toBeInstanceOf(AIError);
      expect(aiError.type).toBe(AIErrorType.RATE_LIMIT);
      expect(aiError.retryable).toBe(true);
    });

    it('should create AIError from OpenAI server error', () => {
      const openAIError = { status: 500, message: 'Internal server error' };
      
      const aiError = AIError.fromOpenAIError(openAIError);
      
      expect(aiError).toBeInstanceOf(AIError);
      expect(aiError.type).toBe(AIErrorType.API_ERROR);
      expect(aiError.retryable).toBe(true);
    });

    it('should create AIError from timeout error', () => {
      const timeoutError = { code: 'timeout', message: 'Request timeout' };
      
      const aiError = AIError.fromOpenAIError(timeoutError);
      
      expect(aiError).toBeInstanceOf(AIError);
      expect(aiError.type).toBe(AIErrorType.TIMEOUT);
      expect(aiError.retryable).toBe(true);
    });

    it('should create generic AIError from unknown error', () => {
      const unknownError = { message: 'Unknown error' };
      
      const aiError = AIError.fromOpenAIError(unknownError);
      
      expect(aiError).toBeInstanceOf(AIError);
      expect(aiError.type).toBe(AIErrorType.API_ERROR);
      expect(aiError.retryable).toBe(false);
    });
  });

  describe('timeout management', () => {
    beforeEach(() => {
      service = new TestAIService({ timeoutMs: 1000 });
    });

    it('should handle timeout properly', async () => {
      const { aiClient } = await import('@/lib/ai/aiClient');
      // Mock a long-running operation
      (aiClient.responses.parse as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );
      
      const schema = z.object({ result: z.string() });
      
      await expect(service.testCallAI('gpt-4', [], schema, 'slowOperation'))
        .rejects.toThrow(expect.objectContaining({
          type: AIErrorType.TIMEOUT
        }));
    });

    it('should clear timeout on successful completion', async () => {
      const { aiClient } = await import('@/lib/ai/aiClient');
      const fastResponse = {
        output_parsed: { result: 'fast result' }
      };
      
      (aiClient.responses.parse as jest.Mock).mockResolvedValue(fastResponse);
      
      const schema = z.object({ result: z.string() });
      
      const result = await service.testCallAI('gpt-4', [], schema, 'fastOperation');
      
      expect(result).toEqual({ result: 'fast result' });
    });
  });

  describe('retry logic and exponential backoff', () => {
    beforeEach(() => {
      service = new TestAIService({ maxRetries: 2, backoffMultiplier: 2 });
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should implement exponential backoff', async () => {
      const { aiClient } = await import('@/lib/ai/aiClient');
      const retryableError = createAIError(AIErrorType.RATE_LIMIT, 'Rate limited', true);
      const successResponse = { output_parsed: { result: 'success' } };
      
      (aiClient.responses.parse as jest.Mock)
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(successResponse);
      
      const schema = z.object({ result: z.string() });
      const callPromise = service.testCallAI('gpt-4', [], schema, 'retryOperation');
      
      // Fast-forward through the delays
      jest.advanceTimersByTime(1000); // First retry delay
      jest.advanceTimersByTime(2000); // Second retry delay
      
      const result = await callPromise;
      
      expect(result).toEqual({ result: 'success' });
      expect(aiClient.responses.parse).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases and boundary conditions', () => {
    beforeEach(() => {
      service = new TestAIService();
    });

    it('should handle empty input arrays', async () => {
      const { aiClient } = await import('@/lib/ai/aiClient');
      const mockResponse = { output_parsed: { result: 'empty input handled' } };
      (aiClient.responses.parse as jest.Mock).mockResolvedValue(mockResponse);
      
      const schema = z.object({ result: z.string() });
      
      const result = await service.testCallAI('gpt-4', [], schema, 'emptyInput');
      
      expect(result).toEqual({ result: 'empty input handled' });
    });

    it('should handle null and undefined inputs gracefully', () => {
      const schema = z.string().nullable();
      
      expect(() => {
        service.testValidateInput(null, schema, 'nullTest');
      }).not.toThrow();
      
      expect(() => {
        service.testValidateInput(undefined, schema.optional(), 'undefinedTest');
      }).not.toThrow();
    });

    it('should handle very large input data', async () => {
      const { aiClient } = await import('@/lib/ai/aiClient');
      const largeInput = [
        { role: 'user', content: 'x'.repeat(100000) }
      ];
      const mockResponse = { output_parsed: { result: 'large input processed' } };
      (aiClient.responses.parse as jest.Mock).mockResolvedValue(mockResponse);
      
      const schema = z.object({ result: z.string() });
      
      const result = await service.testCallAI('gpt-4', largeInput, schema, 'largeInput');
      
      expect(result).toEqual({ result: 'large input processed' });
    });
  });
});