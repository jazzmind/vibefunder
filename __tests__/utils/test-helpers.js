/**
 * Test Helpers for VibeFunder Test Suite
 * Provides database cleanup, utilities, and proper connection management for testing
 */

const { PrismaClient } = require('@prisma/client');

// Connection pool management
const connections = new Map();
let globalClient = null;

/**
 * Get or create Prisma client for testing with proper connection management
 * @param {object} options - Client options
 * @returns {PrismaClient} Prisma client instance
 */
function getPrismaClient(options = {}) {
  // Use global test client if available and no specific options
  if (!options.url && global.testPrisma && Object.keys(options).length === 0) {
    return global.testPrisma;
  }

  // Create connection key for pooling
  const connectionKey = options.url || process.env.DATABASE_URL || process.env.TEST_DATABASE_URL || 'default';
  
  if (!connectionKey || !connectionKey.startsWith('postgresql://')) {
    throw new Error(`Invalid database URL format. Expected postgresql://, got: ${connectionKey?.split('://')[0] || 'undefined'}`);
  }

  // Reuse existing connection if available
  if (connections.has(connectionKey)) {
    return connections.get(connectionKey);
  }

  // Create new client
  const client = new PrismaClient({
    datasources: {
      db: {
        url: connectionKey,
      },
    },
    log: process.env.NODE_ENV === 'test' && process.env.DEBUG_DB ? ['query', 'error'] : ['error'],
    // Optimize connection pool for tests
    __internal: {
      engine: {
        connectTimeout: 10000,
        requestTimeout: 20000,
        maxConnections: 3, // Limit connections for tests
      },
    },
    ...options
  });

  // Store in connection pool
  connections.set(connectionKey, client);
  
  return client;
}

/**
 * Close all database connections and clean up connection pool
 */
async function closeAllConnections() {
  console.log('🔌 Closing all database connections...');
  
  const closePromises = [];
  
  // Close pooled connections
  for (const [key, client] of connections.entries()) {
    closePromises.push(
      client.$disconnect().catch(error => 
        console.warn(`⚠️  Error closing connection ${key}:`, error.message)
      )
    );
  }
  
  // Wait for all connections to close
  await Promise.all(closePromises);
  connections.clear();
  
  // Clean up global client if it exists
  if (globalClient && globalClient !== global.testPrisma) {
    await globalClient.$disconnect().catch(() => {});
    globalClient = null;
  }
  
  console.log('✅ All database connections closed');
}

/**
 * Execute database operations within a transaction
 * @param {Function} operation - Function to execute within transaction
 * @param {object} options - Transaction options
 */
async function withTransaction(operation, options = {}) {
  const client = getPrismaClient();
  
  return await client.$transaction(async (tx) => {
    return await operation(tx);
  }, {
    timeout: 30000, // 30 second timeout
    ...options
  });
}

/**
 * Clean up all test data from database with transaction safety
 */
async function cleanupAllTestData() {
  console.log('🧹 Cleaning up ALL test data (global teardown)...');
  
  const client = getPrismaClient();
  if (!client) {
    console.log('⚠️  No database client available for cleanup');
    return;
  }

  try {
    await withTransaction(async (tx) => {
      // Delete test data in dependency order (child tables first)
      const cleanupOperations = [
        () => tx.campaignUpdate.deleteMany({
          where: {
            OR: [
              { campaign: { title: { contains: 'test' } } },
              { campaign: { title: { contains: 'Test' } } },
              { campaign: { description: { contains: 'test' } } },
            ]
          }
        }),
        
        () => tx.donation.deleteMany({
          where: {
            OR: [
              { campaign: { title: { contains: 'test' } } },
              { campaign: { title: { contains: 'Test' } } },
              { donorEmail: { contains: 'test' } },
              { donorEmail: { contains: '@example.com' } },
            ]
          }
        }),
        
        () => tx.campaign.deleteMany({
          where: {
            OR: [
              { title: { contains: 'test' } },
              { title: { contains: 'Test' } },
              { description: { contains: 'test' } },
              { creatorEmail: { contains: 'test' } },
              { creatorEmail: { contains: '@example.com' } },
            ]
          }
        }),
        
        () => tx.user.deleteMany({
          where: {
            OR: [
              { email: { contains: 'test' } },
              { email: { contains: '@example.com' } },
              { name: { contains: 'test' } },
              { name: { contains: 'Test' } },
            ]
          }
        }),
      ];

      // Execute cleanup operations in sequence
      for (const operation of cleanupOperations) {
        try {
          await operation();
        } catch (error) {
          console.warn('⚠️  Cleanup operation failed:', error.message);
          // Continue with other operations
        }
      }
    });

    console.log('✅ All test data cleaned up');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error.message);
    // Don't throw - cleanup failures shouldn't fail the test suite
  }
}

