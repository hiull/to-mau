import { test, expect } from '@playwright/test';
import { waitReady } from './helpers';

test('thư viện hiển thị 6 hình mỗi cấp và mở được hình', async ({ page }) => {
  await page.goto('./');
  const cards = page.locator('[data-testid=card]');
  await expect(cards).toHaveCount(6);
  await expect(page.getByTestId('tab-de')).toHaveClass(/active/);
  const firstEasy = await cards.first().textContent();
  await page.getByTestId('tab-kho').click();
  await expect(cards.first()).not.toHaveText(firstEasy!);
  await expect(cards).toHaveCount(6);
  await cards.first().click();
  await expect(page).toHaveURL(/#\/to\//);
  await waitReady(page);
  await page.getByTestId('back').click();
  await expect(cards).toHaveCount(6);
});

test('tab Của tôi trống thì hiện lời nhắc thêm hình', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('tab-mine').click();
  await expect(page.getByText('Chưa có hình nào')).toBeVisible();
});
