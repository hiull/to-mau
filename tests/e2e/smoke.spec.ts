import { test, expect } from '@playwright/test';

test('trang chủ có tiêu đề và manifest PWA', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Tô Màu');
  await expect(page.locator('link[rel=manifest]')).toHaveCount(1);
});
