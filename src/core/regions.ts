import type { Gray, RGBA, RegionMap } from './types';

/** Chuyển RGBA sang xám nhị phân: tối hơn ngưỡng → 0 (nét), còn lại 255. Pixel alpha < 128 coi là trắng. */
export function binarize(img: RGBA, threshold = 128): Gray {
  const { width, height, data } = img;
  const out = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < out.length; i++, j += 4) {
    if (data[j + 3] < 128) {
      out[i] = 255;
      continue;
    }
    const lum = (data[j] * 299 + data[j + 1] * 587 + data[j + 2] * 114) / 1000;
    out[i] = lum < threshold ? 0 : 255;
  }
  return { width, height, data: out };
}

/** Làm dày nét (pixel 0) thêm `radius` px theo kernel vuông. */
export function dilate(g: Gray, radius: number): Gray {
  const { width: w, height: h } = g;
  if (radius <= 0) return { width: w, height: h, data: g.data.slice() };
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  // Ngang: dùng đếm trượt số pixel đen trong cửa sổ.
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let cnt = 0;
    for (let x = 0; x < Math.min(radius, w); x++) if (g.data[row + x] === 0) cnt++;
    for (let x = 0; x < w; x++) {
      const add = x + radius;
      if (add < w && g.data[row + add] === 0) cnt++;
      const rem = x - radius - 1;
      if (rem >= 0 && g.data[row + rem] === 0) cnt--;
      tmp[row + x] = cnt > 0 ? 0 : 255;
    }
  }
  for (let x = 0; x < w; x++) {
    let cnt = 0;
    for (let y = 0; y < Math.min(radius, h); y++) if (tmp[y * w + x] === 0) cnt++;
    for (let y = 0; y < h; y++) {
      const add = y + radius;
      if (add < h && tmp[add * w + x] === 0) cnt++;
      const rem = y - radius - 1;
      if (rem >= 0 && tmp[rem * w + x] === 0) cnt--;
      out[y * w + x] = cnt > 0 ? 0 : 255;
    }
  }
  return { width: w, height: h, data: out };
}

/**
 * Gán nhãn vùng cho tranh nét. Nét (sau khi làm dày `gapRadius` px để vá khe hở) có nhãn -1.
 * Vùng nhỏ hơn `minArea` được gộp vào vùng lớn gần nhất.
 */
export function buildRegionMap(line: Gray, opts: { gapRadius?: number; minArea?: number } = {}): RegionMap {
  const gapRadius = opts.gapRadius ?? 1;
  const minArea = opts.minArea ?? 12;
  const g = gapRadius > 0 ? dilate(line, gapRadius) : line;
  const { width: w, height: h } = g;
  const n = w * h;
  const labels = new Int32Array(n).fill(-2); // -2 = chưa xét
  const queue = new Int32Array(n);
  const rawAreas: number[] = [];

  for (let i = 0; i < n; i++) if (g.data[i] === 0) labels[i] = -1;

  let count = 0;
  for (let start = 0; start < n; start++) {
    if (labels[start] !== -2) continue;
    const id = count++;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    labels[start] = id;
    while (head < tail) {
      const p = queue[head++];
      const x = p % w;
      if (x > 0 && labels[p - 1] === -2) { labels[p - 1] = id; queue[tail++] = p - 1; }
      if (x < w - 1 && labels[p + 1] === -2) { labels[p + 1] = id; queue[tail++] = p + 1; }
      if (p >= w && labels[p - w] === -2) { labels[p - w] = id; queue[tail++] = p - w; }
      if (p + w < n && labels[p + w] === -2) { labels[p + w] = id; queue[tail++] = p + w; }
    }
    rawAreas.push(tail);
  }

  // Gộp vùng nhỏ: lan đa nguồn từ các vùng lớn qua nét và vùng nhỏ.
  const big = rawAreas.map((a) => a >= minArea);
  if (big.some((b) => b) && big.some((b) => !b)) {
    const owner = new Int32Array(n).fill(-1);
    let head = 0;
    let tail = 0;
    for (let i = 0; i < n; i++) {
      const l = labels[i];
      if (l >= 0 && big[l]) { owner[i] = l; queue[tail++] = i; }
    }
    while (head < tail) {
      const p = queue[head++];
      const o = owner[p];
      const x = p % w;
      if (x > 0 && owner[p - 1] < 0) { owner[p - 1] = o; queue[tail++] = p - 1; }
      if (x < w - 1 && owner[p + 1] < 0) { owner[p + 1] = o; queue[tail++] = p + 1; }
      if (p >= w && owner[p - w] < 0) { owner[p - w] = o; queue[tail++] = p - w; }
      if (p + w < n && owner[p + w] < 0) { owner[p + w] = o; queue[tail++] = p + w; }
    }
    for (let i = 0; i < n; i++) {
      const l = labels[i];
      if (l >= 0 && !big[l]) labels[i] = owner[i];
    }
  }

  // Đánh lại nhãn liên tục 0..count-1 và tính diện tích.
  const remap = new Int32Array(count).fill(-1);
  let next = 0;
  const areasList: number[] = [];
  for (let i = 0; i < n; i++) {
    const l = labels[i];
    if (l < 0) continue;
    let r = remap[l];
    if (r < 0) { r = remap[l] = next++; areasList.push(0); }
    labels[i] = r;
    areasList[r]++;
  }
  return { width: w, height: h, labels, count: next, areas: Uint32Array.from(areasList) };
}

/** Nhãn vùng tại (x,y); nếu là nét thì tìm vùng gần nhất trong bán kính 16 px. -1 nếu ngoài ảnh/không thấy. */
export function nearestRegion(map: RegionMap, x: number, y: number): number {
  x = Math.floor(x);
  y = Math.floor(y);
  const { width: w, height: h, labels } = map;
  if (x < 0 || y < 0 || x >= w || y >= h) return -1;
  const l = labels[y * w + x];
  if (l >= 0) return l;
  for (let r = 1; r <= 16; r++) {
    let best = -1;
    let bestD = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const v = labels[yy * w + xx];
        const d = dx * dx + dy * dy;
        if (v >= 0 && d < bestD) { bestD = d; best = v; }
      }
    }
    if (best >= 0) return best;
  }
  return -1;
}
