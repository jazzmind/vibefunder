// Environment setup for VibeFunder tests
// This file runs before each test file

// Critical environment variables for testing
const requiredEnvVars = [
  'NEXTAUTH_SECRET'
];

const optionalEnvVars = [
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY', 
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'DATABASE_URL'
];

// Set default test values for required variables
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = 'test-secret-for-vibefunder-testing';
}

// Validate critical environment variables
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

// Warn about missing optional variables that might affect tests
optionalEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Optional environment variable ${envVar} not set - some tests may be skipped`);
  }
});

// Test-specific environment setup
process.env.NODE_ENV = 'test';
process.env.API_TEST_URL = process.env.API_TEST_URL || `http://localhost:${process.env.TEST_PORT || 3101}`;

console.log('✅ Environment setup complete for VibeFunder tests');