/**
 * Clean up specific test data by pattern with transaction safety
 * @param {Array} patterns - Array of cleanup patterns
 */
async function cleanupTestData(patterns = []) {
  if (patterns.length === 0) return;
  
  const client = getPrismaClient();
  if (!client) {
    console.log('⚠️  No database client available for cleanup');
    return;
  }

  try {
    await withTransaction(async (tx) => {
      for (const pattern of patterns) {
        if (pattern.table && pattern.where) {
          try {
            await tx[pattern.table].deleteMany({
              where: pattern.where
            });
          } catch (error) {
            console.warn(`⚠️  Failed to cleanup ${pattern.table}:`, error.message);
          }
        }
      }
    });
    
    console.log(`✅ Cleaned up ${patterns.length} test data patterns`);
  } catch (error) {
    console.error('❌ Error in selective cleanup:', error.message);
  }
}

/**
 * Create test user data with error handling
 * @param {object} userData - User data to create
 * @returns {object} Created user
 */
async function createTestUser(userData = {}) {
  const client = getPrismaClient();
  if (!client) {
    throw new Error('Database client not available');
  }

  const defaultUser = {
    email: `test-user-${Date.now()}@example.com`,
    name: 'Test User',
    ...userData
  };

  try {
    const user = await client.user.create({
      data: defaultUser
    });
    return user;
  } catch (error) {
    // Re-throw the error to let tests handle it
    throw error;
  }
}

/**
 * Create test campaign data with error handling
 * @param {object} campaignData - Campaign data to create
 * @param {string} userId - User ID for campaign creator
 * @returns {object} Created campaign
 */
async function createTestCampaign(campaignData = {}, userId = null) {
  const client = getPrismaClient();
  if (!client) {
    throw new Error('Database client not available');
  }

  // Only create a user if neither userId nor makerId is provided in campaignData
  let creatorId = userId || campaignData.makerId;
  if (!creatorId) {
    const testUser = await createTestUser();
    creatorId = testUser.id;
  }

  const defaultCampaign = {
    title: `Test Campaign ${Date.now()}`,
    summary: `Test summary ${Date.now()}`,
    description: 'This is a test campaign',
    fundingGoalDollars: 10000,
    makerId: creatorId,
    status: 'ACTIVE',
    ...campaignData
  };

  try {
    const campaign = await client.campaign.create({
      data: defaultCampaign,
      include: {
        maker: true
      }
    });
    return campaign;
  } catch (error) {
    console.error('Error creating test campaign:', error);
    throw error;
  }
}

/**
 * Wait for database connection to be ready
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} retryDelay - Delay between retries in milliseconds
 * @returns {boolean} Whether database is ready
 */
