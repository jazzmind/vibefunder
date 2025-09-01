#!/usr/bin/env node

/**
 * Payment Test Runner
 * 
 * Comprehensive test runner for VibeFunder's payment system tests.
 * Supports running different test suites with various configurations.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configurations
const TEST_SUITES = {
  all: {
    name: 'All Payment Tests',
    pattern: '__tests__/payments/**/*.test.ts',
    description: 'Run all payment-related tests'
  },
  integration: {
    name: 'Stripe Integration Tests',
    pattern: '__tests__/payments/stripe-integration.test.ts',
    description: 'Core Stripe payment integration tests'
  },
  security: {
    name: 'Payment Security Tests',
    pattern: '__tests__/payments/payment-security.test.ts',
    description: 'Security-focused payment tests'
  },
  performance: {
    name: 'Payment Performance Tests',
    pattern: '__tests__/payments/payment-performance.test.ts',
    description: 'Performance and load testing for payments'
  }
};

// Test environments
const ENVIRONMENTS = {
  unit: {
    name: 'Unit Test Environment',
    env: {
      NODE_ENV: 'test',
      STRIPE_SECRET_KEY: 'sk_test_mock',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_mock',
      STRIPE_CURRENCY: 'usd',
      STRIPE_PRICE_DOLLARS: '2000000',
      STRIPE_APPLICATION_FEE_BPS: '500',
      STRIPE_DESTINATION_ACCOUNT_ID: 'acct_test_mock'
    }
  },
  integration: {
    name: 'Integration Test Environment',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      STRIPE_SECRET_KEY: process.env.STRIPE_TEST_SECRET_KEY || 'sk_test_mock',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_TEST_WEBHOOK_SECRET || 'whsec_test_mock',
      STRIPE_CURRENCY: 'usd',
      STRIPE_PRICE_DOLLARS: '2000000',
      STRIPE_APPLICATION_FEE_BPS: '500',
      STRIPE_DESTINATION_ACCOUNT_ID: process.env.STRIPE_TEST_DESTINATION_ACCOUNT || 'acct_test_mock'
    }
  }
};

// CLI options
const OPTIONS = {
  suite: process.argv.find(arg => arg.startsWith('--suite='))?.split('=')[1] || 'all',
  environment: process.argv.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'unit',
  watch: process.argv.includes('--watch'),
  coverage: process.argv.includes('--coverage'),
  verbose: process.argv.includes('--verbose'),
  bail: process.argv.includes('--bail'),
  parallel: process.argv.includes('--parallel'),
  updateSnapshots: process.argv.includes('--update-snapshots'),
  help: process.argv.includes('--help') || process.argv.includes('-h')
};

function printHelp() {
  console.log(`
Payment Test Runner - VibeFunder

USAGE:
  node run-payment-tests.js [options]

OPTIONS:
  --suite=<suite>        Test suite to run (${Object.keys(TEST_SUITES).join(', ')})
  --env=<environment>    Test environment (${Object.keys(ENVIRONMENTS).join(', ')})
  --watch               Run tests in watch mode
  --coverage            Generate coverage report
  --verbose             Verbose output
  --bail                Stop on first test failure
  --parallel            Run tests in parallel
  --update-snapshots    Update Jest snapshots
  --help, -h            Show this help message

TEST SUITES:
${Object.entries(TEST_SUITES).map(([key, suite]) => 
  `  ${key.padEnd(12)} - ${suite.description}`
).join('\n')}

ENVIRONMENTS:
${Object.entries(ENVIRONMENTS).map(([key, env]) => 
  `  ${key.padEnd(12)} - ${env.name}`
).join('\n')}

EXAMPLES:
  # Run all payment tests
  node run-payment-tests.js

  # Run security tests with coverage
  node run-payment-tests.js --suite=security --coverage

  # Run integration tests in watch mode
  node run-payment-tests.js --suite=integration --watch

  # Run performance tests with verbose output
  node run-payment-tests.js --suite=performance --verbose
`);
}

function validateOptions() {
  if (OPTIONS.help) {
    printHelp();
    process.exit(0);
  }

  if (!TEST_SUITES[OPTIONS.suite]) {
    console.error(`❌ Invalid test suite: ${OPTIONS.suite}`);
    console.error(`Available suites: ${Object.keys(TEST_SUITES).join(', ')}`);
    process.exit(1);
  }

  if (!ENVIRONMENTS[OPTIONS.environment]) {
    console.error(`❌ Invalid environment: ${OPTIONS.environment}`);
    console.error(`Available environments: ${Object.keys(ENVIRONMENTS).join(', ')}`);
    process.exit(1);
  }
}

