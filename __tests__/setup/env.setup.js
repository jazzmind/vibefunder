// Environment setup for VibeFunder tests
// This file runs before each test file

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env.local and .env files if they exist (in order)
const envFiles = [
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), '.env.test'),
  path.join(process.cwd(), '.env')
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    console.log(`Loading environment from: ${path.basename(envFile)}`);
    dotenv.config({ path: envFile, override: false }); // Don't override already set vars
  }
}

// Critical environment variables for testing
const requiredEnvVars = [
  'NEXTAUTH_SECRET'
];

const optionalEnvVars = [
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY', 
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'DATABASE_URL',
  'TEST_DATABASE_URL'
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

// Ensure TEST_DATABASE_URL is used for tests
if (process.env.TEST_DATABASE_URL) {
  console.log('🔄 Overriding DATABASE_URL with TEST_DATABASE_URL');
  console.log(`   Original DATABASE_URL: ${process.env.DATABASE_URL ? 'configured' : 'not set'}`);
  console.log(`   Test DATABASE_URL: ${process.env.TEST_DATABASE_URL.split('@')[1]?.split('/')[0] || 'configured'}`);
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else {
  console.warn('⚠️  TEST_DATABASE_URL not configured - tests will use production database!');
  if (!process.env.DATABASE_URL) {
    throw new Error('Neither DATABASE_URL nor TEST_DATABASE_URL is configured');
  }
}

console.log('✅ Environment setup complete for VibeFunder tests');