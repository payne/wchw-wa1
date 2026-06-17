import { test as base, expect, Page } from '@playwright/test';

// Test data
export const TEST_DATA = {
  receiver: 'N3PAY',
  transmitters: ['KX0U', 'KF0VWD', 'KF0SLC', 'KF0UWE', 'KD0NMD'],
  locations: {
    home: {
      nickname: 'Home QTH',
      address: '123 Main St, Denver, CO',
    },
    portable: {
      nickname: 'Portable',
      address: 'Rocky Mountain National Park, CO',
    },
  },
  radios: {
    ht: {
      nickname: 'HT',
      make: 'Yaesu',
      model: 'FT-60R',
      antenna: 'Stock rubber duck',
      description: 'Handheld for portable ops',
    },
    mobile: {
      nickname: 'Mobile',
      make: 'Kenwood',
      model: 'TM-V71A',
      antenna: 'Mag mount',
      description: 'Mobile rig',
    },
  },
  groups: {
    fieldDay: 'Field Day 2026',
    weeklyNet: 'Weekly Net',
  },
  repeater: {
    callSign: 'W0JJK',
    frequency: '145.235',
  },
  simplexFrequency: '146.52',
};

// Helper functions
export async function waitForAngular(page: Page) {
  // Wait for Angular to be ready
  await page.waitForFunction(() => {
    return (window as any).getAllAngularTestabilities?.()?.every((t: any) => t.isStable());
  }, { timeout: 10000 }).catch(() => {
    // Fallback if Angular testability not available
  });
  await page.waitForLoadState('networkidle');
}

export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await waitForAngular(page);
}

export async function fillMatInput(page: Page, label: string, value: string) {
  const field = page.locator(`mat-form-field:has(mat-label:text("${label}")) input`);
  await field.fill(value);
}

export async function fillMatTextarea(page: Page, label: string, value: string) {
  const field = page.locator(`mat-form-field:has(mat-label:text("${label}")) textarea`);
  await field.fill(value);
}

export async function selectMatOption(page: Page, label: string, optionText: string) {
  const select = page.locator(`mat-form-field:has(mat-label:text("${label}")) mat-select`);
  await select.click();
  await page.locator(`mat-option:has-text("${optionText}")`).click();
}

export async function clickButton(page: Page, text: string) {
  await page.locator(`button:has-text("${text}")`).click();
}

export async function expectSnackbar(page: Page, text: string) {
  await expect(page.locator('mat-snack-bar-container')).toContainText(text, { timeout: 5000 });
}

// Extended test with authentication state
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Note: For real auth testing, you would need to:
    // 1. Use a test account
    // 2. Store auth state in a file
    // 3. Reuse across tests
    // For now, tests assume manual login or use storage state
    await use(page);
  },
});

export { expect };
