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
