/** Ảnh xám 1 kênh: 0 = đen/nét, 255 = trắng. */
export type Gray = { width: number; height: number; data: Uint8Array };
/** Ảnh RGBA giống ImageData nhưng không phụ thuộc DOM. */
export type RGBA = { width: number; height: number; data: Uint8ClampedArray };
export type Level = 'de' | 'vua' | 'kho';
/** labels[i] = -1 cho pixel nét, 0..count-1 cho vùng. areas[k] = số pixel của vùng k. */
export type RegionMap = { width: number; height: number; labels: Int32Array; count: number; areas: Uint32Array };

export const LEVEL_NAMES: Record<Level, string> = { de: 'Dễ', vua: 'Vừa', kho: 'Khó' };
