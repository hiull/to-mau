/** Lưu lớp màu dạng RGBA thô nén gzip: nhanh hơn nhiều so với mã hoá PNG trên canvas lớn. */
export type EncodedLayer = { color: Blob; enc: 'gz-rgba'; w: number; h: number };

export async function encodeLayer(data: Uint8ClampedArray, w: number, h: number): Promise<EncodedLayer> {
  const stream = new Blob([data as Uint8ClampedArray<ArrayBuffer>]).stream().pipeThrough(new CompressionStream('gzip'));
  return { color: await new Response(stream).blob(), enc: 'gz-rgba', w, h };
}

/** Giải mã lớp màu đã lưu, kèm kích thước lúc lưu. Trả null nếu không phải dạng gz-rgba hoặc dữ liệu hỏng. */
export async function decodeLayer(p: { color: Blob; enc?: string; w?: number; h?: number }): Promise<{ data: Uint8ClampedArray; w: number; h: number } | null> {
  if (p.enc !== 'gz-rgba' || !p.w || !p.h) return null;
  try {
    const buf = await new Response(p.color.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    return buf.byteLength === p.w * p.h * 4 ? { data: new Uint8ClampedArray(buf), w: p.w, h: p.h } : null;
  } catch {
    return null;
  }
}

/** Đổi kích thước RGBA theo kiểu lân cận gần nhất (giữ màu vùng sắc nét, không pha trộn). */
export function resampleRGBA(src: Uint8ClampedArray, sw: number, sh: number, dw: number, dh: number): Uint8ClampedArray {
  if (sw === dw && sh === dh) return src;
  const s32 = new Uint32Array(src.buffer, src.byteOffset, sw * sh);
  const out = new Uint8ClampedArray(dw * dh * 4);
  const d32 = new Uint32Array(out.buffer);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.floor(((y + 0.5) * sh) / dh));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor(((x + 0.5) * sw) / dw));
      d32[y * dw + x] = s32[sy * sw + sx];
    }
  }
  return out;
}
