import { test, expect } from '@playwright/test';
import { canvasSize, colorAt, screenPoint, waitReady } from './helpers';

const scaleOf = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (document.querySelector('.stage') as HTMLElement).style.transform.match(/scale\(([\d.]+)\)/)![1]);

test('đổi công cụ không làm mất mức phóng to', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('./#/to/__fixture');
  await waitReady(page);
  await page.getByTestId('zoom-in').click();
  const zoomed = await scaleOf(page);
  await page.getByTestId('tool-brush').click();
  await page.waitForTimeout(100);
  expect(await scaleOf(page)).toBe(zoomed);
  await page.getByTestId('tool-fill').click();
  await page.waitForTimeout(100);
  expect(await scaleOf(page)).toBe(zoomed);
});

test('lưu thất bại thì báo cho người dùng', async ({ page }) => {
  await page.goto('./#/to/__fixture');
  await waitReady(page);
  await page.evaluate(() => {
    const orig = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...a: any[]) {
      if (this.name === 'progress') throw new DOMException('Hết dung lượng', 'QuotaExceededError');
      return (orig as any).apply(this, a);
    };
  });
  const [w, h] = await canvasSize(page);
  const [sx, sy] = await screenPoint(page, w / 2, h / 2);
  await page.mouse.click(sx, sy);
  await expect(page.getByText('Không lưu được tranh trên trình duyệt này')).toBeVisible({ timeout: 5000 });
});

test('tô xong bấm về ngay thì thư viện đã có ảnh thu nhỏ mới', async ({ page }) => {
  await page.goto('./#/to/qua-tao');
  await waitReady(page);
  const [w, h] = await canvasSize(page);
  const [sx, sy] = await screenPoint(page, w / 2, h / 2);
  await page.mouse.click(sx, sy);
  await page.getByTestId('back').click();
  const card = page.locator('[data-testid=card]', { hasText: 'Quả táo' });
  await expect(card.locator('img')).toHaveAttribute('src', /^blob:/);
});

test('nút ← quay lại chứ không chồng thêm lịch sử', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-testid=card]').first().click();
  await waitReady(page);
  await page.getByTestId('back').click();
  await expect(page.locator('[data-testid=card]')).toHaveCount(6);
  await page.goBack();
  expect(page.url()).not.toContain('#/to/');
});

test('tranh lưu ở độ phân giải khác vẫn mở ra đủ màu', async ({ page }) => {
  await page.goto('./#/to/__fixture');
  await waitReady(page);
  const [w, h] = await canvasSize(page);
  // Giả lập bản lưu từ máy khác: 100×100, toàn màu xanh.
  await page.evaluate(async () => {
    const d = new Uint8ClampedArray(100 * 100 * 4);
    for (let i = 0; i < d.length; i += 4) { d[i + 2] = 255; d[i + 3] = 255; }
    const color = await new Response(new Blob([d]).stream().pipeThrough(new CompressionStream('gzip'))).blob();
    const r = indexedDB.open('to-mau');
    await new Promise((x) => (r.onsuccess = x));
    const tx = r.result.transaction('progress', 'readwrite');
    tx.objectStore('progress').put({ imageId: '__fixture', color, thumb: new Blob(), updatedAt: Date.now(), enc: 'gz-rgba', w: 100, h: 100 });
    await new Promise((x) => (tx.oncomplete = x));
    r.result.close();
  });
  await page.reload();
  await waitReady(page);
  expect(await colorAt(page, w / 2, h / 2)).toEqual([0, 0, 255, 255]);
});

test('mở thẳng trang thêm hình, lưu rồi bấm ← thì về thư viện (không thoát app)', async ({ page }) => {
  await page.goto('./#/import');
  const { readFileSync } = await import('node:fs');
  const { Resvg } = await import('@resvg/resvg-js');
  const png = new Resvg(readFileSync('public/drawings/ngoi-nha.svg', 'utf8'), { fitTo: { mode: 'width', value: 600 }, background: '#fff' }).render().asPng();
  await page.getByTestId('file-input').setInputFiles({ name: 'nha.png', mimeType: 'image/png', buffer: png });
  await page.getByTestId('save-import').click();
  await waitReady(page);
  await page.getByTestId('back').click();
  await expect(page.locator('[data-testid=tab-de]')).toBeVisible();
  expect(page.url()).toMatch(/\/to-mau\/(#\/)?$/);
});
