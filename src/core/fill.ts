import type { RGBA, RegionMap } from './types';

export type Color = [r: number, g: number, b: number, a: number];
/** Thay đổi pixel; giá trị là RGBA đóng gói 32-bit (little-endian). */
export type Patch = { indices: Uint32Array; before: Uint32Array; after: Uint32Array };

/** Khoảng (px) quanh vùng mà pixel nét cũng được tô, để màu chạm sát nét. */
const EDGE_REACH = 2;

export function packColor([r, g, b, a]: Color): number {
  return (r | (g << 8) | (b << 16) | (a << 24)) >>> 0;
}

export function u32(layer: RGBA): Uint32Array {
  return new Uint32Array(layer.data.buffer, layer.data.byteOffset, layer.data.byteLength >> 2);
}

const indexCache = new WeakMap<RegionMap, Uint32Array[]>();

/** Chỉ mục pixel theo vùng (gồm cả pixel nét trong EDGE_REACH px). Tính một lần mỗi bản đồ. */
export function regionPixelIndex(map: RegionMap): Uint32Array[] {
  const cached = indexCache.get(map);
  if (cached) return cached;
  const { width: w, height: h, labels, count } = map;
  // Gán mỗi pixel nét gần vùng cho vùng gần nhất (lan BFS giới hạn EDGE_REACH bước).
  const owner = Int32Array.from(labels);
  const dist = new Uint8Array(w * h);
  let frontier: number[] = [];
  for (let i = 0; i < labels.length; i++) if (labels[i] >= 0) frontier.push(i);
  for (let step = 1; step <= EDGE_REACH && frontier.length; step++) {
    const next: number[] = [];
    for (const p of frontier) {
      const o = owner[p];
      const x = p % w;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p >= w ? p - w : -1, p + w < w * h ? p + w : -1];
      for (const q of nb) {
        if (q >= 0 && owner[q] < 0 && dist[q] === 0) { owner[q] = o; dist[q] = step; next.push(q); }
      }
    }
    frontier = next;
  }
  const sizes = new Uint32Array(count);
  for (let i = 0; i < owner.length; i++) if (owner[i] >= 0) sizes[owner[i]]++;
  const result = Array.from({ length: count }, (_, k) => new Uint32Array(sizes[k]));
  const fillPos = new Uint32Array(count);
  for (let i = 0; i < owner.length; i++) {
    const o = owner[i];
    if (o >= 0) result[o][fillPos[o]++] = i;
  }
  indexCache.set(map, result);
  return result;
}

/** Tô cả vùng `label` bằng `color`. Trả về patch để hoàn tác, hoặc null nếu không có gì thay đổi. */
export function fillRegion(layer: RGBA, map: RegionMap, label: number, color: Color): Patch | null {
  if (label < 0 || label >= map.count) return null;
  const idx = regionPixelIndex(map)[label];
  const px = u32(layer);
  const c = packColor(color);
  let changed = 0;
  for (let k = 0; k < idx.length; k++) if (px[idx[k]] !== c) changed++;
  if (changed === 0) return null;
  const indices = new Uint32Array(changed);
  const before = new Uint32Array(changed);
  let j = 0;
  for (let k = 0; k < idx.length; k++) {
    const i = idx[k];
    if (px[i] !== c) { indices[j] = i; before[j] = px[i]; j++; px[i] = c; }
  }
  return { indices, before, after: new Uint32Array(changed).fill(c) };
}

export function applyPatch(layer: RGBA, p: Patch, dir: 'before' | 'after'): void {
  const px = u32(layer);
  const vals = p[dir];
  for (let k = 0; k < p.indices.length; k++) px[p.indices[k]] = vals[k];
}
