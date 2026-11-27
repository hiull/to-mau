import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Resvg } from '@resvg/resvg-js';
import { binarize, buildRegionMap } from '../../src/core/regions';
import type { Level } from '../../src/core/types';

type Entry = { id: string; name: string; level: Level; file: string; v: string };
const dir = 'public/drawings/';
const catalog: Entry[] = JSON.parse(readFileSync(dir + 'catalog.json', 'utf8'));
const RANGE: Record<Level, [number, number]> = { de: [5, 15], vua: [20, 60], kho: [100, Infinity] };

/** Số vùng tô được (không tính nền bên ngoài) khi raster ở 1000 px. */
export function regionCount(file: string): number {
  const png = new Resvg(readFileSync(dir + file, 'utf8'), { fitTo: { mode: 'width', value: 1000 }, background: '#fff' }).render();
  const map = buildRegionMap(binarize({ width: png.width, height: png.height, data: new Uint8ClampedArray(png.pixels) }));
  return map.count - 1;
}

describe('catalog', () => {
  it('có 6 hình mỗi cấp, id không trùng', () => {
    for (const lv of ['de', 'vua', 'kho'] as Level[]) expect(catalog.filter((e) => e.level === lv)).toHaveLength(6);
    expect(new Set(catalog.map((e) => e.id)).size).toBe(catalog.length);
  });

  it('mỗi hình có phiên bản v = 8 ký tự đầu SHA-1 của nội dung file', () => {
    for (const e of catalog) expect(e.v, e.file).toBe(createHash('sha1').update(readFileSync(dir + e.file)).digest('hex').slice(0, 8));
  });

  for (const e of catalog) {
    it(`${e.name} (${e.level}) có số vùng đúng cấp`, () => {
      expect(existsSync(dir + e.file)).toBe(true);
      const n = regionCount(e.file);
      const [lo, hi] = RANGE[e.level];
      expect(n, `${e.file}: ${n} vùng`).toBeGreaterThanOrEqual(lo);
      expect(n, `${e.file}: ${n} vùng`).toBeLessThanOrEqual(hi);
    });
  }
});
