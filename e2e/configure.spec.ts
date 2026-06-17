import { test, expect } from '@playwright/test';
import { TEST_DATA, waitForAngular, fillMatInput, clickButton, expectSnackbar } from './fixtures';

test.describe('Configure Page - Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/configure');
    await waitForAngular(page);
  });

  test('should display all configuration sections', async ({ page }) => {
    // Operator Information section
    await expect(page.locator('mat-card-title:has-text("Operator Information")')).toBeVisible({ timeout: 10000 });

    // Locations section
    await expect(page.locator('mat-card-title:has-text("Locations")')).toBeVisible();

    // Frequency Mode section
    await expect(page.locator('mat-card-title:has-text("Frequency Mode")')).toBeVisible();

    // Radio Setups section
    await expect(page.locator('mat-card-title:has-text("Radio Setups")')).toBeVisible();

    // Signal Report Groups section
    await expect(page.locator('mat-card-title:has-text("Signal Report Groups")')).toBeVisible();

    // Export Data section
    await expect(page.locator('mat-card-title:has-text("Export Data")')).toBeVisible();
  });

  test('should have call sign input field', async ({ page }) => {
    const callSignInput = page.locator('mat-form-field:has(mat-label:text("Call Sign")) input');
    await expect(callSignInput).toBeVisible({ timeout: 10000 });
  });

  test('should have location form fields', async ({ page }) => {
    await expect(page.locator('mat-form-field:has(mat-label:text("Nickname"))')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('mat-form-field:has(mat-label:text("Address"))')).toBeVisible();
    await expect(page.locator('mat-form-field:has(mat-label:text("Latitude"))')).toBeVisible();
    await expect(page.locator('mat-form-field:has(mat-label:text("Longitude"))')).toBeVisible();
    await expect(page.locator('button:has-text("Use Current")')).toBeVisible();
  });

  test('should have frequency mode radio buttons', async ({ page }) => {
    await expect(page.locator('mat-radio-button:has-text("Simplex")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('mat-radio-button:has-text("Repeater")')).toBeVisible();
  });

  test('should have radio setup form fields', async ({ page }) => {
    // Scroll to radio setups section
    await page.locator('mat-card-title:has-text("Radio Setups")').scrollIntoViewIfNeeded();

    await expect(page.locator('mat-form-field:has(mat-label:text("Make"))')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('mat-form-field:has(mat-label:text("Model"))')).toBeVisible();
    await expect(page.locator('mat-form-field:has(mat-label:text("Antenna"))')).toBeVisible();
    await expect(page.locator('mat-form-field:has(mat-label:text("Description"))')).toBeVisible();
  });

  test('should have group form fields', async ({ page }) => {
    // Scroll to groups section
    await page.locator('mat-card-title:has-text("Signal Report Groups")').scrollIntoViewIfNeeded();

    await expect(page.locator('mat-form-field:has(mat-label:text("Group Nickname"))')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Create Group")')).toBeVisible();
  });

  test('should have export buttons', async ({ page }) => {
    // Scroll to export section
    await page.locator('mat-card-title:has-text("Export Data")').scrollIntoViewIfNeeded();

    await expect(page.locator('button:has-text("Download All (CSV)")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Download All (JSON)")')).toBeVisible();
    await expect(page.locator('button:has-text("Download Group (CSV)")')).toBeVisible();
    await expect(page.locator('button:has-text("Download Group (JSON)")')).toBeVisible();
  });
});

test.describe('Configure Page - Frequency Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/configure');
    await waitForAngular(page);
  });

  test('should show simplex frequency field when simplex selected', async ({ page }) => {
    // Click simplex radio button
    await page.locator('mat-radio-button:has-text("Simplex")').click();
    await waitForAngular(page);

    // Should see simplex frequency field
    await expect(page.locator('mat-form-field:has(mat-label:text("Simplex Frequency"))')).toBeVisible({ timeout: 5000 });
  });

  test('should show repeater fields when repeater selected', async ({ page }) => {
    // Click repeater radio button
    await page.locator('mat-radio-button:has-text("Repeater")').click();
    await waitForAngular(page);

    // Should see repeater fields
    await expect(page.locator('mat-form-field:has(mat-label:text("Search Repeater"))')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('mat-form-field:has(mat-label:text("Repeater Call Sign"))')).toBeVisible();
    await expect(page.locator('mat-form-field:has(mat-label:text("Repeater Frequency"))')).toBeVisible();
  });
});

