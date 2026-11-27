import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildRegionMap, binarize } from '../../src/core/regions';
import { guessLevel, guessMode, toLineArt } from '../../src/import/lineart';
import { photographedDrawing, renderSvg, syntheticPhoto, transparentDrawing } from './import-fixtures';

const regions = (g: Parameters<typeof buildRegionMap>[0]) => buildRegionMap(g).count;
const blackRatio = (g: { data: Uint8Array }) => g.data.reduce((a, v) => a + (v === 0 ? 1 : 0), 0) / g.data.length;

describe('guessMode', () => {
  it('ảnh chụp tranh nét → drawing', () => expect(guessMode(photographedDrawing())).toBe('drawing'));
  it('ảnh chụp thật → photo', () => expect(guessMode(syntheticPhoto())).toBe('photo'));
});

describe('toLineArt', () => {
  it('ảnh chụp tranh nét (có bóng giấy) cho số vùng gần với bản gốc (±20%)', () => {
    const clean = regions(binarize(renderSvg(readFileSync('public/drawings/ngoi-nha.svg', 'utf8'), 800, '#fff')));
    const got = regions(toLineArt(photographedDrawing(), 'drawing', 50));
    expect(got).toBeGreaterThanOrEqual(Math.floor(clean * 0.8));
    expect(got).toBeLessThanOrEqual(Math.ceil(clean * 1.2));
  });

  it('ảnh chụp thật: giảm độ chi tiết thì số vùng không tăng', () => {
    const img = syntheticPhoto();
    const counts = [100, 50, 0].map((d) => regions(toLineArt(img, 'photo', d)));
    expect(counts[0]).toBeGreaterThanOrEqual(counts[1]);
    expect(counts[1]).toBeGreaterThanOrEqual(counts[2]);
    expect(counts[2]).toBeGreaterThanOrEqual(3); // vẫn còn tách được vài khối chính
  });

  it('ảnh chụp thật: bắt được cạnh giữa các khối khác màu dù độ sáng gần nhau', () => {
    // trời, đất, bóng, tường, mái, mặt trời → ít nhất 6 vùng
    expect(regions(toLineArt(syntheticPhoto(), 'photo', 50))).toBeGreaterThanOrEqual(6);
  });

  it('nền trong suốt được coi là trắng', () => {
    const g = toLineArt(transparentDrawing(), 'drawing', 50);
    expect(blackRatio(g)).toBeLessThan(0.1);
    expect(regions(g)).toBeGreaterThan(5);
  });

  it('giữ nguyên kích thước ảnh vào', () => {
    const img = syntheticPhoto(320, 200);
    const g = toLineArt(img, 'photo', 50);
    expect([g.width, g.height]).toEqual([320, 200]);
  });
});

describe('guessLevel', () => {
  it('chia cấp theo số vùng', () => {
    expect(guessLevel(10)).toBe('de');
    expect(guessLevel(40)).toBe('vua');
    expect(guessLevel(200)).toBe('kho');
  });
});
