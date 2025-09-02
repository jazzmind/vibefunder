/**
 * Integration Test Setup
 * Configures database transactions and isolation for integration tests
 */

const { testPrisma, withTransaction } = require('../utils/test-helpers');
const emailMock = require('../mocks/email.mock');
const stripeMock = require('../mocks/stripe.mock');

// Global test isolation setup
let testTransaction = null;
let rollbackFunc = null;

/**
 * Set up transaction-based test isolation
 * Each test runs in a transaction that gets rolled back
 */
async function setupTestIsolation() {
  // Begin a transaction for the test
  try {
    const result = await testPrisma.$transaction(async (tx) => {
      // Store the transaction context
      testTransaction = tx;
      
      // This transaction will be kept open until rollback
      return new Promise((resolve, reject) => {
        rollbackFunc = () => reject(new Error('ROLLBACK'));
        
        // Set a long timeout to keep transaction open
        setTimeout(() => {
          resolve(tx);
        }, 30000); // 30 second timeout
      });
    }, {
      timeout: 60000, // 1 minute total timeout
    }).catch(error => {
      if (error.message === 'ROLLBACK') {
        // Expected rollback, not an actual error
        return null;
      }
      throw error;
    });
  } catch (error) {
    console.error('Transaction setup error:', error);
  }
}

/**
 * Clean up test isolation
 */
async function cleanupTestIsolation() {
  if (rollbackFunc) {
    rollbackFunc();
    rollbackFunc = null;
  }
  testTransaction = null;
}

/**
 * Get the current test transaction or regular prisma client
 */
function getTestClient() {
  return testTransaction || testPrisma;
}

/**
 * Reset all mocks between tests
 */
function resetMocks() {
  emailMock.reset();
  stripeMock.reset();
  
  // Reset any other mocks
  if (global.fetch && global.fetch.mockClear) {
    global.fetch.mockClear();
  }
}

/**
 * Setup function to run before each integration test
 */
async function beforeEachTest() {
  resetMocks();
  // Don't set up transaction isolation for every test as it's too slow
  // Instead, use regular database with cleanup
}

/**
 * Cleanup function to run after each integration test
 */
async function afterEachTest() {
  resetMocks();
  
  // Quick cleanup of test data created in this test
  try {
    // Delete test data created in the last few seconds
    const recentTime = new Date(Date.now() - 10000); // Last 10 seconds
    
    await testPrisma.pledge.deleteMany({
      where: {
        createdAt: { gte: recentTime },
        OR: [
          { paymentRef: { contains: 'test' } },
          { backer: { email: { contains: '@example.com' } } },
        ],
      },
    });
    
    await testPrisma.campaign.deleteMany({
      where: {
        createdAt: { gte: recentTime },
        OR: [
          { title: { contains: 'Test' } },
          { maker: { email: { contains: '@example.com' } } },
        ],
      },
    });
  } catch (error) {
    // Ignore cleanup errors in tests
    console.warn('Test cleanup warning:', error.message);
  }
}

/**
 * Global setup for integration tests
 */
async function globalSetup() {
  console.log('Setting up integration test environment...');
  
  // Verify database connection
  try {
    await testPrisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection verified');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
  
  // Set up global mocks
  setupGlobalMocks();
  
  console.log('✅ Integration test environment ready');
}

/**
 * Global teardown for integration tests
 */
async function globalTeardown() {
  console.log('Tearing down integration test environment...');
  
  // Clean up any remaining test data
  try {
    await testPrisma.pledge.deleteMany({
      where: {
        OR: [
          { paymentRef: { contains: 'test' } },
          { backer: { email: { contains: '@example.com' } } },
        ],
      },
    });
    
    await testPrisma.campaign.deleteMany({
      where: {
        OR: [
          { title: { contains: 'Test' } },
          { maker: { email: { contains: '@example.com' } } },
        ],
      },
    });
    
    await testPrisma.user.deleteMany({
      where: {
        email: { contains: '@example.com' },
      },
    });
  } catch (error) {
    console.warn('Global cleanup warning:', error.message);
  }
  
  await testPrisma.$disconnect();
  console.log('✅ Integration test environment cleaned up');
}

/**
 * Set up global mocks for external services
 */
function setupGlobalMocks() {
  // Mock Stripe if not already mocked
  if (!global.mockStripe) {
    global.mockStripe = stripeMock.stripe;
  }
  
  // Mock nodemailer if not already mocked
  if (!global.mockTransporter) {
    global.mockTransporter = emailMock.transporter;
  }
  
  // Mock fetch for API calls if needed
  if (!global.fetch) {
    global.fetch = require('jest-fetch-mock');
  }
}

/**
 * Utility function for running tests with automatic cleanup
 */
async function runWithCleanup(testFn, cleanupPatterns = []) {
  try {
    return await testFn();
  } finally {
    // Run custom cleanup patterns
    for (const pattern of cleanupPatterns) {
      try {
        if (pattern.table && pattern.where) {
          await testPrisma[pattern.table].deleteMany({
            where: pattern.where,
          });
        }
      } catch (error) {
        console.warn(`Cleanup error for ${pattern.table}:`, error.message);
      }
    }
  }
}

/**
 * Create isolated test environment for a specific test suite
 */
class TestEnvironment {
  constructor() {
    this.createdUsers = [];
    this.createdCampaigns = [];
    this.createdOrganizations = [];
  }
  
  trackUser(user) {
    this.createdUsers.push(user);
    return user;
  }
  
  trackCampaign(campaign) {
    this.createdCampaigns.push(campaign);
    return campaign;
  }
  
  trackOrganization(org) {
    this.createdOrganizations.push(org);
    return org;
  }
  
  async cleanup() {
    try {
      // Clean up tracked resources in dependency order
      if (this.createdCampaigns.length > 0) {
        await testPrisma.pledge.deleteMany({
          where: {
            campaignId: { in: this.createdCampaigns.map(c => c.id) },
          },
        });
        
        await testPrisma.campaign.deleteMany({
          where: {
            id: { in: this.createdCampaigns.map(c => c.id) },
          },
        });
      }
      
      if (this.createdOrganizations.length > 0) {
        await testPrisma.organization.deleteMany({
          where: {
            id: { in: this.createdOrganizations.map(o => o.id) },
          },
        });
      }
      
      if (this.createdUsers.length > 0) {
        await testPrisma.user.deleteMany({
          where: {
            id: { in: this.createdUsers.map(u => u.id) },
          },
        });
      }
      
      // Reset tracking arrays
      this.createdUsers = [];
      this.createdCampaigns = [];
      this.createdOrganizations = [];
    } catch (error) {
      console.warn('TestEnvironment cleanup error:', error.message);
    }
  }
}

module.exports = {
  setupTestIsolation,
  cleanupTestIsolation,
  getTestClient,
  resetMocks,
  beforeEachTest,
  afterEachTest,
  globalSetup,
  globalTeardown,
  runWithCleanup,
  TestEnvironment,
};
