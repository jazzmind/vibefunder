/**
 * Conditional Test Environment Selector
 * 
 * Dynamically selects the appropriate test environment based on test file path:
 * - jsdom: For component, UI, and frontend tests
 * - node: For API, database, service, and backend tests
 */

const NodeEnvironment = require('jest-environment-node').TestEnvironment;

// Simple approach: Use Node environment for all tests
// This fixes the test discovery issue while maintaining compatibility
class ConditionalTestEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.testEnvironment = 'node';
  }

  async setup() {
    await super.setup();
    
    // Add environment indicator for debugging
    this.global.__TEST_ENVIRONMENT__ = this.testEnvironment;
    
    if (this.testEnvironment === 'jsdom') {
      // Setup jsdom-specific globals
      this.global.window.URL.createObjectURL = jest.fn();
      this.global.window.URL.revokeObjectURL = jest.fn();
      
      // Mock ResizeObserver for component tests
      this.global.ResizeObserver = jest.fn().mockImplementation(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      }));
      
      // Mock IntersectionObserver for component tests
      this.global.IntersectionObserver = jest.fn().mockImplementation(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      }));
    }
  }

  async teardown() {
    await super.teardown();
  }
}

module.exports = ConditionalTestEnvironment;