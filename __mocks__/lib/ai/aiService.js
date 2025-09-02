// Mock for AIService - Global mock for all service tests
// This mock replaces the abstract AIService with a concrete implementation for testing

// Get the original module to preserve exports we don't want to mock
const originalModule = jest.requireActual('../../../lib/ai/aiService');

// Create a concrete mock class that can be extended
class MockAIService {
  constructor(config = {}) {
    this.config = {
      logPrefix: config.logPrefix || 'Mock',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4000,
      model: config.model || 'gpt-3.5-turbo',
      ...config
    };
    this.client = {};
    this.sessionId = config.sessionId || 'test-session-' + Math.random().toString(36).substring(7);
  }

  // Mock all the methods that AIService implementations use
  callAI = jest.fn();
  log = jest.fn();
  logInfo = jest.fn();
  logError = jest.fn();
  logWarning = jest.fn();
  createPrompt = jest.fn();
  formatResponse = jest.fn();
  
  // Mock protected methods that might be called by subclasses
  validateInput = jest.fn();
  processResponse = jest.fn();
  retryRequest = jest.fn();
}

// Export the mock with all original exports except AIService
module.exports = {
  ...originalModule,
  AIService: MockAIService,
};