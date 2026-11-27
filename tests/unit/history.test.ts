import { describe, it, expect } from 'vitest';
import { buildRegionMap } from '../../src/core/regions';
import { fillRegion, type Color } from '../../src/core/fill';
import { History } from '../../src/core/history';
import { blankRGBA, squareGray } from './helpers';

function colorN(n: number): Color { return [n, 255 - n, 100, 255]; }

describe('History', () => {
  it('giữ tối đa 30 bước hoàn tác', () => {
    const map = buildRegionMap(squareGray());
    const layer = blankRGBA(50, 50);
    const h = new History();
    for (let i = 0; i < 35; i++) h.push(fillRegion(layer, map, 0, colorN(i + 1))!);
    for (let i = 0; i < 30; i++) expect(h.undo(layer)).toBe(true);
    expect(h.undo(layer)).toBe(false);
    expect(h.canUndo).toBe(false);
  });

  it('undo rồi redo trả về đúng trạng thái', () => {
    const map = buildRegionMap(squareGray());
    const layer = blankRGBA(50, 50);
    const h = new History();
    h.push(fillRegion(layer, map, 0, colorN(1))!);
    h.push(fillRegion(layer, map, 1, colorN(2))!);
    const snap = layer.data.slice();
    expect(h.undo(layer)).toBe(true);
    expect(layer.data).not.toEqual(snap);
    expect(h.redo(layer)).toBe(true);
    expect(layer.data).toEqual(snap);
    expect(h.canRedo).toBe(false);
  });

  it('push mới sau undo xoá nhánh redo', () => {
    const map = buildRegionMap(squareGray());
    const layer = blankRGBA(50, 50);
    const h = new History();
    h.push(fillRegion(layer, map, 0, colorN(1))!);
    h.undo(layer);
    h.push(fillRegion(layer, map, 1, colorN(2))!);
    expect(h.canRedo).toBe(false);
    expect(h.redo(layer)).toBe(false);
  });

  it('undo về đầu thì lớp màu trong suốt lại', () => {
    const map = buildRegionMap(squareGray());
    const layer = blankRGBA(50, 50);
    const h = new History();
    h.push(fillRegion(layer, map, 0, colorN(1))!);
    h.undo(layer);
    expect(layer.data.every((v) => v === 0)).toBe(true);
  });
});
