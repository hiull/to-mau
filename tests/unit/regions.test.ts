import { describe, it, expect } from 'vitest';
import { binarize, buildRegionMap, dilate, nearestRegion } from '../../src/core/regions';
import { blankGray, fillRect, squareGray, strokeRect } from './helpers';

describe('buildRegionMap', () => {
  it('hình vuông viền kín có 2 vùng (trong + ngoài)', () => {
    const m = buildRegionMap(squareGray());
    expect(m.count).toBe(2);
    expect(m.labels[25 * 50 + 25]).not.toBe(m.labels[2 * 50 + 2]);
  });

  it('vá khe hở 1px khi gapRadius = 1', () => {
    const g = squareGray();
    fillRect(g, 39, 25, 1, 1, 255); // khoét 1px ở cạnh phải
    expect(buildRegionMap(g, { gapRadius: 1 }).count).toBe(2);
    expect(buildRegionMap(g, { gapRadius: 0 }).count).toBe(1);
  });

  it('chấm trắng nhỏ hơn minArea không thành vùng riêng', () => {
    const g = blankGray(50, 50);
    fillRect(g, 20, 20, 10, 10, 0);
    fillRect(g, 24, 24, 2, 2, 255);
    const m = buildRegionMap(g, { gapRadius: 0, minArea: 12 });
    expect(m.count).toBe(1);
    expect(m.labels[24 * 50 + 24]).toBe(m.labels[0]);
  });

  it('areas cộng lại bằng số pixel không phải nét', () => {
    const m = buildRegionMap(squareGray(), { gapRadius: 0 });
    let nonLine = 0;
    for (const l of m.labels) if (l >= 0) nonLine++;
    expect(m.areas.reduce((a, b) => a + b, 0)).toBe(nonLine);
  });

  it('ảnh 2048×2048 chạy dưới 1500 ms', () => {
    const g = blankGray(2048, 2048);
    for (let i = 0; i < 20; i++) strokeRect(g, i * 50, i * 50, 2048 - i * 100, 2048 - i * 100, 3);
    const t = performance.now();
    const m = buildRegionMap(g);
    expect(performance.now() - t).toBeLessThan(1500);
    expect(m.count).toBe(20); // 19 vành + lõi; hình ngoài cùng chạm mép nên không có vùng ngoài
  });
});

describe('nearestRegion', () => {
  it('chạm lên pixel nét trả về vùng kề, không phải -1', () => {
    const m = buildRegionMap(squareGray());
    const l = nearestRegion(m, 10, 25);
    expect(l).toBeGreaterThanOrEqual(0);
  });
  it('ngoài ảnh trả -1', () => {
    const m = buildRegionMap(squareGray());
    expect(nearestRegion(m, -1, 5)).toBe(-1);
    expect(nearestRegion(m, 50, 5)).toBe(-1);
  });
});

describe('binarize & dilate', () => {
  it('pixel trong suốt coi là trắng', () => {
    const img = { width: 2, height: 1, data: new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255]) };
    expect(Array.from(binarize(img).data)).toEqual([255, 0]);
  });
  it('dilate làm dày nét thêm radius px', () => {
    const g = blankGray(9, 9);
    fillRect(g, 4, 4, 1, 1);
    const d = dilate(g, 1);
    let black = 0;
    for (const v of d.data) if (v === 0) black++;
    expect(black).toBe(9);
  });
});
