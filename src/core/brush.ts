import type { RGBA, RegionMap } from './types';
import { regionPixelIndex, u32, type Color, type Patch } from './fill';

export type BrushOpts = { size: number; opacity: number; color: Color; erase: boolean; clipLabel: number | null };

const clipCache = new WeakMap<RegionMap, Map<number, Uint8Array>>();
function clipMask(map: RegionMap, label: number): Uint8Array {
  let byLabel = clipCache.get(map);
  if (!byLabel) clipCache.set(map, (byLabel = new Map()));
  let m = byLabel.get(label);
  if (!m) {
    m = new Uint8Array(map.width * map.height);
    const idx = regionPixelIndex(map)[label];
    if (idx) for (let k = 0; k < idx.length; k++) m[idx[k]] = 1;
    byLabel.set(label, m);
  }
  return m;
}

/**
 * Một nét cọ. Mỗi pixel giữ độ phủ lớn nhất trong cả nét, rồi được trộn lên màu gốc,
 * nên đi qua cùng chỗ nhiều lần không làm đậm thêm.
 */
export class Stroke {
  private px: Uint32Array;
  private orig = new Map<number, number>();
  private cover = new Map<number, number>();
  private last: [number, number] | null = null;
  private mask: Uint8Array | null;
  private done = false;

  constructor(private layer: RGBA, map: RegionMap, private opts: BrushOpts) {
    this.px = u32(layer);
    this.mask = opts.clipLabel != null && opts.clipLabel >= 0 ? clipMask(map, opts.clipLabel) : null;
  }

  add(x: number, y: number): void {
    if (this.done) return;
    if (!this.last) {
      this.stamp(x, y);
    } else {
      const [lx, ly] = this.last;
      const dist = Math.hypot(x - lx, y - ly);
      const step = Math.max(0.5, this.opts.size / 4);
      const n = Math.max(1, Math.ceil(dist / step));
      for (let i = 1; i <= n; i++) this.stamp(lx + ((x - lx) * i) / n, ly + ((y - ly) * i) / n);
    }
    this.last = [x, y];
  }

  private stamp(cx: number, cy: number): void {
    const { width: w, height: h } = this.layer;
    const r = Math.max(0.5, this.opts.size / 2);
    const x0 = Math.max(0, Math.floor(cx - r - 1));
    const x1 = Math.min(w - 1, Math.ceil(cx + r + 1));
    const y0 = Math.max(0, Math.floor(cy - r - 1));
    const y1 = Math.min(h - 1, Math.ceil(cy + r + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const edge = Math.min(1, Math.max(0, r + 0.5 - d)); // khử răng cưa 1px
        if (edge <= 0) continue;
        const i = y * w + x;
        if (this.mask && !this.mask[i]) continue;
        const a = edge * this.opts.opacity;
        const prev = this.cover.get(i) ?? 0;
        if (a <= prev) continue;
        if (!this.orig.has(i)) this.orig.set(i, this.px[i]);
        this.cover.set(i, a);
        this.px[i] = this.blend(this.orig.get(i)!, a);
      }
    }
  }

  private blend(o: number, a: number): number {
    const oa = (o >>> 24) / 255;
    if (this.opts.erase) {
      const na = Math.round(oa * (1 - a) * 255);
      return na === 0 ? 0 : ((o & 0x00ffffff) | (na << 24)) >>> 0;
    }
    const [r, g, b] = this.opts.color;
    const outA = a + oa * (1 - a);
    if (outA <= 0) return 0;
    const mix = (c: number, oc: number) => Math.round((c * a + oc * oa * (1 - a)) / outA);
    const nr = mix(r, o & 255);
    const ng = mix(g, (o >>> 8) & 255);
    const nb = mix(b, (o >>> 16) & 255);
    return (nr | (ng << 8) | (nb << 16) | (Math.round(outA * 255) << 24)) >>> 0;
  }

  /** Kết thúc nét; trả patch các pixel đã đổi hoặc null. */
  finish(): Patch | null {
    this.done = true;
    const ids: number[] = [];
    for (const [i, o] of this.orig) if (this.px[i] !== o) ids.push(i);
    if (!ids.length) return null;
    const indices = Uint32Array.from(ids);
    const before = new Uint32Array(ids.length);
    const after = new Uint32Array(ids.length);
    ids.forEach((i, k) => { before[k] = this.orig.get(i)!; after[k] = this.px[i]; });
    return { indices, before, after };
  }

  /** Huỷ nét, trả lớp màu về như trước. */
  cancel(): void {
    for (const [i, o] of this.orig) this.px[i] = o;
    this.done = true;
  }
}

/** Xoá màu cả vùng. Trả null nếu vùng vốn trống. */
export function eraseRegion(layer: RGBA, map: RegionMap, label: number): Patch | null {
  if (label < 0 || label >= map.count) return null;
  const idx = regionPixelIndex(map)[label];
  const px = u32(layer);
  const ids: number[] = [];
  for (let k = 0; k < idx.length; k++) if (px[idx[k]] !== 0) ids.push(idx[k]);
  if (!ids.length) return null;
  const indices = Uint32Array.from(ids);
  const before = new Uint32Array(ids.length);
  ids.forEach((i, k) => { before[k] = px[i]; px[i] = 0; });
  return { indices, before, after: new Uint32Array(ids.length) };
}
