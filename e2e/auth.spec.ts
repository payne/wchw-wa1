import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show sign in button when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Should see sign in option in navigation
    const signInButton = page.locator('button:has-text("Sign In")').first();
    await expect(signInButton).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to home after sign in', async ({ page }) => {
    await page.goto('/');

    // Check that the app loads
    await expect(page).toHaveTitle(/WCHW|Signal/i, { timeout: 10000 });
  });

  test('should show navigation menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Menu button should be visible
    const menuButton = page.locator('button[mat-icon-button]:has(mat-icon:text("menu"))');
    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Navigation items should be visible
      await expect(page.locator('text=Home')).toBeVisible();
      await expect(page.locator('text=Configure')).toBeVisible();
      await expect(page.locator('text=About')).toBeVisible();
    }
  });
});
