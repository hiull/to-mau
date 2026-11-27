import { test, expect, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { canvasSize, colorAt, screenPoint, waitReady } from './helpers';

const housePng = () => new Resvg(readFileSync('public/drawings/ngoi-nha.svg', 'utf8'), { fitTo: { mode: 'width', value: 800 }, background: '#fff' }).render().asPng();

for (const name of ['iPhone 13', 'Pixel 7'] as const) {
  // Chỉ có Chromium trong môi trường test: giữ kích thước/cảm ứng của thiết bị, bỏ chọn trình duyệt.
  const { defaultBrowserType: _ignored, ...device } = devices[name];
  test.describe(name, () => {
    test.use(device);

    test('chạm tô và phóng to hai ngón', async ({ page }) => {
      await page.goto('./#/to/con-ca');
      await waitReady(page);
      const [w, h] = await canvasSize(page);
      // Thân cá ở khoảng (0.3, 0.5)
      await page.getByTestId('swatch-#ffb703').tap();
      const [sx, sy] = await screenPoint(page, w * 0.25, h * 0.55);
      await page.touchscreen.tap(sx, sy);
      expect((await colorAt(page, Math.round(w * 0.25), Math.round(h * 0.55))).slice(0, 3)).toEqual([0xff, 0xb7, 0x03]);

      const before = await page.locator('[data-testid=color-canvas]').boundingBox();
      await page.evaluate(([cx, cy]) => {
        const el = document.querySelector('[data-testid=viewport]')!;
        const fire = (type: string, id: number, x: number, y: number) =>
          el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, buttons: 1 }));
        fire('pointerdown', 1, cx - 20, cy); fire('pointerdown', 2, cx + 20, cy);
        for (let i = 1; i <= 5; i++) { fire('pointermove', 1, cx - 20 - i * 20, cy); fire('pointermove', 2, cx + 20 + i * 20, cy); }
        fire('pointerup', 1, cx - 120, cy); fire('pointerup', 2, cx + 120, cy);
      }, [sx, sy]);
      const after = await page.locator('[data-testid=color-canvas]').boundingBox();
      expect(after!.width).toBeGreaterThan(before!.width * 2);
      // phóng to không làm đổi màu thêm chỗ nào ngoài vùng đã tô
      expect((await colorAt(page, 5, 5))[3]).toBe(0);
    });

    test('import ảnh trên điện thoại', async ({ page }) => {
      await page.goto('./#/import');
      await page.getByTestId('file-input').setInputFiles({ name: 'nha.png', mimeType: 'image/png', buffer: housePng() });
      await page.getByTestId('save-import').tap();
      await waitReady(page);
    });

    test('không tràn ngang màn hình', async ({ page }) => {
      for (const url of ['./', './#/to/mandala-sen', './#/import']) {
        await page.goto(url);
        await page.waitForTimeout(300);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, url).toBeLessThanOrEqual(0);
      }
    });
  });
}

test('PWA: có service worker và mở được thư viện khi offline', async ({ page, context }) => {
  await page.goto('./');
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector<HTMLLinkElement>('link[rel=manifest]')!.href)).json());
  expect(manifest.name).toBe('Tô Màu');
  expect(manifest.display).toBe('standalone');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // trang được service worker kiểm soát
  await expect(page.locator('[data-testid=card]')).toHaveCount(6);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-testid=card]')).toHaveCount(6);
  await page.locator('[data-testid=card]').first().click();
  await waitReady(page);
});
