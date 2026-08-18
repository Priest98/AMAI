import { test, expect } from '@playwright/test';

test.describe('AMAI Application', () => {
  test('application loads successfully', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/.+/);

    await expect(page.locator('body')).toBeVisible();
  });

  test('page has no obvious application error', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('/');

    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
  });
});