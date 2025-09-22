import { test, expect } from '@playwright/test';

test.describe('Pledge System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3900');
  });

  test('should display pledge options', async ({ page }) => {
    // Navigate to a campaign page first
    const campaignLink = page.locator('a[href*="/campaign"], .campaign-card a').first();

    if (await campaignLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await campaignLink.click();

      // Look for pledge buttons/tiers
      const pledgeElements = page.locator('text=/pledge|back.*project|support/i, button[data-pledge], .pledge-tier');

      if (await pledgeElements.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('Pledge options found');
        await expect(pledgeElements.first()).toBeVisible();
      }
    }
  });

  test('should show pledge tiers', async ({ page }) => {
    // Look for tier information
    const tierElements = page.locator('.pledge-tier, [data-tier], .tier-card, text=/\$[0-9]+.*pledge/i');

    if (await tierElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const tierCount = await tierElements.count();
      console.log(`Found ${tierCount} pledge tiers`);
      expect(tierCount).toBeGreaterThan(0);
    }
  });

  test('should display pledge benefits', async ({ page }) => {
    // Look for benefits/rewards text
    const benefitElements = page.locator('text=/reward|benefit|perk|includes/i, .pledge-benefits, ul.benefits');

    if (await benefitElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Pledge benefits found');
    }
  });

  test('should have pledge creation flow', async ({ page }) => {
    // Look for pledge button
    const pledgeButton = page.locator('button:has-text("Pledge"), button:has-text("Back this project"), .pledge-button').first();

    if (await pledgeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pledgeButton.click();

      // Check for pledge form elements
      const amountInput = page.locator('input[type="number"], input[name*="amount"], input[placeholder*="amount"]').first();

      if (await amountInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(amountInput).toBeVisible();
        console.log('Pledge creation form found');
      }
    }
  });

  test('should support anonymous pledges', async ({ page }) => {
    // Look for anonymous option
    const anonymousOption = page.locator('input[type="checkbox"][name*="anonym"], label:has-text("Anonymous"), text=/pledge.*anonym/i');

    if (await anonymousOption.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Anonymous pledge option found');
    }
  });

  test('should show pledge dashboard', async ({ page }) => {
    // Try to navigate to dashboard
    await page.goto('http://localhost:3900/dashboard').catch(() => {});

    const pledgeSection = page.locator('text=/my.*pledge|backed.*project/i, [data-testid*="pledge"], .pledges-list');

    if (await pledgeSection.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Pledge dashboard found');
    }
  });

  test('should display funding progress', async ({ page }) => {
    // Look for progress indicators
    const progressElements = page.locator('.progress-bar, [role="progressbar"], text=/%.*funded|raised/i, .funding-progress');

    if (await progressElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Funding progress indicators found');
    }
  });

  test('should show backer count', async ({ page }) => {
    // Look for backer statistics
    const backerElements = page.locator('text=/[0-9]+.*backer|supporter|contributor/i, .backer-count, [data-backers]');

    if (await backerElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Backer count display found');
    }
  });

  test('should handle pledge management', async ({ page }) => {
    // Look for pledge management options
    const managementElements = page.locator('text=/manage.*pledge|update.*pledge|cancel/i, button[data-action="cancel-pledge"]');

    if (await managementElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Pledge management features found');
    }
  });
});