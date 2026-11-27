import { openDB, type IDBPDatabase } from 'idb';
import type { Level, RegionMap } from '../core/types';

export type StoredImage = { id: string; name: string; level: Level; kind: 'svg' | 'png'; data: Blob; createdAt: number };
/** color: lớp màu; enc 'gz-rgba' = RGBA thô nén gzip kích thước w×h (xem layer-codec), không có enc = PNG. */
export type Progress = { imageId: string; color: Blob; thumb: Blob; updatedAt: number; enc?: 'gz-rgba'; w?: number; h?: number };

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
  /** Bản đồ vùng tính sẵn; key = `${imageId}:${width}x${height}`. */
  getRegionCache(key: string): Promise<RegionMap | undefined>;
  putRegionCache(key: string, map: RegionMap): Promise<void>;
}

type CachedRegions = { key: string; width: number; height: number; count: number; areas: Uint32Array; labels: Blob };

async function gzip(buf: ArrayBufferView): Promise<Blob> {
  return new Response(new Blob([buf as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream('gzip'))).blob();
}
async function gunzip(b: Blob): Promise<ArrayBuffer> {
  return new Response(b.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
const cacheRange = (id: string) => IDBKeyRange.bound(id + ':', id + ':\uffff');

function idbStore(db: IDBPDatabase): Store {
  return {
    available: true,
    listImages: () => db.getAll('images'),
    putImage: async (i) => { await db.put('images', i); },
    deleteImage: async (id) => {
      const tx = db.transaction(['images', 'progress', 'regions'], 'readwrite');
      await Promise.all([tx.objectStore('images').delete(id), tx.objectStore('progress').delete(id), tx.objectStore('regions').delete(cacheRange(id)), tx.done]);
    },
    getProgress: (id) => db.get('progress', id),
    putProgress: async (p) => { await db.put('progress', p); },
    deleteProgress: async (id) => { await db.delete('progress', id); },
    listProgress: () => db.getAll('progress'),
    getRegionCache: async (key) => {
      const c: CachedRegions | undefined = await db.get('regions', key);
      if (!c) return undefined;
      try {
        const labels = new Int32Array(await gunzip(c.labels));
        if (labels.length !== c.width * c.height) return undefined;
        return { width: c.width, height: c.height, count: c.count, areas: c.areas, labels };
      } catch {
        return undefined;
      }
    },
    putRegionCache: async (key, map) => {
      const rec: CachedRegions = { key, width: map.width, height: map.height, count: map.count, areas: map.areas, labels: await gzip(map.labels) };
      await db.put('regions', rec);
    },
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
    getRegionCache: async () => undefined,
    putRegionCache: async () => {},
  };
}

/** Mở kho lưu trữ. Không bao giờ throw: nếu IndexedDB hỏng thì dùng kho tạm trong bộ nhớ. */
export async function openStore(): Promise<Store> {
  try {
    const db = await openDB('to-mau', 2, {
      upgrade(d, oldVersion) {
        if (oldVersion < 1) {
          d.createObjectStore('images', { keyPath: 'id' });
          d.createObjectStore('progress', { keyPath: 'imageId' });
        }
        if (oldVersion < 2) d.createObjectStore('regions', { keyPath: 'key' });
      },
    });
    try { void navigator.storage?.persist?.(); } catch { /* bỏ qua */ }
    return idbStore(db);
  } catch {
    return memoryStore();
  }
}
