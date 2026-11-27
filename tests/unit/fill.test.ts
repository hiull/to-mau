import { describe, it, expect } from 'vitest';
import { buildRegionMap } from '../../src/core/regions';
import { fillRegion, type Color } from '../../src/core/fill';
import { blankRGBA, px, squareGray } from './helpers';

const RED: Color = [230, 57, 70, 255];
const BLUE: Color = [69, 123, 157, 255];

describe('fillRegion', () => {
  it('tô kín vùng trong, không chạm vùng ngoài', () => {
    const map = buildRegionMap(squareGray());
    const layer = blankRGBA(50, 50);
    const inner = map.labels[25 * 50 + 25];
    const p = fillRegion(layer, map, inner, RED);
    expect(p).not.toBeNull();
    for (let y = 13; y < 37; y++) for (let x = 13; x < 37; x++) expect(px(layer, x, y)).toEqual(RED);
    expect(px(layer, 2, 2)).toEqual([0, 0, 0, 0]);
  });

  it('tô cả phần nét kề vùng để không còn viền trắng', () => {
    const map = buildRegionMap(squareGray()); // gapRadius 1 → pixel 11 là nét làm dày
    const layer = blankRGBA(50, 50);
    fillRegion(layer, map, map.labels[25 * 50 + 25], RED);
    expect(px(layer, 11, 25)).toEqual(RED);
  });

  it('tô lại cùng màu trả null', () => {
    const map = buildRegionMap(squareGray());
    const layer = blankRGBA(50, 50);
    const inner = map.labels[25 * 50 + 25];
    fillRegion(layer, map, inner, RED);
    expect(fillRegion(layer, map, inner, RED)).toBeNull();
    expect(fillRegion(layer, map, inner, BLUE)).not.toBeNull();
  });

  it('nhãn không hợp lệ trả null', () => {
    const map = buildRegionMap(squareGray());
    expect(fillRegion(blankRGBA(50, 50), map, -1, RED)).toBeNull();
  });
});
