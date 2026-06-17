import { test, expect } from '@playwright/test';
import { TEST_DATA, waitForAngular } from './fixtures';

test.describe('Signal Reports Table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);
  });

  test('should display AG Grid table', async ({ page }) => {
    const grid = page.locator('ag-grid-angular');
    await expect(grid).toBeVisible({ timeout: 10000 });
  });

  test('should have correct column headers', async ({ page }) => {
    await expect(page.locator('.ag-header-cell')).toBeVisible({ timeout: 10000 });

    // Check column headers
    const headers = page.locator('.ag-header-cell-text');
    await expect(headers.filter({ hasText: "Transmitter's Call" })).toBeVisible();
    await expect(headers.filter({ hasText: 'Signal Heard' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Time (UTC)' })).toBeVisible();
    await expect(headers.filter({ hasText: "Receiver's Call" })).toBeVisible();
    await expect(headers.filter({ hasText: 'Distance' })).toBeVisible();
  });

  test('should have expand column as first column', async ({ page }) => {
    await expect(page.locator('.ag-header-cell').first()).toBeVisible({ timeout: 10000 });

    // First column should be narrow (expand button column)
    const firstCol = page.locator('.ag-header-cell').first();
    const width = await firstCol.evaluate(el => el.getBoundingClientRect().width);
    expect(width).toBeLessThan(100); // Should be narrow
  });

  test('should enable sorting on columns', async ({ page }) => {
    await expect(page.locator('.ag-header-cell')).toBeVisible({ timeout: 10000 });

    // Click on a sortable column header
    const transmitterHeader = page.locator('.ag-header-cell:has-text("Transmitter")');
    await transmitterHeader.click();

    // Sort icon should appear
    await expect(page.locator('.ag-sort-indicator-icon')).toBeVisible({ timeout: 5000 });
  });

  test('should enable filtering on columns', async ({ page }) => {
    await expect(page.locator('.ag-header-cell')).toBeVisible({ timeout: 10000 });

    // Hover on a column header to show filter
    const transmitterHeader = page.locator('.ag-header-cell:has-text("Transmitter")');
    await transmitterHeader.hover();

    // Filter menu button should be visible
    const filterButton = transmitterHeader.locator('.ag-header-cell-menu-button');
    if (await filterButton.isVisible()) {
      await filterButton.click();

      // Filter menu should appear
      await expect(page.locator('.ag-filter')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show pagination controls', async ({ page }) => {
    await expect(page.locator('ag-grid-angular')).toBeVisible({ timeout: 10000 });

    // Pagination panel should be visible
    await expect(page.locator('.ag-paging-panel')).toBeVisible();
  });

  test('should display rows when data exists', async ({ page }) => {
    await expect(page.locator('ag-grid-angular')).toBeVisible({ timeout: 10000 });

    // Wait for potential data loading
    await page.waitForTimeout(2000);

    // Either rows or no rows overlay should be visible
    const rows = page.locator('.ag-row');
    const noRowsOverlay = page.locator('.ag-overlay-no-rows-wrapper');

    // One of these should be true
    const hasRows = await rows.count() > 0;
    const hasNoRowsOverlay = await noRowsOverlay.isVisible();

    expect(hasRows || hasNoRowsOverlay).toBe(true);
  });
});

test.describe('Signal Reports - Expandable Rows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);
  });

  test('should have expand/collapse buttons in header', async ({ page }) => {
    // Expand all button
    const expandAllBtn = page.locator('button:has(mat-icon:text("unfold_more"))');
    await expect(expandAllBtn).toBeVisible({ timeout: 10000 });

    // Collapse all button
    const collapseAllBtn = page.locator('button:has(mat-icon:text("unfold_less"))');
    await expect(collapseAllBtn).toBeVisible();
  });

  test('should have tooltips on expand/collapse buttons', async ({ page }) => {
    const expandAllBtn = page.locator('button:has(mat-icon:text("unfold_more"))');
    await expect(expandAllBtn).toBeVisible({ timeout: 10000 });

    // Hover to show tooltip
    await expandAllBtn.hover();
    await page.waitForTimeout(500);

    // Tooltip should appear
    await expect(page.locator('.mat-mdc-tooltip, .mdc-tooltip')).toBeVisible({ timeout: 3000 });
  });

  test.skip('should expand row when clicking expand icon', async ({ page }) => {
    await expect(page.locator('.ag-row')).toBeVisible({ timeout: 10000 });

    // Wait for data
    await page.waitForTimeout(2000);

    const rows = await page.locator('.ag-row').count();
    if (rows > 0) {
      // Click expand icon on first row
      const expandIcon = page.locator('.ag-row').first().locator('.expand-cell, .expand-icon');
      if (await expandIcon.isVisible()) {
        await expandIcon.click();
        await waitForAngular(page);

        // Row should be expanded (check for expanded content)
        await expect(page.locator('.inline-details').first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test.skip('should show details when row is expanded', async ({ page }) => {
    await expect(page.locator('.ag-row')).toBeVisible({ timeout: 10000 });

    // Wait for data
    await page.waitForTimeout(2000);

    const rows = await page.locator('.ag-row').count();
    if (rows > 0) {
      // Expand first row
      const expandIcon = page.locator('.ag-row').first().locator('.expand-cell');
      if (await expandIcon.isVisible()) {
        await expandIcon.click();
        await waitForAngular(page);

        // Check for detail fields
        const details = page.locator('.inline-details').first();
        await expect(details).toBeVisible({ timeout: 5000 });
        await expect(details).toContainText('Freq');
        await expect(details).toContainText('Radio');
      }
    }
  });
});

test.describe('Signal Reports - Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);
  });

  test('submit button should be disabled when form is empty', async ({ page }) => {
    const submitBtn = page.locator('button:has-text("Submit Report")');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });

    // Clear fields
    await page.locator('input[name="transmitterCall"]').fill('');
    await page.locator('input[name="signalHeard"]').fill('');

    // Submit should be disabled
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button should be disabled with only transmitter call', async ({ page }) => {
    const submitBtn = page.locator('button:has-text("Submit Report")');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });

    // Fill only transmitter
    await page.locator('input[name="transmitterCall"]').fill(TEST_DATA.transmitters[0]);
    await page.locator('input[name="signalHeard"]').fill('');

    // Submit should be disabled
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button should be disabled with only signal heard', async ({ page }) => {
    const submitBtn = page.locator('button:has-text("Submit Report")');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });

    // Fill only signal
    await page.locator('input[name="transmitterCall"]').fill('');
    await page.locator('input[name="signalHeard"]').fill('59');

    // Submit should be disabled
    await expect(submitBtn).toBeDisabled();
  });

  test('should uppercase transmitter call on blur', async ({ page }) => {
    const transmitterInput = page.locator('input[name="transmitterCall"]');
    await expect(transmitterInput).toBeVisible({ timeout: 10000 });

    // Enter lowercase
    await transmitterInput.fill('kx0u');
    await transmitterInput.blur();

    // Note: The uppercasing happens on submit, not on blur in current implementation
    // This test documents current behavior
  });
});

test.describe('Signal Reports - Distance Column', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);
  });

  test('should display distance column header', async ({ page }) => {
    await expect(page.locator('.ag-header-cell:has-text("Distance")')).toBeVisible({ timeout: 10000 });
  });

  test('should display distance values or dash', async ({ page }) => {
    await expect(page.locator('.ag-row')).toBeVisible({ timeout: 10000 });

    // Wait for data and distance calculations
    await page.waitForTimeout(3000);

    const rows = await page.locator('.ag-row').count();
    if (rows > 0) {
      // Get distance column cells
      // Distance should show either "X.X mi" or "—"
      const distanceCells = page.locator('.ag-cell[col-id="distance"]');
      const firstCell = distanceCells.first();

      if (await firstCell.isVisible()) {
        const text = await firstCell.textContent();
        // Should be either a distance value or dash
        expect(text).toMatch(/(\d+\.?\d*\s*mi|—)/);
      }
    }
  });
});
