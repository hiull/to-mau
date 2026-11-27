import { describe, it, expect } from 'vitest';
import { vectorize } from '../../src/import/vectorize';
import { buildRegionMap, binarize } from '../../src/core/regions';
import { renderSvg } from './import-fixtures';
import { blankGray, strokeRect } from './helpers';
import { toLineArt } from '../../src/import/lineart';
import { photographedDrawing } from './import-fixtures';

describe('vectorize', () => {
  it('chuyển tranh nét thành SVG có nền trắng, giữ nguyên số vùng', async () => {
    const g = blankGray(200, 160);
    strokeRect(g, 20, 20, 160, 120, 4);
    strokeRect(g, 60, 50, 40, 40, 4);
    const svg = await vectorize(g);
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('<path');
    expect(svg).toContain('viewBox="0 0 200 160"');
    expect(svg).toContain('fill="#fff"');
    const back = binarize(renderSvg(svg, 200));
    expect([back.width, back.height]).toEqual([200, 160]);
    expect(buildRegionMap(back).count).toBe(buildRegionMap(g).count);
  });

  it('tranh nét thật: số vùng sau vector hoá lệch không quá 10%', async () => {
    const g = toLineArt(photographedDrawing(), 'drawing', 50);
    const before = buildRegionMap(g).count;
    const after = buildRegionMap(binarize(renderSvg(await vectorize(g), g.width))).count;
    expect(Math.abs(after - before)).toBeLessThanOrEqual(Math.ceil(before * 0.1));
  });

  it('hai pixel chỉ chạm góc vẫn ra SVG hợp lệ', async () => {
    const g = blankGray(10, 10);
    g.data[3 * 10 + 3] = 0; g.data[4 * 10 + 4] = 0;
    const svg = await vectorize(g);
    expect(svg.match(/M/g)?.length).toBe(2);
  });
});
