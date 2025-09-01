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
  
  // Optimized parallel testing - auto-detect CPU cores
  maxWorkers: process.env.CI ? 2 : 3, // Limit to 3 workers locally to prevent database connection issues
  
  // Enable caching for faster subsequent runs
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Test patterns - exclude helper files
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.test.{js,jsx,ts,tsx}'
  ],
  
  // Skip tests in these patterns to speed up execution
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/'
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
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
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
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
  
  // Test timeout - increased for database operations
  testTimeout: process.env.CI ? 60000 : 30000,
  
  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Optimized transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
      useESM: true,
      isolatedModules: true, // Faster compilation
      tsconfig: {
        jsx: 'react-jsx',
        module: 'esnext',
        target: 'es2020'
      },
    }],
  },
  
  // Handle ESM modules like @faker-js/faker and other ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(@faker-js|uuid|@testing-library)/)',
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Global setup for database and environment
  globalSetup: '<rootDir>/__tests__/setup/global.setup.js',
  globalTeardown: '<rootDir>/__tests__/setup/global.teardown.js',
  
  // Setup files
  setupFiles: ['<rootDir>/__tests__/setup/env.setup.js'],
  
  // Reporters for CI/CD
  reporters: process.env.CI ? [
    'default',
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ] : ['default'],
  
  // Optimize module resolution
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Clear mocks between tests for better isolation
  clearMocks: true,
  restoreMocks: true,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)