test.describe('Configure Page - AG Grids', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/configure');
    await waitForAngular(page);
  });

  test('should display locations grid', async ({ page }) => {
    // Locations grid should be visible
    const locationsSection = page.locator('mat-card:has(mat-card-title:text("Locations"))');
    await expect(locationsSection.locator('ag-grid-angular')).toBeVisible({ timeout: 10000 });
  });

  test('should display radio setups grid', async ({ page }) => {
    // Radio setups grid should be visible
    const radioSection = page.locator('mat-card:has(mat-card-title:text("Radio Setups"))');
    await expect(radioSection.locator('ag-grid-angular')).toBeVisible({ timeout: 10000 });
  });

  test('should display groups grid', async ({ page }) => {
    // Groups grid should be visible
    const groupsSection = page.locator('mat-card:has(mat-card-title:text("Signal Report Groups"))');
    await expect(groupsSection.locator('ag-grid-angular')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Configure Page - Authenticated', () => {
  // These tests require authentication

  test.skip('should save call sign', async ({ page }) => {
    await page.goto('/configure');
    await waitForAngular(page);

    const callSignInput = page.locator('mat-form-field:has(mat-label:text("Call Sign")) input');
    await callSignInput.fill(TEST_DATA.receiver);

    await page.locator('button:has-text("Save")').first().click();

    await expectSnackbar(page, 'Call sign saved');
  });

  test.skip('should add a location', async ({ page }) => {
    await page.goto('/configure');
    await waitForAngular(page);

    // Fill in location form
    const locationsSection = page.locator('mat-card:has(mat-card-title:text("Locations"))');
    await locationsSection.locator('input[placeholder*="Home QTH"]').fill(TEST_DATA.locations.home.nickname);

    await fillMatInput(page, 'Address', TEST_DATA.locations.home.address);

    await page.locator('button:has-text("Add Location")').click();

    await expectSnackbar(page, 'Location added');
  });

  test.skip('should add a radio setup', async ({ page }) => {
    await page.goto('/configure');
    await waitForAngular(page);

    // Scroll to radio section
    await page.locator('mat-card-title:has-text("Radio Setups")').scrollIntoViewIfNeeded();

    // Fill in radio form - find the fields in the Radio Setups section
    const radioSection = page.locator('mat-card:has(mat-card-title:text("Radio Setups"))');

    await radioSection.locator('input[placeholder*="Shack"]').fill(TEST_DATA.radios.ht.nickname);
    await radioSection.locator('input[placeholder*="Yaesu"]').fill(TEST_DATA.radios.ht.make);
    await radioSection.locator('input[placeholder*="FT-991"]').fill(TEST_DATA.radios.ht.model);
    await radioSection.locator('input[placeholder*="Diamond"]').fill(TEST_DATA.radios.ht.antenna);
    await radioSection.locator('textarea').fill(TEST_DATA.radios.ht.description);

    await page.locator('button:has-text("Add Radio Setup")').click();

    await expectSnackbar(page, 'Radio setup added');
  });

  test.skip('should create a group', async ({ page }) => {
    await page.goto('/configure');
    await waitForAngular(page);

    // Scroll to groups section
    await page.locator('mat-card-title:has-text("Signal Report Groups")').scrollIntoViewIfNeeded();

    // Fill in group nickname
    const groupsSection = page.locator('mat-card:has(mat-card-title:text("Signal Report Groups"))');
    await groupsSection.locator('input[placeholder*="Field Day"]').fill(TEST_DATA.groups.fieldDay);

    await page.locator('button:has-text("Create Group")').click();

    await expectSnackbar(page, 'created');
  });

  test.skip('should export all data as CSV', async ({ page }) => {
    await page.goto('/configure');
    await waitForAngular(page);

    // Scroll to export section
    await page.locator('mat-card-title:has-text("Export Data")').scrollIntoViewIfNeeded();

    // Set up download handler
    const downloadPromise = page.waitForEvent('download');

    await page.locator('button:has-text("Download All (CSV)")').click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test.skip('should export all data as JSON', async ({ page }) => {
    await page.goto('/configure');
    await waitForAngular(page);

    // Scroll to export section
    await page.locator('mat-card-title:has-text("Export Data")').scrollIntoViewIfNeeded();

    // Set up download handler
    const downloadPromise = page.waitForEvent('download');

    await page.locator('button:has-text("Download All (JSON)")').click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.json');
  });
});
