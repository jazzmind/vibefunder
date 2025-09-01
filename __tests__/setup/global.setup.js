// Global Jest setup for VibeFunder test suite
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Global state for setup
let setupComplete = false;
let setupError = null;

module.exports = async () => {
  console.log('🚀 Setting up VibeFunder test environment...');

  try {
    // Load environment variables first
    await loadTestEnvironment();
    
    // Ensure test database exists
    await setupTestDatabase();
    
    // Generate Prisma client for tests
    await generatePrismaClient();
    
    // Initialize global database connection
    await initializeGlobalConnection();
    
    setupComplete = true;
    console.log('✅ Test environment setup complete');
  } catch (error) {
    setupError = error;
    console.error('❌ Failed to setup test environment:', error);
    process.exit(1);
  }
};

async function loadTestEnvironment() {
  console.log('⚙️  Loading test environment...');
  
  // Load environment files in priority order
  const envFiles = [
    path.join(process.cwd(), '.env.test.local'),
    path.join(process.cwd(), '.env.local'),  
    path.join(process.cwd(), '.env.test'),
    path.join(process.cwd(), '.env')
  ];
  
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      const result = dotenv.config({ path: envFile, override: false });
      if (!result.error) {
        console.log(`   ✓ Loaded: ${path.basename(envFile)}`);
      }
    }
  }
  
  // Set test-specific environment variables
  process.env.NODE_ENV = 'test';
  
  // Set default test secrets if not provided
  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = 'test-secret-for-vibefunder-testing-only';
  }
  
  // Ensure TEST_DATABASE_URL takes precedence
  if (process.env.TEST_DATABASE_URL) {
    // Store the original DATABASE_URL for potential restoration
    if (process.env.DATABASE_URL && process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
      process.env.ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;
    }
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    console.log('🔄 Using TEST_DATABASE_URL for all database operations');
  } else {
    console.warn('⚠️  TEST_DATABASE_URL not configured. Tests may interfere with development database.');
  }
  
  // Set default test port
  if (!process.env.TEST_PORT) {
    process.env.TEST_PORT = '3101';
  }
  
  // Log configuration (without sensitive values)
  console.log('🔧 Test Configuration:');
  console.log(`   - Node Environment: ${process.env.NODE_ENV}`);
  console.log(`   - Test Port: ${process.env.TEST_PORT}`);
  console.log(`   - OpenAI API: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`   - Database URL: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
  console.log(`   - Test Database URL: ${process.env.TEST_DATABASE_URL ? 'Configured' : 'Not configured'}`);
  console.log(`   - Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`   - AWS S3: ${process.env.AWS_ACCESS_KEY_ID ? 'Configured' : 'Not configured'}`);
  
  console.log('✅ Environment loaded');
}

async function setupTestDatabase() {
  console.log('🗄️  Setting up test database...');
  
  try {
    // Ensure we're using the test database
    const testDatabaseUrl = process.env.TEST_DATABASE_URL;
    if (!testDatabaseUrl) {
      console.warn('⚠️  TEST_DATABASE_URL not configured, skipping database setup');
      return;
    }

    console.log('📋 Using test database:', testDatabaseUrl.split('@')[1]?.split('/')[0] || 'configured');

    // Set DATABASE_URL to TEST_DATABASE_URL for schema operations
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = testDatabaseUrl;

    try {
      // Check if database schema exists first
      const { PrismaClient } = require('@prisma/client');
      const tempClient = new PrismaClient({ 
        datasources: { db: { url: testDatabaseUrl } },
        log: ['error']
      });
      
      try {
        await tempClient.$connect();
        // Try a simple query to check if schema exists
        await tempClient.$queryRaw`SELECT 1`;
        console.log('✅ Test database schema already exists and is accessible');
      } catch (error) {
        // Schema doesn't exist or needs to be updated
        console.log('🔧 Setting up test database schema...');
        execSync('npx prisma db push --skip-generate', {
          stdio: 'pipe',
          env: {
            ...process.env,
            DATABASE_URL: testDatabaseUrl
          }
        });
        console.log('✅ Test database schema created/updated');
      } finally {
        await tempClient.$disconnect();
      }
    } finally {
      // Restore original URL
      if (originalUrl) {
        process.env.DATABASE_URL = originalUrl;
      }
    }
  } catch (error) {
    console.warn('⚠️  Database setup failed (may not be available in CI):', error.message);
    // Don't fail setup for database issues in CI environments
  }
}

async function generatePrismaClient() {
  console.log('🔧 Generating Prisma client...');
  
  try {
    // Check if client already exists
    const prismaClientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
    if (fs.existsSync(prismaClientPath)) {
      console.log('   Prisma client already exists');
      return;
    }
    
    execSync('npx prisma generate', {
      stdio: 'pipe'
    });
    
    console.log('✅ Prisma client generated');
  } catch (error) {
    console.error('❌ Failed to generate Prisma client:', error);
    throw error;
  }
}

async function initializeGlobalConnection() {
  console.log('🔌 Initializing global database connection...');
  
  try {
    // Only initialize if we have a database URL
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  No database URL configured - skipping global connection');
      return;
    }
    
    const { PrismaClient } = require('@prisma/client');
    
    // Create test-specific Prisma client with optimized settings
    global.testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL // This will be TEST_DATABASE_URL if set above
        }
      },
      log: process.env.DEBUG_TESTS ? ['query', 'info', 'warn', 'error'] : ['error'],
      // Optimize for test environment
      __internal: {
        engine: {
          connectTimeout: 10000,
          requestTimeout: 20000,
        },
      },
    });
    
    // Test connection with timeout
    const connectTimeout = setTimeout(() => {
      console.warn('⚠️  Database connection taking longer than expected...');
    }, 5000);
    
    try {
      await global.testPrisma.$connect();
      await global.testPrisma.$queryRaw`SELECT 1`; // Simple health check
      clearTimeout(connectTimeout);
    } catch (error) {
      clearTimeout(connectTimeout);
      throw error;
    }
    
    // Store cleanup function for teardown
    global.cleanupTestPrisma = async () => {
      if (global.testPrisma) {
        try {
          await global.testPrisma.$disconnect();
        } catch (error) {
          console.warn('⚠️  Error during global Prisma disconnect:', error.message);
        } finally {
          global.testPrisma = null;
        }
      }
    };
    
    console.log('✅ Global database connection initialized');
  } catch (error) {
    console.warn('⚠️  Failed to initialize global connection:', error.message);
    // Clean up any partial initialization
    if (global.testPrisma) {
      try {
        await global.testPrisma.$disconnect();
      } catch {
        // Ignore cleanup errors
      }
      global.testPrisma = null;
    }
    // Don't fail setup - individual tests can create their own connections
  }
}