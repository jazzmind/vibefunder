// Global Jest teardown for VibeFunder test suite

module.exports = async () => {
  console.log('🧹 Cleaning up VibeFunder test environment...');

  try {
    // Clean up global database connection first
    await cleanupGlobalConnection();
    
    // Clean up test data (optional, controlled by environment)
    await cleanupTestData();
    
    // Close any remaining connections
    await closeConnections();
    
    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('⚠️  Error during cleanup:', error.message);
    // Don't throw - cleanup failures shouldn't fail test suite
  }
};

async function cleanupGlobalConnection() {
  console.log('🔌 Cleaning up global database connection...');
  
  try {
    // Use the cleanup function we stored during setup
    if (typeof global.cleanupTestPrisma === 'function') {
      await global.cleanupTestPrisma();
      console.log('✅ Global Prisma connection cleaned up');
    }
  } catch (error) {
    console.warn('⚠️  Error cleaning up global connection:', error.message);
  }
}

async function cleanupTestData() {
  console.log('🗑️  Cleaning up test data...');
  
  try {
    // Only cleanup if we're in test environment and it's explicitly requested
    if (process.env.NODE_ENV !== 'test') {
      console.log('⚠️  Skipping data cleanup - not in test environment');
      return;
    }

    // Skip data cleanup unless explicitly requested (to avoid accidental data loss)
    if (!process.env.CLEANUP_TEST_DATA) {
      console.log('ℹ️  Skipping test data cleanup (set CLEANUP_TEST_DATA=true to enable)');
      return;
    }

    // Ensure TEST_DATABASE_URL is used for cleanup
    if (!process.env.TEST_DATABASE_URL) {
      console.warn('⚠️  TEST_DATABASE_URL not configured - skipping data cleanup for safety');
      return;
    }

    // Create a new connection for cleanup if global one doesn't exist
    let prisma = global.testPrisma;
    let shouldDisconnect = false;
    
    if (!prisma) {
      const { PrismaClient } = require('@prisma/client');
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.TEST_DATABASE_URL
          }
        },
        log: ['error']
      });
      shouldDisconnect = true;
      await prisma.$connect();
    }

    try {
      // Use transaction to ensure all-or-nothing cleanup
      await prisma.$transaction(async (tx) => {
        // Delete in order to respect foreign key constraints
        // Start with tables that have foreign keys to other tables
        await tx.comment.deleteMany({});
        await tx.pledge.deleteMany({});
        await tx.milestone.deleteMany({});
        await tx.pledgeTier.deleteMany({});
        await tx.stretchGoal.deleteMany({});
        await tx.teamMember.deleteMany({});
        await tx.campaign.deleteMany({});
        await tx.passkey.deleteMany({});
        await tx.otpCode.deleteMany({});
        await tx.organizationTeamMember.deleteMany({});
        await tx.organizationService.deleteMany({});
        await tx.organization.deleteMany({});
        await tx.waitlist.deleteMany({});
        await tx.user.deleteMany({});
      }, {
        timeout: 30000 // 30 second timeout for cleanup
      });
      
      console.log('✅ All test data cleaned up');
    } finally {
      if (shouldDisconnect && prisma) {
        await prisma.$disconnect();
      }
    }
  } catch (error) {
    console.error('❌ Error during test data cleanup:', error.message);
    // Don't throw - we want teardown to continue
  }
}

async function closeConnections() {
  console.log('🔌 Closing remaining connections...');
  
  try {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Clear global references
    global.testPrisma = null;
    global.cleanupTestPrisma = null;
    
    // Give a moment for connections to properly close
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('✅ Connections closed');
  } catch (error) {
    console.warn('⚠️  Error closing connections:', error.message);
  }
}