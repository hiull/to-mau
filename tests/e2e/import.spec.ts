import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { canvasSize, colorAt, screenPoint, waitReady } from './helpers';

const housePng = () => new Resvg(readFileSync('public/drawings/ngoi-nha.svg', 'utf8'), { fitTo: { mode: 'width', value: 800 }, background: '#fff' }).render().asPng();
const bigPng = () => new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="3000"><rect width="4000" height="3000" fill="#fff"/><circle cx="2000" cy="1500" r="1000" fill="none" stroke="#000" stroke-width="30"/></svg>`).render().asPng();

test('import tranh nét, lưu vào Của tôi và tô được', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('add-image').click();
  await page.getByTestId('file-input').setInputFiles({ name: 'nha-cua-be.png', mimeType: 'image/png', buffer: housePng() });
  await expect(page.getByTestId('import-preview')).toBeVisible();
  await expect(page.getByTestId('mode-drawing')).toHaveClass(/active/);
  await expect(page.getByTestId('import-name')).toHaveValue('nha-cua-be');
  await page.getByTestId('import-name').fill('Nhà của bé');
  await page.getByTestId('save-import').click();
  await waitReady(page);
  const [w, h] = await canvasSize(page);
  await page.getByTestId('swatch-#e63946').click();
  const [sx, sy] = await screenPoint(page, w * 0.3, h * 0.75); // tường nhà
  await page.mouse.click(sx, sy);
  expect((await colorAt(page, Math.round(w * 0.3), Math.round(h * 0.75))).slice(0, 3)).toEqual([230, 57, 70]);
  await page.getByTestId('back').click();
  await page.getByTestId('tab-mine').click();
  await expect(page.locator('[data-testid=card]')).toHaveCount(1);
  await expect(page.locator('[data-testid=card]')).toContainText('Nhà của bé');
});

test('ảnh 4000×3000 được thu nhỏ về độ phân giải làm việc', async ({ page }) => {
  await page.goto('./#/import');
  await page.getByTestId('file-input').setInputFiles({ name: 'to.png', mimeType: 'image/png', buffer: bigPng() });
  await expect(page.getByTestId('import-preview')).toBeVisible();
  await page.getByTestId('save-import').click();
  await waitReady(page);
  const [w, h] = await canvasSize(page);
  expect(Math.max(w, h)).toBeLessThanOrEqual(2048);
  expect(w / h).toBeCloseTo(4 / 3, 1);
});

test('xoay 90° đổi chiều ảnh', async ({ page }) => {
  await page.goto('./#/import');
  await page.getByTestId('file-input').setInputFiles({ name: 'to.png', mimeType: 'image/png', buffer: bigPng() });
  await expect(page.getByTestId('import-preview')).toBeVisible();
  await page.getByTestId('rotate').click();
  await page.getByTestId('save-import').click();
  await waitReady(page);
  const [w, h] = await canvasSize(page);
  expect(h).toBeGreaterThan(w);
});

test('Làm mượt nét lưu hình dạng vector và tô được', async ({ page }) => {
  await page.goto('./#/import');
  await page.getByTestId('file-input').setInputFiles({ name: 'nha.png', mimeType: 'image/png', buffer: housePng() });
  await expect(page.getByTestId('import-preview')).toBeVisible();
  await page.getByTestId('smooth').click();
  await expect(page.getByTestId('smooth')).toHaveClass(/active/);
  await page.getByTestId('save-import').click();
  await waitReady(page);
  const kinds = await page.evaluate(async () => {
    const r = indexedDB.open('to-mau');
    await new Promise((x) => (r.onsuccess = x));
    const t = r.result.transaction('images').objectStore('images').getAll();
    await new Promise((x) => (t.onsuccess = x));
    return t.result.map((i: { kind: string }) => i.kind);
  });
  expect(kinds).toEqual(['svg']);
  const [w, h] = await canvasSize(page);
  const [sx, sy] = await screenPoint(page, w * 0.3, h * 0.75);
  await page.mouse.click(sx, sy);
  expect((await colorAt(page, Math.round(w * 0.3), Math.round(h * 0.75)))[3]).toBe(255);
});
