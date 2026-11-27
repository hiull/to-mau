import { openDB, type IDBPDatabase } from 'idb';
import type { Level } from '../core/types';

export type StoredImage = { id: string; name: string; level: Level; kind: 'svg' | 'png'; data: Blob; createdAt: number };
export type Progress = { imageId: string; color: Blob; thumb: Blob; updatedAt: number };

export interface Store {
  /** false nếu trình duyệt không cho lưu (dữ liệu chỉ sống trong phiên này). */
  available: boolean;
  listImages(): Promise<StoredImage[]>;
  putImage(i: StoredImage): Promise<void>;
  deleteImage(id: string): Promise<void>;
  getProgress(id: string): Promise<Progress | undefined>;
  putProgress(p: Progress): Promise<void>;
  deleteProgress(id: string): Promise<void>;
  listProgress(): Promise<Progress[]>;
}

function idbStore(db: IDBPDatabase): Store {
  return {
    available: true,
    listImages: () => db.getAll('images'),
    putImage: async (i) => { await db.put('images', i); },
    deleteImage: async (id) => {
      const tx = db.transaction(['images', 'progress'], 'readwrite');
      await Promise.all([tx.objectStore('images').delete(id), tx.objectStore('progress').delete(id), tx.done]);
    },
    getProgress: (id) => db.get('progress', id),
    putProgress: async (p) => { await db.put('progress', p); },
    deleteProgress: async (id) => { await db.delete('progress', id); },
    listProgress: () => db.getAll('progress'),
  };
}

function memoryStore(): Store {
  const images = new Map<string, StoredImage>();
  const progress = new Map<string, Progress>();
  return {
    available: false,
    listImages: async () => [...images.values()],
    putImage: async (i) => { images.set(i.id, i); },
    deleteImage: async (id) => { images.delete(id); progress.delete(id); },
    getProgress: async (id) => progress.get(id),
    putProgress: async (p) => { progress.set(p.imageId, p); },
    deleteProgress: async (id) => { progress.delete(id); },
    listProgress: async () => [...progress.values()],
  };
}

/** Mở kho lưu trữ. Không bao giờ throw: nếu IndexedDB hỏng thì dùng kho tạm trong bộ nhớ. */
export async function openStore(): Promise<Store> {
  try {
    const db = await openDB('to-mau', 1, {
      upgrade(d) {
        d.createObjectStore('images', { keyPath: 'id' });
        d.createObjectStore('progress', { keyPath: 'imageId' });
      },
    });
    try { void navigator.storage?.persist?.(); } catch { /* bỏ qua */ }
    return idbStore(db);
  } catch {
    return memoryStore();
  }
}
