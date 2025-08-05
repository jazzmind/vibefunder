// Global Jest teardown for VibeFunder test suite
const { cleanupAllTestData } = require('../utils/test-helpers');

module.exports = async () => {
  console.log('🧹 Cleaning up VibeFunder test environment...');

  try {
    // Cleanup all test data from database
    console.log('🗑️  Cleaning up test data...');
    await cleanupAllTestData();
    
    // Close any remaining connections
    await closeConnections();
    
    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('⚠️  Error during cleanup:', error);
  }
};

async function closeConnections() {
  // Close any database connections, file handles, etc.
  console.log('🔌 Closing connections...');
  
  // Force close any open handles
  if (global.gc) {
    global.gc();
  }
}