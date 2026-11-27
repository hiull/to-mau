import type { Page } from '@playwright/test';

/** Đọc pixel RGBA của canvas màu tại toạ độ nội dung (x,y). */
export async function colorAt(page: Page, x: number, y: number): Promise<number[]> {
  return page.evaluate(([x, y]) => {
    const c = document.querySelector<HTMLCanvasElement>('[data-testid=color-canvas]')!;
    return Array.from(c.getContext('2d')!.getImageData(x, y, 1, 1).data);
  }, [x, y]);
}
/** Toạ độ màn hình của điểm nội dung (x,y) theo phép biến đổi hiện tại. */
export async function screenPoint(page: Page, x: number, y: number): Promise<[number, number]> {
  return page.evaluate(([x, y]) => {
    const c = document.querySelector<HTMLCanvasElement>('[data-testid=color-canvas]')!;
    const r = c.getBoundingClientRect();
    return [r.left + (x / c.width) * r.width, r.top + (y / c.height) * r.height] as [number, number];
  }, [x, y]);
}
export async function canvasSize(page: Page): Promise<[number, number]> {
  return page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('[data-testid=color-canvas]')!;
    return [c.width, c.height] as [number, number];
  });
}
export async function waitReady(page: Page) {
  await page.locator('[data-testid=editor][data-ready=true]').waitFor();
}
