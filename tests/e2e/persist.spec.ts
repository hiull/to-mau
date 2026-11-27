import { test, expect } from '@playwright/test';
import { canvasSize, colorAt, screenPoint, waitReady, waitSaved } from './helpers';

async function fillCenter(page: import('@playwright/test').Page) {
  const [w, h] = await canvasSize(page);
  await page.getByTestId('swatch-#2a9d8f').click();
  const [sx, sy] = await screenPoint(page, w / 2, h / 2);
  await page.mouse.click(sx, sy);
  return [w, h];
}

test('tô xong, tải lại trang vẫn còn màu và thư viện có ảnh thu nhỏ mới', async ({ page }) => {
  await page.goto('./');
  const before = await page.locator('[data-testid=card] img').first().getAttribute('src');
  await page.locator('[data-testid=card]').first().click();
  await waitReady(page);
  const id = decodeURIComponent(page.url().split('#/to/')[1]);
  const [w, h] = await fillCenter(page);
  await waitSaved(page, id);
  await page.reload();
  await waitReady(page);
  expect((await colorAt(page, w / 2, h / 2)).slice(0, 3)).toEqual([0x2a, 0x9d, 0x8f]);
  await page.getByTestId('back').click();
  const after = await page.locator('[data-testid=card] img').first().getAttribute('src');
  expect(after).not.toBe(before);
  expect(after).toMatch(/^blob:/);
});

test('Tô lại từ đầu xoá hết màu', async ({ page }) => {
  await page.goto('./#/to/__fixture');
  await waitReady(page);
  const [w, h] = await fillCenter(page);
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('reset').click();
  expect((await colorAt(page, w / 2, h / 2))[3]).toBe(0);
});

test('Lưu ảnh tải về file PNG', async ({ page }) => {
  await page.goto('./#/to/__fixture');
  await waitReady(page);
  await fillCenter(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export').click()]);
  expect(dl.suggestedFilename()).toBe('Hinh thu.png');
});
