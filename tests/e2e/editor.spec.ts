import { test, expect } from '@playwright/test';
import { canvasSize, colorAt, screenPoint, waitReady } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./#/to/__fixture');
  await waitReady(page);
});

test('chạm tô vùng giữa rồi hoàn tác', async ({ page }) => {
  const [w, h] = await canvasSize(page);
  await page.getByTestId('swatch-#e63946').click();
  const [sx, sy] = await screenPoint(page, w / 2, h / 2);
  await page.mouse.click(sx, sy);
  expect((await colorAt(page, w / 2, h / 2)).slice(0, 3)).toEqual([230, 57, 70]);
  expect((await colorAt(page, 5, 5))[3]).toBe(0);
  await page.getByTestId('undo').click();
  expect((await colorAt(page, w / 2, h / 2))[3]).toBe(0);
});

test('đang vẽ cọ mà đặt ngón thứ hai thì nét bị huỷ', async ({ page }) => {
  const [w, h] = await canvasSize(page);
  await page.getByTestId('tool-brush').click();
  const a = await screenPoint(page, w * 0.4, h / 2);
  const b = await screenPoint(page, w * 0.6, h / 2);
  await page.evaluate(([a, b]) => {
    const el = document.querySelector('[data-testid=viewport]')!;
    const fire = (type: string, id: number, x: number, y: number) =>
      el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 1, buttons: 1 }));
    fire('pointerdown', 1, a[0], a[1]);
    fire('pointermove', 1, (a[0] + b[0]) / 2, a[1]);
    fire('pointermove', 1, b[0], b[1]);
    fire('pointerdown', 2, b[0], b[1] + 80);
    fire('pointermove', 2, b[0], b[1] + 120);
    fire('pointerup', 2, b[0], b[1] + 120);
    fire('pointerup', 1, b[0], b[1]);
  }, [a, b]);
  const allClear = await page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('[data-testid=color-canvas]')!;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return false;
    return true;
  });
  expect(allClear).toBe(true);
});

test('cọ vẽ được nét', async ({ page }) => {
  const [w, h] = await canvasSize(page);
  await page.getByTestId('tool-brush').click();
  const a = await screenPoint(page, w * 0.4, h / 2);
  const b = await screenPoint(page, w * 0.6, h / 2);
  await page.mouse.move(a[0], a[1]);
  await page.mouse.down();
  await page.mouse.move(b[0], b[1], { steps: 5 });
  await page.mouse.up();
  expect((await colorAt(page, w / 2, h / 2))[3]).toBe(255);
});

test('chọn màu chi tiết bằng mã hex', async ({ page }) => {
  const [w, h] = await canvasSize(page);
  await page.getByTestId('open-picker').click();
  await page.getByTestId('hex-input').fill('#123456');
  await page.getByTestId('hex-input').press('Enter');
  await page.getByTestId('close-picker').click();
  const [sx, sy] = await screenPoint(page, w / 2, h / 2);
  await page.mouse.click(sx, sy);
  expect((await colorAt(page, w / 2, h / 2)).slice(0, 3)).toEqual([0x12, 0x34, 0x56]);
});
