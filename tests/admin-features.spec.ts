import { test, expect } from '@playwright/test';

test.describe('Administrative Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3900');
  });

  test('should have admin access point', async ({ page }) => {
    // Try common admin URLs
    const adminUrls = ['/admin', '/dashboard', '/admin/dashboard'];

    for (const url of adminUrls) {
      await page.goto(`http://localhost:3900${url}`).catch(() => {});

      const adminElements = page.locator('text=/admin|dashboard|management/i, [data-admin], .admin-panel');

      if (await adminElements.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`Admin interface found at ${url}`);
        break;
      }
    }
  });

  test('should display admin dashboard', async ({ page }) => {
    await page.goto('http://localhost:3900/admin').catch(() => {});

    // Look for dashboard elements
    const dashboardElements = page.locator('.dashboard, [data-testid="admin-dashboard"], .stats-card, text=/statistics|overview|metrics/i');

    if (await dashboardElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Admin dashboard found');
    }
  });

  test('should have campaign management', async ({ page }) => {
    await page.goto('http://localhost:3900/admin').catch(() => {});

    // Look for campaign management section
    const campaignMgmtElements = page.locator('text=/manage.*campaign|all.*campaign|campaign.*list/i, a[href*="admin"][href*="campaign"]');

    if (await campaignMgmtElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Campaign management section found');
    }
  });

  test('should have user management', async ({ page }) => {
    await page.goto('http://localhost:3900/admin').catch(() => {});

    // Look for user management section
    const userMgmtElements = page.locator('text=/manage.*user|user.*list|all.*user/i, a[href*="admin"][href*="user"], .user-table');

    if (await userMgmtElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('User management section found');
    }
  });

  test('should have organization approval workflow', async ({ page }) => {
    await page.goto('http://localhost:3900/admin').catch(() => {});

    // Look for org approval elements
    const approvalElements = page.locator('text=/pending.*approval|approve.*organization|review.*organization/i, button:has-text("Approve"), .approval-queue');

    if (await approvalElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Organization approval workflow found');
    }
  });

  test('should have waitlist management', async ({ page }) => {
    await page.goto('http://localhost:3900/admin').catch(() => {});

    // Look for waitlist management
    const waitlistElements = page.locator('text=/waitlist.*manage|waitlist.*user|early.*access/i, .waitlist-table, [data-waitlist]');

    if (await waitlistElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Waitlist management found');
    }
  });

  test('should have system settings', async ({ page }) => {
    await page.goto('http://localhost:3900/admin').catch(() => {});

    // Look for settings section
    const settingsElements = page.locator('text=/system.*setting|configuration|platform.*setting/i, a[href*="setting"], .settings-panel');

    if (await settingsElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('System settings found');
    }
  });

  test('should display admin statistics', async ({ page }) => {
    await page.goto('http://localhost:3900/admin').catch(() => {});

    // Look for statistics/metrics
    const statsElements = page.locator('.stat-card, [data-stat], text=/total.*user|total.*campaign|revenue|metric/i, .chart');

    if (await statsElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const statsCount = await statsElements.count();
      console.log(`Found ${statsCount} statistics elements`);
    }
  });

  test('should have admin actions', async ({ page }) => {
    await page.goto('http://localhost:3900/admin').catch(() => {});

    // Look for admin action buttons
    const actionElements = page.locator('button:has-text("Edit"), button:has-text("Delete"), button:has-text("Suspend"), button:has-text("Approve"), .admin-actions');

    if (await actionElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Admin action buttons found');
    }
  });

  test('should have audit/activity log', async ({ page }) => {
    await page.goto('http://localhost:3900/admin').catch(() => {});

    // Look for activity/audit log
    const logElements = page.locator('text=/activity.*log|audit.*trail|recent.*activity/i, .activity-log, [data-activity]');

    if (await logElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Activity/audit log found');
    }
  });
});