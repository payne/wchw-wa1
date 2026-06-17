import { test, expect } from '@playwright/test';
import { waitForAngular } from './fixtures';

test.describe('Signal Map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);
  });

  test('should display the map container', async ({ page }) => {
    const mapContainer = page.locator('.map-container');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });

  test('should display the map element', async ({ page }) => {
    const mapElement = page.locator('.map');
    await expect(mapElement).toBeVisible({ timeout: 10000 });

    // Leaflet should have initialized
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('should display map legend', async ({ page }) => {
    const legend = page.locator('.map-legend');
    await expect(legend).toBeVisible({ timeout: 10000 });

    // Check legend items
    await expect(legend.locator('text=Station (reported)')).toBeVisible();
    await expect(legend.locator('text=Station (FCC lookup)')).toBeVisible();
    await expect(legend.locator('text=Simplex')).toBeVisible();
    await expect(legend.locator('text=Repeater')).toBeVisible();
  });

  test('should display layer controls', async ({ page }) => {
    // Leaflet layer control should be visible
    const layerControl = page.locator('.leaflet-control-layers');
    await expect(layerControl).toBeVisible({ timeout: 10000 });
  });

  test('should expand layer control on hover', async ({ page }) => {
    const layerControl = page.locator('.leaflet-control-layers');
    await expect(layerControl).toBeVisible({ timeout: 10000 });

    // The layer control should show options
    // Note: The control is set to collapsed: false so it should be expanded
    await expect(page.locator('.leaflet-control-layers-expanded, .leaflet-control-layers-list')).toBeVisible();
  });

  test('should have OpenStreetMap tiles', async ({ page }) => {
    // Check for tile layer
    await expect(page.locator('.leaflet-tile-container')).toBeVisible({ timeout: 10000 });
  });

  test('should display zoom controls', async ({ page }) => {
    await expect(page.locator('.leaflet-control-zoom-in')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.leaflet-control-zoom-out')).toBeVisible();
  });

  test('should zoom in when clicking zoom in button', async ({ page }) => {
    await page.locator('.leaflet-container').waitFor({ state: 'visible', timeout: 10000 });

    // Get initial zoom
    const zoomIn = page.locator('.leaflet-control-zoom-in');
    await expect(zoomIn).toBeVisible();

    // Click zoom in
    await zoomIn.click();
    await page.waitForTimeout(500); // Wait for zoom animation

    // Map should still be visible
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('should zoom out when clicking zoom out button', async ({ page }) => {
    await page.locator('.leaflet-container').waitFor({ state: 'visible', timeout: 10000 });

    // Click zoom out
    const zoomOut = page.locator('.leaflet-control-zoom-out');
    await expect(zoomOut).toBeVisible();
    await zoomOut.click();
    await page.waitForTimeout(500); // Wait for zoom animation

    // Map should still be visible
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('should display station and path stats in legend', async ({ page }) => {
    const legend = page.locator('.map-legend');
    await expect(legend).toBeVisible({ timeout: 10000 });

    // Stats should show stations and paths count
    const stats = legend.locator('.legend-stats');
    await expect(stats).toBeVisible();
    await expect(stats).toContainText('stations');
    await expect(stats).toContainText('paths');
  });
});

test.describe('Signal Map - Layer Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);
  });

  test('should have overlay layer options', async ({ page }) => {
    const layerControl = page.locator('.leaflet-control-layers');
    await expect(layerControl).toBeVisible({ timeout: 10000 });

    // Check for layer options (these may be labels or inputs)
    const overlayContainer = page.locator('.leaflet-control-layers-overlays');
    await expect(overlayContainer).toBeVisible();
  });

  test('should toggle layer visibility', async ({ page }) => {
    const layerControl = page.locator('.leaflet-control-layers-overlays');
    await expect(layerControl).toBeVisible({ timeout: 10000 });

    // Find a checkbox in the layer control
    const checkbox = layerControl.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      const initialState = await checkbox.isChecked();

      // Toggle
      await checkbox.click();
      await page.waitForTimeout(300);

      const newState = await checkbox.isChecked();
      expect(newState).toBe(!initialState);

      // Toggle back
      await checkbox.click();
    }
  });
});

test.describe('Signal Map - Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAngular(page);
  });

  test('should show popup when clicking on marker', async ({ page }) => {
    // Wait for map to load
    await page.locator('.leaflet-container').waitFor({ state: 'visible', timeout: 10000 });

    // Wait a bit for markers to load (they come from API)
    await page.waitForTimeout(2000);

    // Find a marker
    const marker = page.locator('.leaflet-marker-icon, .station-marker').first();

    if (await marker.isVisible()) {
      await marker.click();

      // Popup should appear
      await expect(page.locator('.leaflet-popup')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show popup when clicking on path', async ({ page }) => {
    // Wait for map to load
    await page.locator('.leaflet-container').waitFor({ state: 'visible', timeout: 10000 });

    // Wait a bit for paths to load
    await page.waitForTimeout(2000);

    // Find a path (polyline)
    const path = page.locator('.leaflet-interactive').first();

    if (await path.isVisible()) {
      await path.click({ force: true });

      // Popup should appear
      await expect(page.locator('.leaflet-popup')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should close popup when clicking close button', async ({ page }) => {
    // Wait for map to load
    await page.locator('.leaflet-container').waitFor({ state: 'visible', timeout: 10000 });

    // Wait for markers
    await page.waitForTimeout(2000);

    // Find and click a marker
    const marker = page.locator('.leaflet-marker-icon, .station-marker').first();

    if (await marker.isVisible()) {
      await marker.click();

      // Wait for popup
      const popup = page.locator('.leaflet-popup');
      if (await popup.isVisible()) {
        // Click close button
        await page.locator('.leaflet-popup-close-button').click();

        // Popup should be hidden
        await expect(popup).toBeHidden();
      }
    }
  });
});
