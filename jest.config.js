const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Use node environment for database tests, jsdom for frontend tests
  testEnvironment: 'node', 
  preset: 'ts-jest',
  
  // Optimized parallel testing - auto-detect CPU cores
  maxWorkers: process.env.CI ? 2 : 3, // Limit to 3 workers locally to prevent database connection issues
  
  // Enable caching for faster subsequent runs
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Test patterns - include all test directories
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.test.{js,jsx,ts,tsx}'
  ],

  // Environment detection based on test path
  testEnvironment: 'node', // Default for API and database tests
  projects: [
    {
      displayName: 'Database Tests',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/__tests__/api/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/__tests__/services/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/__tests__/utils/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/__tests__/integration/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/__tests__/security/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/__tests__/payments/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/__tests__/infrastructure/**/*.test.{js,jsx,ts,tsx}'
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      preset: 'ts-jest',
      // Database tests need same module resolution as main config
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@/lib/(.*)$': '<rootDir>/lib/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
        '^@lib/(.*)$': '<rootDir>/lib/$1',
        '^@app/(.*)$': '<rootDir>/app/$1',
        '^@components/(.*)$': '<rootDir>/app/components/$1',
        '^@utils/(.*)$': '<rootDir>/lib/utils/$1'
      }
    },
    {
      displayName: 'Frontend Tests', 
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/__tests__/components/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/__tests__/pages/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/__tests__/ui/**/*.test.{js,jsx,ts,tsx}'
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testEnvironmentOptions: {
        url: 'http://localhost:3900'
      },
      // Frontend tests need same module resolution plus CSS mocks
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@/lib/(.*)$': '<rootDir>/lib/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
        '^@lib/(.*)$': '<rootDir>/lib/$1',
        '^@app/(.*)$': '<rootDir>/app/$1',
        '^@components/(.*)$': '<rootDir>/app/components/$1',
        '^@utils/(.*)$': '<rootDir>/lib/utils/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
          isolatedModules: true,
          tsconfig: {
            jsx: 'react-jsx',
            module: 'commonjs',
            target: 'es2020'
          },
        }],
      },
    }
  ],
  
  // Skip tests in these patterns to speed up execution
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/'
  ],
  
  // Module resolution - fixed path aliases
  moduleNameMapper: {
    // Primary path aliases - match tsconfig.json exactly
    '^@/(.*)$': '<rootDir>/$1',
    // Specific lib aliases
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1', 
    // Legacy aliases for backward compatibility
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
    '^@components/(.*)$': '<rootDir>/app/components/$1',
    '^@utils/(.*)$': '<rootDir>/lib/utils/$1',
    // CSS and style mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
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
    url: 'http://localhost:3900',
    // Enable Web API polyfills in jsdom
    customExportConditions: ['node', 'node-addons'],
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
  
  // Handle ESM modules like @faker-js/faker, jose and other ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(@faker-js|uuid|@testing-library|jose)/)',
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Global setup for database and environment
  globalSetup: '<rootDir>/__tests__/setup/global.setup.js',
  globalTeardown: '<rootDir>/__tests__/setup/global.teardown.js',
  
  // Setup files - run before Jest setup
  setupFiles: [
    '<rootDir>/__tests__/setup/env.setup.js',
    '<rootDir>/__tests__/setup/polyfills.js'
  ],
  
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