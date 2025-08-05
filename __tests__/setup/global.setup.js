// Global Jest setup for VibeFunder test suite
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Setting up VibeFunder test environment...');

  try {
    // Ensure test database exists
    await setupTestDatabase();
    
    // Generate Prisma client for tests
    await generatePrismaClient();
    
    // Load environment variables
    await loadTestEnvironment();
    
    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    process.exit(1);
  }
};

async function setupTestDatabase() {
  console.log('🗄️  Setting up test database...');
  
  try {
    // Ensure we're using the test database
    const testDatabaseUrl = process.env.TEST_DATABASE_URL;
    if (!testDatabaseUrl) {
      throw new Error('TEST_DATABASE_URL is not configured. Please set it in .env.local');
    }

    console.log('📋 Using test database:', testDatabaseUrl.split('@')[1]?.split('/')[0] || 'configured');

    // Push database schema without running migrations
    execSync('npx prisma db push --force-reset', {
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl
      }
    });
    
    console.log('✅ Test database schema updated');
  } catch (error) {
    console.warn('⚠️  Database setup failed (may not be available in CI):', error.message);
  }
}

async function generatePrismaClient() {
  console.log('🔧 Generating Prisma client...');
  
  try {
    execSync('npx prisma generate', {
      stdio: 'pipe'
    });
    
    console.log('✅ Prisma client generated');
  } catch (error) {
    console.error('❌ Failed to generate Prisma client:', error);
    throw error;
  }
}

async function loadTestEnvironment() {
  console.log('⚙️  Loading test environment...');
  
  // Set test-specific environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXTAUTH_SECRET = 'test-secret-for-vibefunder-testing';
  
  // Load .env.local if it exists
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf-8');
    
    // Extract key environment variables for testing
    const envVars = [
      'TEST_PORT',
      'OPENAI_API_KEY',
      'DATABASE_URL',
      'TEST_DATABASE_URL',
      'STRIPE_SECRET_KEY',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_REGION',
      'S3_BUCKET_NAME'
    ];
    
    envVars.forEach(key => {
      const match = envContent.match(new RegExp(`${key}=(.+)`));
      if (match && !process.env[key]) {
        process.env[key] = match[1];
      }
    });
  }
  
  // Log configuration (without sensitive values)
  console.log('🔧 Test Configuration:');
  console.log(`   - Node Environment: ${process.env.NODE_ENV}`);
  console.log(`   - Test Port: ${process.env.TEST_PORT || '3101'}`);
  console.log(`   - OpenAI API: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`   - Database: ${process.env.TEST_DATABASE_URL ? 'Test DB' : 'Default DB'}`);
  console.log(`   - Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`   - AWS S3: ${process.env.AWS_ACCESS_KEY_ID ? 'Configured' : 'Not configured'}`);
  
  console.log('✅ Environment loaded');
}