/** Lưu lớp màu dạng RGBA thô nén gzip: nhanh hơn nhiều so với mã hoá PNG trên canvas lớn. */
export type EncodedLayer = { color: Blob; enc: 'gz-rgba'; w: number; h: number };

export async function encodeLayer(data: Uint8ClampedArray, w: number, h: number): Promise<EncodedLayer> {
  const stream = new Blob([data as Uint8ClampedArray<ArrayBuffer>]).stream().pipeThrough(new CompressionStream('gzip'));
  return { color: await new Response(stream).blob(), enc: 'gz-rgba', w, h };
}

/** Trả dữ liệu RGBA đúng kích thước w×h, hoặc null nếu không khớp / hỏng. */
export async function decodeLayer(p: { color: Blob; enc?: string; w?: number; h?: number }, w: number, h: number): Promise<Uint8ClampedArray | null> {
  if (p.enc !== 'gz-rgba' || p.w !== w || p.h !== h) return null;
  try {
    const buf = await new Response(p.color.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    return buf.byteLength === w * h * 4 ? new Uint8ClampedArray(buf) : null;
  } catch {
    return null;
  }
}
