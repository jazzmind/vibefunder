const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Component testing configuration
const componentJestConfig = {
  // Use jsdom for React component testing
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test patterns - only run component tests
  testMatch: [
    '<rootDir>/__tests__/components/**/*.test.{js,jsx,ts,tsx}',
  ],
  
  // Skip tests in these patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/__tests__/api/',
    '<rootDir>/__tests__/integration/',
    '<rootDir>/__tests__/unit/',
    '<rootDir>/__tests__/security/',
    '<rootDir>/__tests__/auth/',
    '<rootDir>/__tests__/payments/',
    '<rootDir>/__tests__/ai/',
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@utils/(.*)$': '<rootDir>/lib/utils/$1',
    // Mock CSS imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  
  // Coverage configuration for components
  collectCoverageFrom: [
    'components/**/*.{js,ts,tsx}',
    'app/**/*.{js,ts,tsx}',
    '!app/**/layout.{js,ts,tsx}',
    '!app/**/loading.{js,ts,tsx}',
    '!app/**/not-found.{js,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.config.{js,ts}',
    '!**/coverage/**',
  ],
  
  // Coverage thresholds for components
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html'
  ],
  
  // Test environment setup
  testEnvironmentOptions: {
    url: 'http://localhost:3900'
  },

  // Setup files for component testing
  setupFiles: ['<rootDir>/__tests__/setup/components.setup.js'],
  
  // Test timeout
  testTimeout: 10000,
  
  // Transform configuration for React
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
      ],
    }],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Skip global setup/teardown for component tests
  globalSetup: undefined,
  globalTeardown: undefined,
  setupFiles: undefined,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(componentJestConfig)