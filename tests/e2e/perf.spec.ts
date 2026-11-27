import { test, expect, type Page } from '@playwright/test';
import { canvasSize, colorAt, screenPoint, waitReady } from './helpers';

async function startFrameMonitor(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__maxFrame = 0;
    let last = performance.now();
    const tick = (t: number) => { w.__maxFrame = Math.max(w.__maxFrame, t - last); last = t; if (!w.__stopFrames) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}
/** Đo trong trang: từ lúc bấm (click) tới khi editor có data-ready=true. */
async function armOpenTimer(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__openMs = null;
    document.addEventListener('click', () => {
      const t0 = performance.now();
      const check = () => {
        if (document.querySelector('[data-testid=editor][data-ready=true]')) w.__openMs = performance.now() - t0;
        else requestAnimationFrame(check);
      };
      check();
    }, { capture: true, once: true });
  });
}
async function openMs(page: Page): Promise<number> {
  await page.waitForFunction(() => (window as any).__openMs !== null);
  return page.evaluate(() => (window as any).__openMs);
}
const maxFrame = (page: Page) => page.evaluate(() => { (window as any).__stopFrames = true; return (window as any).__maxFrame as number; });

test('hình Khó mở nhanh, không đơ giao diện, mở lại nhờ cache, chạm tô tức thì', async ({ page }) => {
  page.on('console', (m) => m.text().startsWith('T ') && console.log(m.text()));
  await page.goto('./');
  await page.getByTestId('tab-kho').click();
  const card = page.locator('[data-testid=card]', { hasText: 'Mandala hoa sen' });
  await startFrameMonitor(page);
  await armOpenTimer(page);
  await card.click();
  await waitReady(page);
  const firstOpen = await openMs(page);
  const frame = await maxFrame(page);
  console.log('first open', firstOpen, 'max frame', frame);
  expect(firstOpen).toBeLessThan(3000);
  expect(frame).toBeLessThan(200);

  const [w, h] = await canvasSize(page);
  const [sx, sy] = await screenPoint(page, w / 2, h / 2);
  const tapMs = await page.evaluate(([x, y]) => {
    const el = document.querySelector('[data-testid=viewport]')!;
    const fire = (type: string) => el.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: 'mouse', button: 0, buttons: 1, clientX: x, clientY: y, bubbles: true }));
    const t0 = performance.now();
    fire('pointerdown'); fire('pointerup');
    return performance.now() - t0;
  }, [sx, sy]);
  console.log('tap', tapMs);
  expect(tapMs).toBeLessThan(100);
  expect((await colorAt(page, w / 2, h / 2))[3]).toBe(255);

  await page.getByTestId('back').click();
  await page.waitForTimeout(1500); // để việc lưu tranh lần trước chạy xong
  await armOpenTimer(page);
  await page.locator('[data-testid=card]', { hasText: 'Mandala hoa sen' }).click();
  await waitReady(page);
  const reopen = await openMs(page);
  console.log('reopen', reopen);
  expect(reopen).toBeLessThan(800);
});
