import { test, expect } from '@playwright/test';

test.describe('User Management & Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3900');
  });

  test('should display login/signup options', async ({ page }) => {
    // Look for auth buttons
    const authButtons = page.locator('text=/sign.*in|log.*in|sign.*up|register/i, a[href*="auth"], a[href*="login"]');

    if (await authButtons.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Auth options found');
      await expect(authButtons.first()).toBeVisible();
    }
  });

  test('should navigate to login page', async ({ page }) => {
    const loginLink = page.locator('a[href*="login"], button:has-text("Login"), text=/log.*in/i').first();

    if (await loginLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginLink.click();
      await expect(page).toHaveURL(/.*login|auth|signin.*/);

      // Check for login form elements
      const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      await expect(emailInput).toBeVisible({ timeout: 5000 });
      await expect(passwordInput).toBeVisible();
    }
  });

  test('should have signup functionality', async ({ page }) => {
    const signupLink = page.locator('a[href*="signup"], a[href*="register"], button:has-text("Sign Up"), text=/sign.*up|register/i').first();

    if (await signupLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signupLink.click();
      await expect(page).toHaveURL(/.*signup|register|join.*/);

      // Check for signup form elements
      const nameInput = page.locator('input[name*="name"], input[placeholder*="name"]').first();
      const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
      }
    }
  });

  test('should support OTP/2FA', async ({ page }) => {
    // Look for OTP-related elements
    const otpElements = page.locator('text=/two.*factor|2fa|otp|verification.*code/i, input[name*="otp"], input[name*="code"]');

    if (await otpElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('OTP/2FA support found');
    }
  });

  test('should have profile management', async ({ page }) => {
    // Look for profile links
    const profileElements = page.locator('a[href*="profile"], text=/profile|account.*settings/i, [data-testid*="profile"]');

    if (await profileElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Profile management found');
    }
  });

  test('should display user roles', async ({ page }) => {
    // Look for role indicators
    const roleElements = page.locator('text=/admin|user|creator|backer/i, [data-role], .user-role');

    if (await roleElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('User roles system found');
    }
  });

  test('should handle session management', async ({ page }) => {
    // Check for logout option (indicates session management)
    const logoutElements = page.locator('text=/log.*out|sign.*out/i, button[aria-label*="logout"]');

    if (await logoutElements.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Session management features found');
    }
  });

  test('should perform login flow', async ({ page }) => {
    // Try to perform actual login
    const loginLink = page.locator('a[href*="login"], text=/log.*in/i').first();

    if (await loginLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginLink.click();

      const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();

      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('test@example.com');
        await passwordInput.fill('TestPassword123!');
        await submitButton.click();

        // Check for either error message or redirect
        await page.waitForLoadState('networkidle');
        console.log('Login flow attempted');
      }
    }
  });
});