function setupEnvironment() {
  const environment = ENVIRONMENTS[OPTIONS.environment];
  
  // Set environment variables
  Object.entries(environment.env).forEach(([key, value]) => {
    process.env[key] = value;
  });

  console.log(`🌍 Environment: ${environment.name}`);
  
  // Ensure test database is clean for integration tests
  if (OPTIONS.environment === 'integration') {
    const testDbPath = './test.db';
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
      console.log('🗑️  Cleaned test database');
    }
  }
}

function buildJestCommand() {
  const suite = TEST_SUITES[OPTIONS.suite];
  const jestArgs = [];

  // Test pattern
  jestArgs.push(suite.pattern);

  // Jest options
  if (OPTIONS.watch) jestArgs.push('--watch');
  if (OPTIONS.coverage) jestArgs.push('--coverage');
  if (OPTIONS.verbose) jestArgs.push('--verbose');
  if (OPTIONS.bail) jestArgs.push('--bail');
  if (OPTIONS.updateSnapshots) jestArgs.push('--updateSnapshot');

  // Parallel execution
  if (OPTIONS.parallel) {
    jestArgs.push('--maxWorkers=4');
  } else {
    jestArgs.push('--runInBand'); // Sequential execution for more predictable results
  }

  // Test environment specific options
  if (OPTIONS.environment === 'integration') {
    jestArgs.push('--testTimeout=30000'); // Longer timeout for integration tests
  }

  // Coverage options
  if (OPTIONS.coverage) {
    jestArgs.push('--collectCoverageFrom=app/api/payments/**/*.ts');
    jestArgs.push('--collectCoverageFrom=lib/stripe.ts');
    jestArgs.push('--coverageReporters=text');
    jestArgs.push('--coverageReporters=lcov');
    jestArgs.push('--coverageThreshold={"global":{"branches":80,"functions":80,"lines":80,"statements":80}}');
  }

  return `npx jest ${jestArgs.join(' ')}`;
}

function runTests() {
  const suite = TEST_SUITES[OPTIONS.suite];
  console.log(`🧪 Running: ${suite.name}`);
  console.log(`📋 Description: ${suite.description}`);
  console.log('');

  const jestCommand = buildJestCommand();
  
  if (OPTIONS.verbose) {
    console.log(`🔧 Command: ${jestCommand}`);
    console.log('');
  }

  try {
    execSync(jestCommand, { 
      stdio: 'inherit', 
      cwd: process.cwd(),
      env: process.env
    });
    
    console.log('');
    console.log('✅ All tests passed!');
    
    if (OPTIONS.coverage) {
      console.log('📊 Coverage report generated in ./coverage/');
    }
    
  } catch (error) {
    console.log('');
    console.error('❌ Tests failed!');
    process.exit(error.status || 1);
  }
}

function checkDependencies() {
  const requiredFiles = [
    '__tests__/payments/stripe-integration.test.ts',
    '__tests__/payments/payment-security.test.ts',
    '__tests__/payments/payment-performance.test.ts',
    '__tests__/payments/payment-test-helpers.ts'
  ];

  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required test files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    console.error('');
    console.error('Please ensure all payment test files are in place.');
    process.exit(1);
  }
}

function printTestSummary() {
  console.log('🚀 VibeFunder Payment Test Runner');
  console.log('==================================');
  console.log('');
  console.log('Available Test Suites:');
  
  Object.entries(TEST_SUITES).forEach(([key, suite]) => {
    const status = key === OPTIONS.suite ? '▶️ ' : '   ';
    console.log(`${status}${key.padEnd(12)} - ${suite.description}`);
  });
  
  console.log('');
}

// Main execution
function main() {
  try {
    validateOptions();
    printTestSummary();
    checkDependencies();
    setupEnvironment();
    runTests();
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    process.exit(1);
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\\n🛑 Tests interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n🛑 Tests terminated');
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  TEST_SUITES,
  ENVIRONMENTS,
  buildJestCommand,
  setupEnvironment
};