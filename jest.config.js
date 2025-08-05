const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  preset: 'ts-jest',
  
  // Enable parallel testing
  maxWorkers: 4, // Use 3-4 workers as requested
  
  // Test patterns
  testMatch: [
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.test.{js,jsx,ts,tsx}'
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'lib/**/*.{js,ts}',
    'app/**/*.{js,ts,tsx}',
    '!app/**/layout.{js,ts,tsx}',
    '!app/**/loading.{js,ts,tsx}',
    '!app/**/not-found.{js,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  
  // Test environment setup
  testEnvironmentOptions: {
    url: 'http://localhost:3900'
  },
  
  // Timeout for tests (especially important for AI tests)
  testTimeout: 30000,
  
  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  
  // Global setup for database and environment
  globalSetup: '<rootDir>/__tests__/setup/global.setup.js',
  globalTeardown: '<rootDir>/__tests__/setup/global.teardown.js',
  
  // Setup files
  setupFiles: ['<rootDir>/__tests__/setup/env.setup.js'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)