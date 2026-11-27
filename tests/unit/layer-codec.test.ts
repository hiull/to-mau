import { describe, it, expect } from 'vitest';
import { decodeLayer, encodeLayer } from '../../src/storage/layer-codec';

describe('layer codec', () => {
  it('mã hoá rồi giải mã ra đúng dữ liệu', async () => {
    const d = new Uint8ClampedArray(64 * 32 * 4);
    for (let i = 0; i < d.length; i += 4) { d[i] = i % 255; d[i + 3] = 255; }
    const enc = await encodeLayer(d, 64, 32);
    expect(enc.enc).toBe('gz-rgba');
    expect(enc.color.size).toBeLessThan(d.length);
    const back = await decodeLayer(enc, 64, 32);
    expect(back).toEqual(d);
  });
  it('kích thước không khớp thì trả null', async () => {
    const enc = await encodeLayer(new Uint8ClampedArray(16), 2, 2);
    expect(await decodeLayer(enc, 4, 4)).toBeNull();
  });
});
