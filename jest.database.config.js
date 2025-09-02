const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Database-specific Jest configuration
const databaseJestConfig = {
  displayName: 'Database Tests',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  preset: 'ts-jest',
  
  // Test patterns for database tests only - include all service tests
  testMatch: [
    '<rootDir>/__tests__/api/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/services/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/utils/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/integration/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/security/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/payments/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/infrastructure/**/*.test.{js,jsx,ts,tsx}'
  ],
  
  // Skip ONLY build artifacts and dependencies - DO NOT exclude test directories
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/'
  ],
  
  // Module resolution - comprehensive path alias mapping
  moduleNameMapper: {
    // Primary path aliases - match tsconfig.json exactly 
    '^@/(.*)$': '<rootDir>/$1',
    // Specific path mappings for common import patterns
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/components/(.*)$': '<rootDir>/app/components/$1',
    '^@/utils/(.*)$': '<rootDir>/lib/utils/$1',
    // Legacy aliases for backward compatibility
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
    '^@components/(.*)$': '<rootDir>/app/components/$1',
    '^@utils/(.*)$': '<rootDir>/lib/utils/$1',
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
    '!**/*.config.{js,ts}',
    '!**/coverage/**',
  ],
  
  // Test timeout - increased for database operations
  testTimeout: process.env.CI ? 60000 : 30000,
  
  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Optimized transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
      useESM: true,
      isolatedModules: true,
      tsconfig: {
        jsx: 'react-jsx',
        module: 'esnext',
        target: 'es2020'
      },
    }],
  },
  
  // Handle ESM modules like @faker-js/faker, jose and other ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(@faker-js|uuid|@testing-library|jose)/)',
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Global setup for database and environment
  globalSetup: '<rootDir>/__tests__/setup/global.setup.js',
  globalTeardown: '<rootDir>/__tests__/setup/global.teardown.js',
  
  // Setup files
  setupFiles: ['<rootDir>/__tests__/setup/env.setup.js'],
  
  // Optimize module resolution
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Clear mocks between tests for better isolation
  clearMocks: true,
  restoreMocks: true,
  
  // Force Node.js environment
  testEnvironmentOptions: {
    // Force use of Node.js Prisma client
    NODE_ENV: 'test'
  }
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(databaseJestConfig)