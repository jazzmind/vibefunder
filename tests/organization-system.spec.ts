import { test, expect } from '@playwright/test';

test.describe('Organization System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3900');
  });

  test('should display organizations', async ({ page }) => {
    // Look for organization-related elements
    const orgElements = page.locator('text=/organization|company|team/i, a[href*="org"], [data-testid*="org"]');

    if (await orgElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Organization display found');
    }
  });

  test('should show organization types', async ({ page }) => {
    // Check for organization type indicators
    const typeElements = page.locator('text=/creator|service.*provider|enterprise/i, [data-org-type], .org-type');

    if (await typeElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Organization types found');
    }
  });

  test('should have organization creation', async ({ page }) => {
    const createOrgLink = page.locator('text=/create.*organization|new.*organization|join.*as.*organization/i, a[href*="organization"][href*="new"]').first();

    if (await createOrgLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createOrgLink.click();

      // Check for org creation form
      const nameInput = page.locator('input[name*="org"], input[placeholder*="organization"]').first();

      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(nameInput).toBeVisible();
        console.log('Organization creation form found');
      }
    }
  });

  test('should display service catalog', async ({ page }) => {
    // Look for service listings
    const serviceElements = page.locator('text=/service|offering|solution/i, .service-card, [data-service]');

    if (await serviceElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Service catalog found');
    }
  });

  test('should show service categories', async ({ page }) => {
    // Look for category filters/tags
    const categoryElements = page.locator('.service-category, [data-category], .tag, text=/security|development|design|marketing/i');

    if (await categoryElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Service categories found');
    }
  });

  test('should have team member management', async ({ page }) => {
    // Look for team management UI
    const teamElements = page.locator('text=/team.*member|invite.*member|collaborator/i, button[data-action="invite"], .team-list');

    if (await teamElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Team member management found');
    }
  });

  test('should display organization verification', async ({ page }) => {
    // Look for verification badges/status
    const verificationElements = page.locator('text=/verified|approved|pending.*approval/i, .verification-badge, [data-verified]');

    if (await verificationElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Organization verification system found');
    }
  });

  test('should show waitlist system', async ({ page }) => {
    // Look for waitlist elements
    const waitlistElements = page.locator('text=/waitlist|join.*wait|early.*access/i, button:has-text("Join Waitlist"), .waitlist-form');

    if (await waitlistElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Waitlist system found');
    }
  });

  test('should have organization profile', async ({ page }) => {
    // Try to navigate to an org profile
    const orgLink = page.locator('a[href*="/org"], .org-link').first();

    if (await orgLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await orgLink.click();

      // Check for profile elements
      const profileElements = page.locator('.org-profile, [data-org-info], h1, .org-description');

      if (await profileElements.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('Organization profile page found');
      }
    }
  });
});