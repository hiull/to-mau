import { describe, it, expect } from 'vitest';
import { buildRegionMap } from '../../src/core/regions';
import { fillRegion, type Color } from '../../src/core/fill';
import { Stroke, eraseRegion, type BrushOpts } from '../../src/core/brush';
import { blankRGBA, px, squareGray } from './helpers';

const RED: Color = [230, 57, 70, 255];
const opts = (o: Partial<BrushOpts> = {}): BrushOpts => ({ size: 4, opacity: 1, color: RED, erase: false, clipLabel: null, ...o });

describe('Stroke', () => {
  it('nét ngang tô các pixel trên đường', () => {
    const map = buildRegionMap(squareGray());
    const layer = blankRGBA(50, 50);
    const s = new Stroke(layer, map, opts());
    s.add(2, 25); s.add(47, 25);
    expect(s.finish()).not.toBeNull();
    for (let x = 3; x < 47; x++) expect(px(layer, x, 25)).toEqual(RED);
  });

  it('hai điểm cách xa vẫn nối liền', () => {
    const map = buildRegionMap(squareGray());
    const layer = blankRGBA(50, 50);
    const s = new Stroke(layer, map, opts());
    s.add(5, 5); s.add(45, 5);
    s.finish();
    for (let x = 5; x <= 45; x++) expect(px(layer, x, 5)[3]).toBe(255);
  });

  it('giữ trong vùng: không pixel nào ngoài vùng bị đổi', () => {
    const map = buildRegionMap(squareGray());
    const layer = blankRGBA(50, 50);
    const inner = map.labels[25 * 50 + 25];
    const s = new Stroke(layer, map, opts({ size: 8, clipLabel: inner }));
    s.add(2, 25); s.add(47, 25);
    s.finish();
    expect(px(layer, 5, 25)[3]).toBe(0);
    expect(px(layer, 45, 25)[3]).toBe(0);
    expect(px(layer, 25, 25)).toEqual(RED);
  });

  it('độ mờ không cộng dồn trong một nét', () => {
    const map = buildRegionMap(squareGray());
    const layer = blankRGBA(50, 50);
    const s = new Stroke(layer, map, opts({ opacity: 0.5, size: 6 }));
    s.add(5, 25); s.add(45, 25); s.add(5, 25);
    s.finish();
    expect(Math.abs(px(layer, 25, 25)[3] - 128)).toBeLessThanOrEqual(2);
  });

  it('cancel khôi phục lớp màu như trước nét', () => {
    const map = buildRegionMap(squareGray());
    const layer = blankRGBA(50, 50);
    fillRegion(layer, map, 0, [1, 2, 3, 255]);
    const snap = layer.data.slice();
    const s = new Stroke(layer, map, opts({ size: 10 }));
    s.add(2, 2); s.add(40, 40);
    s.cancel();
    expect(layer.data).toEqual(snap);
  });

  it('tẩy làm pixel trong suốt và trả patch hoàn tác được', () => {
    const map = buildRegionMap(squareGray());
    const layer = blankRGBA(50, 50);
    fillRegion(layer, map, map.labels[25 * 50 + 25], RED);
    const s = new Stroke(layer, map, opts({ erase: true, size: 6 }));
    s.add(25, 25);
    const p = s.finish();
    expect(p).not.toBeNull();
    expect(px(layer, 25, 25)[3]).toBe(0);
  });
});

describe('eraseRegion', () => {
  it('xoá cả vùng; vùng trống trả null', () => {
    const map = buildRegionMap(squareGray());
    const layer = blankRGBA(50, 50);
    const inner = map.labels[25 * 50 + 25];
    expect(eraseRegion(layer, map, inner)).toBeNull();
    fillRegion(layer, map, inner, RED);
    expect(eraseRegion(layer, map, inner)).not.toBeNull();
    expect(px(layer, 25, 25)[3]).toBe(0);
  });
});
