/**
 * Database Test Setup Utilities
 * 
 * Handles test database initialization, cleanup, and verification
 */

import { PrismaClient } from '@prisma/client';

let testPrisma: PrismaClient | null = null;

/**
 * Get or create a Prisma client specifically for tests
 */
export function getTestPrismaClient(): PrismaClient {
  if (!testPrisma) {
    const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('TEST_DATABASE_URL or DATABASE_URL must be configured for tests');
    }

    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      },
      log: ['error']
    });
  }
  
  return testPrisma;
}

/**
 * Verify test database connection and schema
 */
export async function verifyTestDatabase(): Promise<{
  connected: boolean;
  schemaExists: boolean;
  error?: string;
}> {
  try {
    const client = getTestPrismaClient();
    
    // Test connection
    await client.$connect();
    
    // Test if main tables exist
    await client.$queryRaw`SELECT 1 FROM "User" LIMIT 1`;
    await client.$queryRaw`SELECT 1 FROM "Campaign" LIMIT 1`;
    await client.$queryRaw`SELECT 1 FROM "Pledge" LIMIT 1`;
    
    return {
      connected: true,
      schemaExists: true
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's a connection issue or schema issue
    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      return {
        connected: true,
        schemaExists: false,
        error: 'Database schema not initialized'
      };
    }
    
    return {
      connected: false,
      schemaExists: false,
      error: errorMessage
    };
  }
}

/**
 * Clean up test database connections
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (testPrisma) {
    try {
      await testPrisma.$disconnect();
    } catch (error) {
      console.warn('Error disconnecting test database:', error);
    } finally {
      testPrisma = null;
    }
  }
}

/**
 * Setup test database with retries
 */
export async function setupTestDatabase(retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await verifyTestDatabase();
      
      if (result.connected && result.schemaExists) {
        console.log('✅ Test database is ready');
        return true;
      }
      
      if (result.connected && !result.schemaExists) {
        console.log('📋 Test database connected but schema missing');
        // In a real scenario, we'd run migrations here
        // For now, just report the issue
        return false;
      }
      
      console.log(`❌ Test database setup failed (attempt ${i + 1}/${retries}):`, result.error);
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }
    } catch (error) {
      console.log(`❌ Test database setup error (attempt ${i + 1}/${retries}):`, error);
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  return false;
}

/**
 * Reset test data (for use in beforeEach hooks)
 */
export async function resetTestData(): Promise<void> {
  const client = getTestPrismaClient();
  
  try {
    // Clean up in correct order due to foreign key constraints
    await client.pledge.deleteMany();
    await client.campaignUpdate.deleteMany();
    await client.comment.deleteMany();
    await client.pledgeTier.deleteMany();
    await client.campaign.deleteMany();
    await client.user.deleteMany();
    
    console.log('🧹 Test data reset complete');
  } catch (error) {
    console.warn('⚠️ Error resetting test data:', error);
  }
}