/**
 * Jest Configuration for Integration Tests
 * Optimized for integration test performance and reliability
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Integration test specific settings
  testMatch: [
    '<rootDir>/__tests__/integration/**/*.test.{js,jsx,ts,tsx}',
  ],
  
  // Longer timeout for integration tests
  testTimeout: 60000, // 1 minute per test
  
  // Run tests serially to avoid database conflicts
  maxWorkers: 1,
  
  // Disable parallelism for integration tests
  maxConcurrency: 1,
  
  // Integration test specific setup
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/__tests__/setup/integration.setup.js',
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/__tests__/setup/integration.setup.js',
  globalTeardown: '<rootDir>/__tests__/setup/integration.setup.js',
  
  // Coverage settings for integration tests
  collectCoverageFrom: [
    'app/api/**/*.{js,ts}',
    'lib/**/*.{js,ts}',
    '!**/*.test.{js,ts}',
    '!**/*.spec.{js,ts}',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/coverage/**',
  ],
  
  // Coverage thresholds (more lenient for integration tests)
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 65,
      lines: 65,
      statements: 65,
    },
  },
  
  // Test environment
  testEnvironment: 'node',
  
  // Module name mapping for integration tests
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@mocks/(.*)$': '<rootDir>/__tests__/mocks/$1',
    '^@factories/(.*)$': '<rootDir>/__tests__/utils/factories',
  },
  
  // Verbose output for debugging
  verbose: true,
  
  // Display individual test results
  silent: false,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Reporters for integration tests
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './coverage/integration',
      outputName: 'integration-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true,
    }],
  ],
  
  // Transform ignore patterns (same as base)
  transformIgnorePatterns: baseConfig.transformIgnorePatterns,
};
