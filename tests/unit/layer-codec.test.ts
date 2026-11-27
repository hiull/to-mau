import { describe, it, expect } from 'vitest';
import { decodeLayer, encodeLayer, resampleRGBA } from '../../src/storage/layer-codec';

describe('layer codec', () => {
  it('mã hoá rồi giải mã ra đúng dữ liệu', async () => {
    const d = new Uint8ClampedArray(64 * 32 * 4);
    for (let i = 0; i < d.length; i += 4) { d[i] = i % 255; d[i + 3] = 255; }
    const enc = await encodeLayer(d, 64, 32);
    expect(enc.enc).toBe('gz-rgba');
    expect(enc.color.size).toBeLessThan(d.length);
    const back = await decodeLayer(enc);
    expect(back?.data).toEqual(d);
    expect([back?.w, back?.h]).toEqual([64, 32]);
  });
  it('dữ liệu hỏng thì trả null', async () => {
    expect(await decodeLayer({ color: new Blob(['rác']), enc: 'gz-rgba', w: 2, h: 2 })).toBeNull();
  });

  it('resampleRGBA phóng to giữ đúng màu từng vùng', () => {
    // 2×1: đỏ | xanh  →  4×2
    const src = Uint8ClampedArray.from([255, 0, 0, 255, 0, 0, 255, 255]);
    const out = resampleRGBA(src, 2, 1, 4, 2);
    const px = (x: number, y: number) => Array.from(out.slice((y * 4 + x) * 4, (y * 4 + x) * 4 + 4));
    expect(px(0, 0)).toEqual([255, 0, 0, 255]);
    expect(px(1, 1)).toEqual([255, 0, 0, 255]);
    expect(px(2, 0)).toEqual([0, 0, 255, 255]);
    expect(px(3, 1)).toEqual([0, 0, 255, 255]);
  });
});
