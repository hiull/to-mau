import type { Gray, Level, RGBA } from '../core/types';
import { dilate } from '../core/regions';

export type ImportMode = 'drawing' | 'photo';

/** Độ sáng 0..255; pixel trong suốt coi là trắng. */
function luminance(img: RGBA): Float32Array {
  const { data } = img;
  const out = new Float32Array(img.width * img.height);
  for (let i = 0, j = 0; i < out.length; i++, j += 4) {
    const a = data[j + 3] / 255;
    const l = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
    out[i] = l * a + 255 * (1 - a);
  }
  return out;
}

/** Làm mờ hộp bán kính r bằng ảnh tích phân. */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const W = w + 1;
  const sat = new Float64Array(W * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += src[y * w + x];
      sat[(y + 1) * W + x + 1] = sat[y * W + x + 1] + row;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const s = sat[y1 * W + x1] - sat[y0 * W + x1] - sat[y1 * W + x0] + sat[y0 * W + x0];
      out[y * w + x] = s / ((x1 - x0) * (y1 - y0));
    }
  }
  return out;
}

/** Bỏ các cụm pixel đen (0) nhỏ hơn minSize. */
function removeSpecks(g: Gray, minSize: number): Gray {
  if (minSize <= 1) return g;
  const { width: w, height: h, data } = g;
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  const comp: number[] = [];
  for (let s = 0; s < data.length; s++) {
    if (data[s] !== 0 || seen[s]) continue;
    comp.length = 0;
    let top = 0;
    stack[top++] = s;
    seen[s] = 1;
    while (top) {
      const p = stack[--top];
      comp.push(p);
      const x = p % w;
      // 8-liên thông để nét chéo không bị coi là vụn
      for (let dy = -1; dy <= 1; dy++) {
        const yy = ((p / w) | 0) + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const q = yy * w + xx;
          if (data[q] === 0 && !seen[q]) { seen[q] = 1; stack[top++] = q; }
        }
      }
    }
    if (comp.length < minSize) for (const p of comp) data[p] = 255;
  }
  return g;
}

/** Đoán ảnh là tranh nét hay ảnh chụp: tranh nét ít màu và sau khi cân bằng sáng gần như chỉ có trắng/đen. */
export function guessMode(img: RGBA): ImportMode {
  const { width: w, height: h, data } = img;
  const lum = luminance(img);
  const bg = boxBlur(lum, w, h, Math.max(8, Math.round(Math.max(w, h) / 30)));
  let extreme = 0;
  let sat = 0;
  let n = 0;
  const step = Math.max(1, Math.floor((w * h) / 200_000));
  for (let i = 0; i < lum.length; i += step, n++) {
    const v = Math.min(255, (lum[i] / Math.max(1, bg[i])) * 255);
    if (v > 215 || v < 90) extreme++;
    const j = i * 4;
    const mx = Math.max(data[j], data[j + 1], data[j + 2]);
    const mn = Math.min(data[j], data[j + 1], data[j + 2]);
    sat += data[j + 3] < 128 ? 0 : mx === 0 ? 0 : (mx - mn) / mx;
  }
  return extreme / n > 0.85 && sat / n < 0.2 ? 'drawing' : 'photo';
}

/**
 * Chuyển ảnh thành tranh nét (0 = nét, 255 = trắng), cùng kích thước ảnh vào.
 * detail 0..100: càng cao càng giữ nhiều nét nhỏ.
 */
export function toLineArt(img: RGBA, mode: ImportMode, detail = 50): Gray {
  const { width: w, height: h } = img;
  const d = Math.max(0, Math.min(100, detail)) / 100;
  const lum = luminance(img);
  const out = new Uint8Array(w * h).fill(255);
  const scale = Math.max(w, h) / 1000; // kích thước tham chiếu 1000 px

  if (mode === 'drawing') {
    // Chia cho nền mờ để khử bóng giấy, rồi lấy ngưỡng.
    const bg = boxBlur(lum, w, h, Math.max(8, Math.round(Math.max(w, h) / 30)));
    const thr = 0.55 + 0.3 * d; // tỉ lệ so với nền
    for (let i = 0; i < out.length; i++) if (lum[i] < bg[i] * thr) out[i] = 0;
    return removeSpecks({ width: w, height: h, data: out }, Math.round((4 + (1 - d) * 60) * scale * scale + 2));
  }

  // Ảnh chụp: làm mịn từng kênh màu → Sobel → lấy cạnh mạnh nhất giữa các kênh.
  const r = Math.max(1, Math.round(2 * scale));
  const mag = new Float32Array(w * h);
  const chan = new Float32Array(w * h);
  for (let c = 0; c < 3; c++) {
    for (let i = 0, j = c; i < chan.length; i++, j += 4) {
      const a = img.data[j - c + 3] / 255;
      chan[i] = img.data[j] * a + 255 * (1 - a);
    }
    const sm = boxBlur(boxBlur(chan, w, h, r), w, h, r);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx = sm[i - w + 1] + 2 * sm[i + 1] + sm[i + w + 1] - sm[i - w - 1] - 2 * sm[i - 1] - sm[i + w - 1];
        const gy = sm[i + w - 1] + 2 * sm[i + w] + sm[i + w + 1] - sm[i - w - 1] - 2 * sm[i - w] - sm[i - w + 1];
        const m = Math.hypot(gx, gy);
        if (m > mag[i]) mag[i] = m;
      }
    }
  }
  const thr = 30 + (1 - d) * 120;
  for (let i = 0; i < out.length; i++) if (mag[i] > thr) out[i] = 0;
  const thick = dilate({ width: w, height: h, data: out }, Math.max(1, Math.round(scale)));
  return removeSpecks(thick, Math.round((20 + (1 - d) * 300) * scale * scale));
}

export function guessLevel(regionCount: number): Level {
  return regionCount <= 15 ? 'de' : regionCount <= 60 ? 'vua' : 'kho';
}
