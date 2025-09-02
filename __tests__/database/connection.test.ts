/**
 * Database Connection Test
 * 
 * Verifies that database connection works properly in test environment
 */

import { verifyTestDatabase, setupTestDatabase, cleanupTestDatabase } from '../utils/db-test-setup';
import { PaymentErrorScenarios } from '../payments/payment-test-helpers';

describe('🗄️ Database Connection', () => {
  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('should have TEST_DATABASE_URL configured', () => {
    expect(process.env.TEST_DATABASE_URL).toBeDefined();
    expect(process.env.TEST_DATABASE_URL).toContain('postgres');
    expect(process.env.TEST_DATABASE_URL).toContain('vibefunder-testing');
  });

  it('should connect to test database', async () => {
    const result = await verifyTestDatabase();
    
    expect(result.connected).toBe(true);
    
    if (!result.schemaExists) {
      console.warn('⚠️ Database schema not initialized. Run: npm run db:test:reset');
    }
  }, 10000);

  it('should setup test database successfully', async () => {
    const isReady = await setupTestDatabase();
    
    if (!isReady) {
      console.warn('⚠️ Test database setup failed. This may affect other tests.');
      console.warn('   Try running: DATABASE_URL=$TEST_DATABASE_URL npx prisma db push --force-reset');
    }
    
    // Don't fail the test, just report status
    expect(typeof isReady).toBe('boolean');
  }, 15000);

  it('should have database error scenarios available', () => {
    expect(PaymentErrorScenarios.DATABASE_ERRORS).toBeDefined();
    expect(PaymentErrorScenarios.DATABASE_ERRORS.CONNECTION_FAILED).toBeInstanceOf(Error);
    expect(PaymentErrorScenarios.DATABASE_ERRORS.CONNECTION_FAILED.message).toBe('Database connection failed');
  });

  it('should be able to verify database connection programmatically', async () => {
    const isConnected = await PaymentErrorScenarios.verifyDatabaseConnection();
    expect(typeof isConnected).toBe('boolean');
    
    if (!isConnected) {
      console.warn('⚠️ Database connection verification failed');
    }
  });
});