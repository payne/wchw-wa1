import { test, expect, Page } from '@playwright/test';
import { TEST_DATA, waitForAngular } from './fixtures';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);
  });

  test('should display the home page with form and table', async ({ page }) => {
    // Check for the signal report form
    await expect(page.locator('mat-card-title:has-text("Log Signal Report")')).toBeVisible({ timeout: 10000 });

    // Check for form fields
    await expect(page.locator('input[name="transmitterCall"]')).toBeVisible();
    await expect(page.locator('input[name="signalHeard"]')).toBeVisible();
    await expect(page.locator('input[name="time"]')).toBeVisible();

    // Check for submit button
    await expect(page.locator('button:has-text("Submit Report")')).toBeVisible();
  });

  test('should display the signal map', async ({ page }) => {
    // Check for map card
    await expect(page.locator('mat-card-title:has-text("Signal Map")')).toBeVisible({ timeout: 10000 });

    // Check for map container
    await expect(page.locator('.map-container')).toBeVisible();

    // Check for map legend
    await expect(page.locator('.map-legend')).toBeVisible();
  });

  test('should display the signal reports table', async ({ page }) => {
    // Check for table card
    await expect(page.locator('mat-card-title:has-text("Signal Reports")')).toBeVisible({ timeout: 10000 });

    // Check for AG Grid
    await expect(page.locator('ag-grid-angular')).toBeVisible();

    // Check for column headers
    await expect(page.locator('.ag-header-cell:has-text("Transmitter")')).toBeVisible();
    await expect(page.locator('.ag-header-cell:has-text("Signal")')).toBeVisible();
    await expect(page.locator('.ag-header-cell:has-text("Time")')).toBeVisible();
    await expect(page.locator('.ag-header-cell:has-text("Receiver")')).toBeVisible();
    await expect(page.locator('.ag-header-cell:has-text("Distance")')).toBeVisible();
  });

  test('should have expand/collapse all buttons', async ({ page }) => {
    // Check for expand all button
    await expect(page.locator('button mat-icon:has-text("unfold_more")')).toBeVisible({ timeout: 10000 });

    // Check for collapse all button
    await expect(page.locator('button mat-icon:has-text("unfold_less")')).toBeVisible();
  });

  test('should toggle map and table positions', async ({ page }) => {
    // Find the swap button
    const swapButton = page.locator('button:has-text("Show Table First"), button:has-text("Show Map First")');
    await expect(swapButton).toBeVisible({ timeout: 10000 });

    // Get initial button text
    const initialText = await swapButton.textContent();

    // Click to swap
    await swapButton.click();
    await waitForAngular(page);

    // Button text should change
    const newText = await swapButton.textContent();
    expect(newText).not.toBe(initialText);
  });

  test('should auto-populate time field', async ({ page }) => {
    const timeInput = page.locator('input[name="time"]');
    await expect(timeInput).toBeVisible({ timeout: 10000 });

    // Time field should have a value (auto-populated)
    const value = await timeInput.inputValue();
    expect(value).toBeTruthy();
    expect(value).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  });

  test('submit button should be disabled with empty fields', async ({ page }) => {
    const submitButton = page.locator('button:has-text("Submit Report")');
    await expect(submitButton).toBeVisible({ timeout: 10000 });

    // Clear any existing values
    await page.locator('input[name="transmitterCall"]').fill('');
    await page.locator('input[name="signalHeard"]').fill('');

    // Submit button should be disabled
    await expect(submitButton).toBeDisabled();
  });
});

test.describe('Home Page - Authenticated', () => {
  // These tests require authentication
  // They will be skipped if not authenticated

  test.skip('should submit a signal report', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    // Fill in the form
    await page.locator('input[name="transmitterCall"]').fill(TEST_DATA.transmitters[0]);
    await page.locator('input[name="signalHeard"]').fill('59');

    // Submit
    await page.locator('button:has-text("Submit Report")').click();

    // Wait for success message
    await expect(page.locator('mat-snack-bar-container')).toContainText('submitted', { timeout: 10000 });

    // Report should appear in grid
    await expect(page.locator(`.ag-cell:has-text("${TEST_DATA.transmitters[0]}")`)).toBeVisible();
  });

  test.skip('should expand and collapse rows', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    // Wait for grid to load
    await expect(page.locator('.ag-row')).toBeVisible({ timeout: 10000 });

    // Click expand button on first row
    const expandButton = page.locator('.ag-row').first().locator('.expand-cell');
    if (await expandButton.isVisible()) {
      await expandButton.click();

      // Expanded content should be visible
      await expect(page.locator('.inline-details').first()).toBeVisible();

      // Click again to collapse
      await expandButton.click();
    }
  });

  test.skip('should expand all rows', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    // Wait for grid to load with data
    await expect(page.locator('.ag-row')).toBeVisible({ timeout: 10000 });

    // Click expand all button
    await page.locator('button:has(mat-icon:text("unfold_more"))').click();
    await waitForAngular(page);

    // All expanded content should be visible
    const rows = await page.locator('.ag-row').count();
    if (rows > 0) {
      await expect(page.locator('.inline-details')).toHaveCount(rows);
    }
  });

  test.skip('should collapse all rows', async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);

    // Expand all first
    await page.locator('button:has(mat-icon:text("unfold_more"))').click();
    await waitForAngular(page);

    // Then collapse all
    await page.locator('button:has(mat-icon:text("unfold_less"))').click();
    await waitForAngular(page);

    // No expanded content should be visible
    await expect(page.locator('.inline-details')).toHaveCount(0);
  });
});
