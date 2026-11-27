import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { openStore, type StoredImage, type Progress } from '../../src/storage/db';

const img = (id: string): StoredImage => ({ id, name: 'Hình ' + id, level: 'de', kind: 'png', data: new Blob(['x']), createdAt: Date.now() });
const prog = (imageId: string): Progress => ({ imageId, color: new Blob(['c']), thumb: new Blob(['t']), updatedAt: Date.now() });

describe('openStore', () => {
  it('lưu, đọc, xoá hình', async () => {
    const s = await openStore();
    expect(s.available).toBe(true);
    await s.putImage(img('a'));
    await s.putImage(img('b'));
    expect((await s.listImages()).map((i) => i.id).sort()).toEqual(['a', 'b']);
    await s.deleteImage('a');
    expect((await s.listImages()).map((i) => i.id)).toEqual(['b']);
  });

  it('lưu tiến độ; xoá hình thì xoá luôn tiến độ', async () => {
    const s = await openStore();
    await s.putImage(img('c'));
    await s.putProgress(prog('c'));
    expect((await s.getProgress('c'))?.imageId).toBe('c');
    expect((await s.listProgress()).some((p) => p.imageId === 'c')).toBe(true);
    await s.deleteImage('c');
    expect(await s.getProgress('c')).toBeUndefined();
  });

  it('deleteProgress xoá tiến độ', async () => {
    const s = await openStore();
    await s.putProgress(prog('d'));
    await s.deleteProgress('d');
    expect(await s.getProgress('d')).toBeUndefined();
  });

  it('lưu và đọc bản đồ vùng; xoá hình thì xoá luôn cache', async () => {
    const s = await openStore();
    const map = { width: 3, height: 2, labels: Int32Array.from([0, 0, -1, 1, 1, -1]), count: 2, areas: Uint32Array.from([2, 2]) };
    await s.putImage(img('f'));
    await s.putRegionCache('f:3x2', map);
    const got = await s.getRegionCache('f:3x2');
    expect(got?.count).toBe(2);
    expect(Array.from(got!.labels)).toEqual([0, 0, -1, 1, 1, -1]);
    expect(Array.from(got!.areas)).toEqual([2, 2]);
    expect(await s.getRegionCache('f:9x9')).toBeUndefined();
    await s.deleteImage('f');
    expect(await s.getRegionCache('f:3x2')).toBeUndefined();
  });

  it('IndexedDB lỗi → vẫn trả store tạm, available = false', async () => {
    const real = globalThis.indexedDB;
    (globalThis as any).indexedDB = { open() { throw new Error('blocked'); } };
    try {
      const s = await openStore();
      expect(s.available).toBe(false);
      await s.putImage(img('e'));
      expect((await s.listImages()).map((i) => i.id)).toEqual(['e']);
      await s.putProgress(prog('e'));
      expect((await s.getProgress('e'))?.imageId).toBe('e');
    } finally {
      (globalThis as any).indexedDB = real;
    }
  });
});
