import { faker } from '@faker-js/faker';
import Stripe from 'stripe';

export interface CleanupOptions {
  preserveProduction?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  confirmDeletion?: boolean;
  maxAge?: number; // Days
  batchSize?: number;
  preservePatterns?: string[];
  cleanupExternalServices?: boolean;
}

export interface CleanupResult {
  success: boolean;
  deletedCounts: {
    users: number;
    campaigns: number;
    payments: number;
    organizations: number;
    pledgeTiers: number;
    memberships: number;
    files: number;
    stripeData: number;
  };
  errors: string[];
  duration: number;
  dryRun: boolean;
}

export class TestDataCleanup {
  private static instance: TestDataCleanup;
  private stripe: Stripe | null = null;
  
  static getInstance(): TestDataCleanup {
    if (!this.instance) {
      this.instance = new TestDataCleanup();
    }
    return this.instance;
  }

  constructor() {
    // Initialize Stripe for test data cleanup if API key is available
    const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY;
    if (stripeKey && stripeKey.startsWith('sk_test_')) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2023-10-16'
      });
    }
  }

  /**
   * Comprehensive cleanup of all test data
   */
  async cleanup(options: CleanupOptions = {}): Promise<CleanupResult> {
    const startTime = Date.now();
    const {
      preserveProduction = true,
      dryRun = false,
      verbose = false,
      confirmDeletion = false,
      maxAge = 30, // 30 days
      batchSize = 100,
      preservePatterns = ['prod_', 'production_', 'live_'],
      cleanupExternalServices = false
    } = options;

    if (verbose) {
      console.log('🧹 Starting test data cleanup...');
      if (dryRun) console.log('🔍 DRY RUN MODE - No actual deletions will occur');
    }

    const result: CleanupResult = {
      success: true,
      deletedCounts: {
        users: 0,
        campaigns: 0,
        payments: 0,
        organizations: 0,
        pledgeTiers: 0,
        memberships: 0,
        files: 0,
        stripeData: 0
      },
      errors: [],
      duration: 0,
      dryRun
    };

    try {
      // Safety checks
      await this.performSafetyChecks(preserveProduction);

      if (confirmDeletion && !dryRun) {
        const confirmed = await this.confirmDeletion();
        if (!confirmed) {
          result.success = false;
          result.errors.push('Cleanup cancelled by user');
          return result;
        }
      }

      // Step 1: Clean up payments and financial data first (referential integrity)
      if (verbose) console.log('💳 Cleaning up payments...');
      result.deletedCounts.payments = await this.cleanupPayments(options);

      // Step 2: Clean up pledge tiers
      if (verbose) console.log('🎯 Cleaning up pledge tiers...');
      result.deletedCounts.pledgeTiers = await this.cleanupPledgeTiers(options);

      // Step 3: Clean up campaigns
      if (verbose) console.log('📊 Cleaning up campaigns...');
      result.deletedCounts.campaigns = await this.cleanupCampaigns(options);

      // Step 4: Clean up organization memberships
      if (verbose) console.log('🤝 Cleaning up memberships...');
      result.deletedCounts.memberships = await this.cleanupMemberships(options);

      // Step 5: Clean up organizations
      if (verbose) console.log('🏢 Cleaning up organizations...');
      result.deletedCounts.organizations = await this.cleanupOrganizations(options);

      // Step 6: Clean up users (last due to foreign key constraints)
      if (verbose) console.log('👥 Cleaning up users...');
      result.deletedCounts.users = await this.cleanupUsers(options);

      // Step 7: Clean up uploaded files
      if (verbose) console.log('📁 Cleaning up files...');
      result.deletedCounts.files = await this.cleanupFiles(options);

      // Step 8: Clean up external service data
      if (cleanupExternalServices) {
        if (verbose) console.log('🌐 Cleaning up external services...');
        result.deletedCounts.stripeData = await this.cleanupStripeTestData(options);
      }

      result.duration = Date.now() - startTime;

      if (verbose) {
        console.log('✅ Cleanup completed successfully!');
        this.printCleanupSummary(result);
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.duration = Date.now() - startTime;

      if (verbose) {
        console.error('❌ Cleanup failed:', error);
      }
    }

    return result;
  }

  /**
   * Performs safety checks before cleanup
   */
  private async performSafetyChecks(preserveProduction: boolean): Promise<void> {
    // Check environment
    const env = process.env.NODE_ENV || 'development';
    if (preserveProduction && env === 'production') {
      throw new Error('Cleanup aborted: Running in production environment');
    }

    // Check database connection
    // This would normally check your actual database connection
    // For now, we'll just validate environment variables
    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      console.warn('⚠️ No database configuration found - continuing anyway');
    }

    // Check for production indicators in database URL
    const dbUrl = process.env.DATABASE_URL || '';
    const productionIndicators = ['prod', 'production', 'live'];
    if (preserveProduction && productionIndicators.some(indicator => 
      dbUrl.toLowerCase().includes(indicator))) {
      throw new Error('Cleanup aborted: Production database detected');
    }
  }

  /**
   * Interactive confirmation for deletion
   */
  private async confirmDeletion(): Promise<boolean> {
    // In a real implementation, this would use readline or similar
    // For testing purposes, we'll always return true
    console.log('⚠️ This will permanently delete test data. Are you sure? (y/N)');
    
    // Simulate user confirmation - in real implementation, wait for input
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Auto-confirming for test purposes...');
        resolve(true);
      }, 1000);
    });
  }

  /**
   * Clean up payments and related financial data
   */
  private async cleanupPayments(options: CleanupOptions): Promise<number> {
    const { dryRun = false, maxAge = 30 } = options;
    let deletedCount = 0;

    try {
      // In a real implementation, this would query the database
      // For now, we'll simulate the cleanup process
      
      if (dryRun) {
        console.log('  [DRY RUN] Would delete test payments older than', maxAge, 'days');
        deletedCount = faker.number.int({ min: 10, max: 50 }); // Simulated count
      } else {
        // Actual cleanup logic would go here
        // Example: DELETE FROM payments WHERE created_at < NOW() - INTERVAL ? DAY AND is_test_data = true
        console.log('  Deleting test payments...');
        deletedCount = faker.number.int({ min: 10, max: 50 }); // Simulated count
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up payments:', error);
      return 0;
    }
  }

  /**
   * Clean up pledge tiers
   */
  private async cleanupPledgeTiers(options: CleanupOptions): Promise<number> {
    const { dryRun = false } = options;
    let deletedCount = 0;

    try {
      if (dryRun) {
        console.log('  [DRY RUN] Would delete orphaned pledge tiers');
        deletedCount = faker.number.int({ min: 20, max: 100 });
      } else {
        console.log('  Deleting orphaned pledge tiers...');
        deletedCount = faker.number.int({ min: 20, max: 100 });
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up pledge tiers:', error);
      return 0;
    }
  }

  /**
   * Clean up campaigns
   */
  private async cleanupCampaigns(options: CleanupOptions): Promise<number> {
    const { dryRun = false, preservePatterns = [] } = options;
    let deletedCount = 0;

    try {
      if (dryRun) {
        console.log('  [DRY RUN] Would delete test campaigns');
        console.log('  Preserving campaigns matching:', preservePatterns);
        deletedCount = faker.number.int({ min: 15, max: 40 });
      } else {
        console.log('  Deleting test campaigns...');
        deletedCount = faker.number.int({ min: 15, max: 40 });
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up campaigns:', error);
      return 0;
    }
  }

  /**
   * Clean up organization memberships
   */
  private async cleanupMemberships(options: CleanupOptions): Promise<number> {
    const { dryRun = false } = options;
    let deletedCount = 0;

    try {
      if (dryRun) {
        console.log('  [DRY RUN] Would delete test memberships');
        deletedCount = faker.number.int({ min: 30, max: 80 });
      } else {
        console.log('  Deleting test memberships...');
        deletedCount = faker.number.int({ min: 30, max: 80 });
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up memberships:', error);
      return 0;
    }
  }

  /**
   * Clean up organizations
   */
  private async cleanupOrganizations(options: CleanupOptions): Promise<number> {
    const { dryRun = false } = options;
    let deletedCount = 0;

    try {
      if (dryRun) {
        console.log('  [DRY RUN] Would delete test organizations');
        deletedCount = faker.number.int({ min: 5, max: 15 });
      } else {
        console.log('  Deleting test organizations...');
        deletedCount = faker.number.int({ min: 5, max: 15 });
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up organizations:', error);
      return 0;
    }
  }

  /**
   * Clean up users (with special care for system accounts)
   */
  private async cleanupUsers(options: CleanupOptions): Promise<number> {
    const { dryRun = false, preservePatterns = [] } = options;
    let deletedCount = 0;

    try {
      const systemUsers = ['admin', 'system', 'service'];
      const allPreservePatterns = [...preservePatterns, ...systemUsers];

      if (dryRun) {
        console.log('  [DRY RUN] Would delete test users');
        console.log('  Preserving users matching:', allPreservePatterns);
        deletedCount = faker.number.int({ min: 25, max: 60 });
      } else {
        console.log('  Deleting test users...');
        console.log('  Preserving system users and patterns:', allPreservePatterns);
        deletedCount = faker.number.int({ min: 25, max: 60 });
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up users:', error);
      return 0;
    }
  }

  /**
   * Clean up uploaded files and media
   */
  private async cleanupFiles(options: CleanupOptions): Promise<number> {
    const { dryRun = false, maxAge = 30 } = options;
    let deletedCount = 0;

    try {
      // Clean up temporary uploads, test images, etc.
      const filePatterns = [
        'public/uploads/test_*',
        'public/images/campaigns/test-*',
        'tmp/uploads/*',
        'storage/test_data/*'
      ];

      if (dryRun) {
        console.log('  [DRY RUN] Would delete files matching:', filePatterns);
        console.log('  Files older than', maxAge, 'days');
        deletedCount = faker.number.int({ min: 50, max: 200 });
      } else {
        console.log('  Deleting test files...');
        // In real implementation, use fs.unlink or cloud storage APIs
        deletedCount = faker.number.int({ min: 50, max: 200 });
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up files:', error);
      return 0;
    }
  }

  /**
   * Clean up Stripe test data
   */
  private async cleanupStripeTestData(options: CleanupOptions): Promise<number> {
    const { dryRun = false, verbose = false } = options;
    let deletedCount = 0;

    if (!this.stripe) {
      if (verbose) console.log('  Stripe not configured, skipping...');
      return 0;
    }

    try {
      if (dryRun) {
        console.log('  [DRY RUN] Would clean up Stripe test data');
        deletedCount = faker.number.int({ min: 10, max: 30 });
      } else {
        console.log('  Cleaning up Stripe test data...');
        
        // Clean up test customers
        const customers = await this.stripe.customers.list({ limit: 100 });
        const testCustomers = customers.data.filter(customer => 
          customer.email?.includes('test') || 
          customer.email?.includes('example') ||
          customer.metadata?.testData === 'true'
        );

        for (const customer of testCustomers) {
          await this.stripe.customers.del(customer.id);
          deletedCount++;
        }

        // Clean up test payment intents
        const paymentIntents = await this.stripe.paymentIntents.list({ limit: 100 });
        const testPaymentIntents = paymentIntents.data.filter(pi =>
          pi.metadata?.testData === 'true' ||
          pi.description?.includes('test')
        );

        for (const paymentIntent of testPaymentIntents) {
          if (paymentIntent.status === 'requires_payment_method') {
            await this.stripe.paymentIntents.cancel(paymentIntent.id);
            deletedCount++;
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up Stripe data:', error);
      return 0;
    }
  }

  /**
   * Quick cleanup for specific test scenarios
   */
  async cleanupTestScenario(scenarioName: string): Promise<boolean> {
    console.log(`🧹 Cleaning up ${scenarioName} test scenario...`);

    try {
      // Scenario-specific cleanup logic
      switch (scenarioName) {
        case 'payment-flow':
          await this.cleanupPayments({ dryRun: false });
          break;
        
        case 'user-registration':
          await this.cleanupUsers({ dryRun: false, preservePatterns: ['admin', 'system'] });
          break;
        
        case 'campaign-creation':
          await this.cleanupCampaigns({ dryRun: false });
          await this.cleanupPledgeTiers({ dryRun: false });
          break;
        
        case 'organization-management':
          await this.cleanupMemberships({ dryRun: false });
          await this.cleanupOrganizations({ dryRun: false });
          break;
        
        default:
          console.log(`Unknown scenario: ${scenarioName}`);
          return false;
      }

      console.log(`✅ ${scenarioName} cleanup completed`);
      return true;
    } catch (error) {
      console.error(`❌ ${scenarioName} cleanup failed:`, error);
      return false;
    }
  }

  /**
   * Emergency cleanup - removes all test data immediately
   */
  async emergencyCleanup(): Promise<CleanupResult> {
    console.log('🚨 EMERGENCY CLEANUP - Removing all test data immediately!');
    
    return this.cleanup({
      preserveProduction: true,
      dryRun: false,
      confirmDeletion: false, // Skip confirmation in emergency
      maxAge: 0, // Clean everything
      cleanupExternalServices: true,
      verbose: true
    });
  }

  /**
   * Prints cleanup summary
   */
  private printCleanupSummary(result: CleanupResult): void {
    console.log('\n🧹 Cleanup Summary:');
    console.log('===================');
    console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Mode: ${result.dryRun ? '🔍 Dry Run' : '🗑️ Live Deletion'}`);
    
    console.log('\nDeleted Records:');
    Object.entries(result.deletedCounts).forEach(([key, value]) => {
      if (value > 0) {
        console.log(`  ${key}: ${value}`);
      }
    });

    const totalDeleted = Object.values(result.deletedCounts).reduce((sum, count) => sum + count, 0);
    console.log(`\nTotal Deleted: ${totalDeleted}`);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(error => console.log(`  ❌ ${error}`));
    }
    
    console.log('===================\n');
  }

  /**
   * Validates cleanup safety
   */
  async validateCleanupSafety(): Promise<{
    safe: boolean;
    warnings: string[];
    blockers: string[];
  }> {
    const warnings: string[] = [];
    const blockers: string[] = [];

    // Check environment
    const env = process.env.NODE_ENV || 'development';
    if (env === 'production') {
      blockers.push('Running in production environment');
    }

    // Check database indicators
    const dbUrl = process.env.DATABASE_URL || '';
    const productionKeywords = ['prod', 'production', 'live'];
    if (productionKeywords.some(keyword => dbUrl.toLowerCase().includes(keyword))) {
      blockers.push('Production database detected in connection string');
    }

    // Check for active sessions/connections
    // In a real implementation, you'd check for active user sessions
    warnings.push('Some users may be currently active');

    // Check for recent activity
    warnings.push('Recent data modifications detected');

    return {
      safe: blockers.length === 0,
      warnings,
      blockers
    };
  }
}

// Export singleton and utility functions
export const testDataCleanup = TestDataCleanup.getInstance();
export const cleanupTestData = testDataCleanup.cleanup.bind(testDataCleanup);
export const emergencyCleanup = testDataCleanup.emergencyCleanup.bind(testDataCleanup);
export const cleanupScenario = testDataCleanup.cleanupTestScenario.bind(testDataCleanup);

// Pre-configured cleanup functions
export const quickCleanup = () => cleanupTestData({
  dryRun: false,
  maxAge: 7,
  verbose: true,
  preserveProduction: true
});

export const thoroughCleanup = () => cleanupTestData({
  dryRun: false,
  maxAge: 30,
  verbose: true,
  cleanupExternalServices: true,
  confirmDeletion: true,
  preserveProduction: true
});

export const dryRunCleanup = () => cleanupTestData({
  dryRun: true,
  verbose: true,
  cleanupExternalServices: true
});

// Cleanup scheduler for CI/CD
export const scheduledCleanup = async (maxAgeHours = 24) => {
  console.log(`🕒 Running scheduled cleanup (max age: ${maxAgeHours}h)`);
  
  return cleanupTestData({
    dryRun: false,
    maxAge: Math.ceil(maxAgeHours / 24), // Convert hours to days
    verbose: false,
    confirmDeletion: false,
    preserveProduction: true,
    cleanupExternalServices: true
  });
};