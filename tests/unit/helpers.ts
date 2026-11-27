import type { Gray, RGBA } from '../../src/core/types';

export function blankGray(w: number, h: number): Gray {
  return { width: w, height: h, data: new Uint8Array(w * h).fill(255) };
}
/** Vẽ hình chữ nhật đặc màu đen (0) vào ảnh xám. */
export function fillRect(g: Gray, x0: number, y0: number, w: number, h: number, v = 0) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g.data[y * g.width + x] = v;
}
/** Viền hình vuông độ dày t. */
export function strokeRect(g: Gray, x0: number, y0: number, w: number, h: number, t = 1) {
  fillRect(g, x0, y0, w, t);
  fillRect(g, x0, y0 + h - t, w, t);
  fillRect(g, x0, y0, t, h);
  fillRect(g, x0 + w - t, y0, t, h);
}
/** Ảnh 50×50 có hình vuông viền 1px từ (10,10) đến (39,39). */
export function squareGray(): Gray {
  const g = blankGray(50, 50);
  strokeRect(g, 10, 10, 30, 30, 1);
  return g;
}
export function blankRGBA(w: number, h: number): RGBA {
  return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
}
export function px(img: RGBA, x: number, y: number): number[] {
  const i = (y * img.width + x) * 4;
  return Array.from(img.data.slice(i, i + 4));
}