async function waitForDatabase(maxRetries = 10, retryDelay = 1000) {
  const client = getPrismaClient();
  if (!client) {
    console.log('⚠️  No database client available for health check');
    return false;
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      await client.$queryRaw`SELECT 1`;
      console.log('✅ Database connection ready');
      return true;
    } catch (error) {
      console.log(`🔄 Waiting for database... attempt ${i + 1}/${maxRetries}`);
      if (i === maxRetries - 1) {
        console.error('❌ Database not available after max retries:', error.message);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return false;
}

/**
 * Check if we're in a database testing context
 * @returns {boolean} Whether database is available
 */
function isDatabaseAvailable() {
  return !!(process.env.DATABASE_URL || process.env.TEST_DATABASE_URL);
}

/**
 * Get database connection info for debugging (without sensitive data)
 * @returns {string} Database connection info
 */
function getDatabaseInfo() {
  const url = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL || '';
  if (!url) return 'Not configured';
  
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.username}:***@${parsedUrl.host}${parsedUrl.pathname}`;
  } catch {
    return 'Invalid URL format';
  }
}

/**
 * Setup function for individual test files
 * Should be called in beforeAll hooks
 */
async function setupTestEnvironment() {
  // Ensure we have a database connection
  if (!isDatabaseAvailable()) {
    throw new Error('Database not available for testing');
  }
  
  // Wait for database to be ready
  const isReady = await waitForDatabase();
  if (!isReady) {
    throw new Error('Database not ready for testing');
  }
  
  return true;
}

/**
 * Teardown function for individual test files
 * Should be called in afterAll hooks
 * @param {Array} testPatterns - Specific patterns to clean up
 */
async function teardownTestEnvironment(testPatterns = []) {
  try {
    // Clean up specific test data if patterns provided
    if (testPatterns.length > 0) {
      await cleanupTestData(testPatterns);
    }
    
    // Note: Don't close global connections here - let global teardown handle that
  } catch (error) {
    console.warn('⚠️  Error during test environment teardown:', error.message);
  }
}

/**
 * Test isolation helper - run test with isolated data
 * @param {Function} testFn - Test function to run
 * @param {object} options - Isolation options
 */
async function withIsolatedTest(testFn, options = {}) {
  const { cleanup = true, transaction = false } = options;
  
  if (transaction) {
    return await withTransaction(async (tx) => {
      return await testFn(tx);
    });
  }
  
  let testResult;
  const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    testResult = await testFn(testId);
  } finally {
    if (cleanup) {
      // Clean up any data created during this test
      await cleanupTestData([
        {
          table: 'campaign',
          where: {
            OR: [
              { title: { contains: testId } },
              { description: { contains: testId } }
            ]
          }
        },
        {
          table: 'user',
          where: {
            OR: [
              { email: { contains: testId } },
              { name: { contains: testId } }
            ]
          }
        }
      ]);
    }
  }
  
  return testResult;
}

/**
 * Generate a unique test email address
 * @param {string} prefix - Prefix for the email
 * @returns {string} Unique test email
 */
function generateTestEmail(prefix = 'test') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

/**
 * Generate a random OTP code
 * @returns {string} 6-digit OTP code
 */
function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate mock Stripe customer data
 * @param {object} overrides - Override default values
 * @returns {object} Mock Stripe customer
 */
function generateMockStripeCustomer(overrides = {}) {
  return {
    id: `cus_${Math.random().toString(36).substring(2, 15)}`,
    email: generateTestEmail('stripe'),
    name: 'Test Customer',
    created: Math.floor(Date.now() / 1000),
    ...overrides
  };
}

/**
 * Generate mock payment session
 * @param {object} overrides - Override default values
 * @returns {object} Mock payment session
 */
function generateMockPaymentSession(overrides = {}) {
  return {
    id: `cs_test_${Math.random().toString(36).substring(2, 15)}`,
    payment_status: 'unpaid',
    status: 'open',
    amount_total: 10000,
    currency: 'usd',
    ...overrides
  };
}

/**
 * Create authentication headers for test requests
 * @param {object} user - User object
 * @returns {object} Headers object with authentication
 */
function createAuthHeaders(user = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (user) {
    // Add test user authentication header
    headers['x-test-user-id'] = user.id || 'test-user-id';
    headers['x-test-user-email'] = user.email || 'test@example.com';
  }
  
  return headers;
}

/**
 * Create a test organization
 * @param {Object} orgData - Organization data
 * @returns {Promise<Object>} - Created organization
 */
async function createTestOrganization(orgData = {}) {
  const client = getPrismaClient();
  
  const defaultOrg = {
    name: `Test Organization ${Date.now()}`,
    email: generateTestEmail('org'),
    stripeAccountId: `acct_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    ...orgData
  };

  try {
    const organization = await client.organization.create({
      data: defaultOrg
    });
    return organization;
  } catch (error) {
    console.error('Error creating test organization:', error);
    throw error;
  }
}

/**
 * Create a test passkey
 * @param {string} userId - User ID
 * @param {Object} passkeyData - Passkey data
 * @returns {Promise<Object>} - Created passkey
 */
async function createTestPasskey(userId, passkeyData = {}) {
  const client = getPrismaClient();
  
  const defaultPasskey = {
    userId,
    credentialId: `credential_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    publicKey: Buffer.from('test-public-key'),
    counter: 0,
    ...passkeyData
  };

  try {
    const passkey = await client.passkey.create({
      data: defaultPasskey
    });
    return passkey;
  } catch (error) {
    console.error('Error creating test passkey:', error);
    throw error;
  }
}

/**
 * Create a test OTP code
 * @param {string} userId - User ID
 * @param {Object} otpData - OTP data
 * @returns {Promise<Object>} - Created OTP code
 */
async function createTestOtpCode(userId, otpData = {}) {
  const client = getPrismaClient();
  
  const defaultOtp = {
    userId,
    code: generateOtpCode(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    used: false,
    ...otpData
  };

  try {
    const otpCode = await client.otpCode.create({
      data: defaultOtp
    });
    return otpCode;
  } catch (error) {
    console.error('Error creating test OTP code:', error);
    throw error;
  }
}

// Export a default testPrisma instance for tests
const testPrisma = getPrismaClient();

module.exports = {
  testPrisma,
  getPrismaClient,
  closeAllConnections,
  withTransaction,
  cleanupAllTestData,
  cleanupTestData,
  createTestUser,
  createTestCampaign,
  createTestOrganization,
  createTestPasskey,
  createTestOtpCode,
  waitForDatabase,
  isDatabaseAvailable,
  getDatabaseInfo,
  setupTestEnvironment,
  teardownTestEnvironment,
  withIsolatedTest,
  generateTestEmail,
  generateOtpCode,
  generateMockStripeCustomer,
  generateMockPaymentSession,
  createAuthHeaders
};