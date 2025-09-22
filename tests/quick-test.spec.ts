import { test, expect } from '@playwright/test';

test.describe('Quick VibeFunder Test', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('http://localhost:3900');
    await page.waitForLoadState('networkidle');

    // Take a screenshot for inspection
    await page.screenshot({ path: 'home-page.png' });

    // Check for basic page elements
    const title = await page.title();
    console.log('Page title:', title);

    // Check for any visible text
    const bodyText = await page.textContent('body');
    console.log('Body contains text:', bodyText?.slice(0, 200));

    expect(title).toBeTruthy();
  });

  test('should check for login link', async ({ page }) => {
    await page.goto('http://localhost:3900');

    const loginLink = await page.locator('a').filter({ hasText: /sign in|login/i }).first();
    const isVisible = await loginLink.isVisible().catch(() => false);

    console.log('Login link visible:', isVisible);

    if (isVisible) {
      await loginLink.click();
      await page.waitForLoadState('networkidle');
      const url = page.url();
      console.log('After clicking login, URL:', url);
    }
  });
});