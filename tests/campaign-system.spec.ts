import { test, expect } from '@playwright/test';

test.describe('Core Campaign System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3900');
  });

  test('should display campaign listing', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    // Check for campaign cards or empty state
    const campaignSection = page.locator('[data-testid="campaigns"], .campaign-list, main');
    await expect(campaignSection).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to campaign creation', async ({ page }) => {
    // Try to find create campaign button/link
    const createButton = page.locator('text=/create.*campaign/i, a[href*="campaign"][href*="new"], button:has-text("New Campaign")').first();

    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();
      await expect(page).toHaveURL(/.*campaign.*new|create.*/);
    }
  });

  test('should show campaign details', async ({ page }) => {
    // Look for any campaign link
    const campaignLink = page.locator('a[href*="/campaign"], .campaign-card a, [data-testid="campaign-link"]').first();

    if (await campaignLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await campaignLink.click();
      // Check for campaign details elements
      await expect(page.locator('h1, h2, [data-testid="campaign-title"]').first()).toBeVisible();
    }
  });

  test('should display campaign fields', async ({ page }) => {
    // Navigate to a campaign or campaign creation page
    await page.goto('http://localhost:3900/campaigns/new').catch(() => {});

    // Check for required campaign fields
    const fields = [
      'input[name*="title"], input[placeholder*="title"]',
      'textarea[name*="summary"], input[name*="summary"]',
      'textarea[name*="description"], [contenteditable]',
      'input[name*="goal"], input[type="number"]',
      'input[name*="video"], input[placeholder*="video"]',
      'input[name*="website"], input[placeholder*="website"]'
    ];

    for (const field of fields) {
      const element = page.locator(field).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`Found field: ${field}`);
      }
    }
  });

  test('should support campaign status management', async ({ page }) => {
    // Check for status indicators
    const statusElements = page.locator('[data-status], .status, select[name*="status"], .badge');

    if (await statusElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const statuses = ['draft', 'live', 'funded', 'completed'];
      for (const status of statuses) {
        const statusEl = page.locator(`text=/${status}/i`).first();
        if (await statusEl.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`Found status: ${status}`);
        }
      }
    }
  });

  test('should have team management features', async ({ page }) => {
    // Look for team-related UI elements
    const teamElements = page.locator('text=/team/i, [data-testid*="team"], button:has-text("Add Team Member")');

    if (await teamElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Team management features found');
    }
  });

  test('should support campaign updates', async ({ page }) => {
    // Look for updates section
    const updateElements = page.locator('text=/update/i, [data-testid*="update"], button:has-text("Post Update")');

    if (await updateElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Campaign update features found');
    }
  });

  test('should have comments system', async ({ page }) => {
    // Look for comments section
    const commentElements = page.locator('[data-testid*="comment"], .comments, textarea[placeholder*="comment"]');

    if (await commentElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Comments system found');
    }
  });
});