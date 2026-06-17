import { test, expect } from '@playwright/test';
import { waitForAngular } from './fixtures';

test.describe('Navigation', () => {
  test('should navigate to home page', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    await expect(page.locator('mat-card-title:has-text("Log Signal Report")')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to configure page', async ({ page }) => {
    await page.goto('/configure');
    await waitForAngular(page);

    await expect(page.locator('mat-card-title:has-text("Operator Information")')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/about');
    await waitForAngular(page);

    // About page should have some content
    await expect(page.locator('mat-card')).toBeVisible({ timeout: 10000 });
  });

  test('should have working navigation menu', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    // Open menu (if hamburger menu exists)
    const menuButton = page.locator('button[mat-icon-button]:has(mat-icon:text("menu"))');

    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);

      // Click Configure
      await page.locator('mat-nav-list a:has-text("Configure"), mat-list-item:has-text("Configure")').click();
      await waitForAngular(page);

      // Should be on configure page
      await expect(page.locator('mat-card-title:has-text("Operator Information")')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should navigate from configure to home via menu', async ({ page }) => {
    await page.goto('/configure');
    await waitForAngular(page);

    // Open menu
    const menuButton = page.locator('button[mat-icon-button]:has(mat-icon:text("menu"))');

    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);

      // Click Home
      await page.locator('mat-nav-list a:has-text("Home"), mat-list-item:has-text("Home")').click();
      await waitForAngular(page);

      // Should be on home page
      await expect(page.locator('mat-card-title:has-text("Log Signal Report")')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should navigate to about via menu', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    // Open menu
    const menuButton = page.locator('button[mat-icon-button]:has(mat-icon:text("menu"))');

    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);

      // Click About
      await page.locator('mat-nav-list a:has-text("About"), mat-list-item:has-text("About")').click();
      await waitForAngular(page);

      // Should be on about page
      await expect(page).toHaveURL(/.*about/);
    }
  });
});

test.describe('About Page', () => {
  test('should display about page content', async ({ page }) => {
    await page.goto('/about');
    await waitForAngular(page);

    // Should have at least one card
    await expect(page.locator('mat-card')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Responsive Navigation', () => {
  test('should show sidenav on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await waitForAngular(page);

    // Menu button should be visible
    const menuButton = page.locator('button[mat-icon-button]:has(mat-icon:text("menu"))');
    await expect(menuButton).toBeVisible({ timeout: 10000 });
  });

  test('should toggle sidenav on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await waitForAngular(page);

    // Click menu button
    const menuButton = page.locator('button[mat-icon-button]:has(mat-icon:text("menu"))');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);

      // Sidenav should be visible
      await expect(page.locator('mat-sidenav, mat-drawer')).toBeVisible();
    }
  });
});
