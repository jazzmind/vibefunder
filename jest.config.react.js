const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// React-specific Jest configuration for component testing
const reactJestConfig = {
  displayName: 'React Components',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.react.js'],
  testEnvironment: 'jsdom',
  
  // Only test React components
  testMatch: [
    '<rootDir>/__tests__/components/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/components/**/*.test.{js,jsx,ts,tsx}'
  ],
  
  // Skip tests in these patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/__tests__/api/',
    '<rootDir>/__tests__/security/'
  ],
  
  // Module resolution for React components
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
    '!components/**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.config.{js,ts}',
  ],
  
  // Test timeout for React components
  testTimeout: 10000,
  
  // Handle modern JavaScript
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: ['next/babel'],
    }],
  },
  
  // Handle ESM modules
  transformIgnorePatterns: [
    'node_modules/(?!(@testing-library|@headlessui|@tiptap|lucide-react)/)',
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // JSDOM environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Faster testing
  maxWorkers: 2,
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest-react',
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config
module.exports = createJestConfig(reactJestConfig)