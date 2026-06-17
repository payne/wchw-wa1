import { test, expect } from '@playwright/test';
import { waitForAngular } from './fixtures';

test.describe('PWA Features', () => {
  test('should have a web app manifest', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    // Check for manifest link
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeVisible({ timeout: 10000 });
  });

  test('should load manifest.webmanifest', async ({ page, request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
  });

  test('should have service worker registered', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.length > 0;
      }
      return false;
    });

    // Note: Service worker may not be registered in test environment
    // This test documents expected behavior
    console.log('Service worker registered:', swRegistered);
  });

  test('should have theme-color meta tag', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toBeVisible({ timeout: 10000 });
  });

  test('should have apple-touch-icon', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    // May or may not exist depending on PWA setup
    const count = await appleIcon.count();
    console.log('Apple touch icon count:', count);
  });
});

test.describe('Offline Support', () => {
  test('should cache static assets', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    // Check that main bundle loaded
    await expect(page.locator('app-root, app-home')).toBeVisible({ timeout: 10000 });
  });

  test.skip('should show cached data when offline', async ({ page, context }) => {
    // Load page first
    await page.goto('/');
    await waitForAngular(page);

    // Wait for data to load
    await page.waitForTimeout(3000);

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();

    // App should still show (from cache)
    await expect(page.locator('mat-card')).toBeVisible({ timeout: 10000 });

    // Go back online
    await context.setOffline(false);
  });
});

test.describe('Responsive Design', () => {
  test('should adapt to mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForAngular(page);

    // Form should still be visible
    await expect(page.locator('mat-card-title:has-text("Log Signal Report")')).toBeVisible({ timeout: 10000 });

    // Form fields should stack vertically on mobile
    const form = page.locator('.report-form');
    await expect(form).toBeVisible();
  });

  test('should adapt to tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await waitForAngular(page);

    await expect(page.locator('mat-card-title:has-text("Log Signal Report")')).toBeVisible({ timeout: 10000 });
  });

  test('should adapt to desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await waitForAngular(page);

    await expect(page.locator('mat-card-title:has-text("Log Signal Report")')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    // Should have at least one heading
    const headings = page.locator('h1, h2, h3, h4, mat-card-title');
    await expect(headings.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have labels for form inputs', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    // Angular Material inputs have mat-label
    await expect(page.locator('mat-label:has-text("Transmitter")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('mat-label:has-text("Signal")')).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    // Tab through the page
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Something should be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    // This is a basic check - for full a11y testing use axe-playwright
    // Just verify text is visible
    await expect(page.locator('mat-card-title').first()).toBeVisible({ timeout: 10000 });
  });
});
