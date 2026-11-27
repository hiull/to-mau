import type { Level } from '../core/types';

/** v: 8 ký tự đầu SHA-1 nội dung file, đổi khi hình được sửa. */
export type CatalogEntry = { id: string; name: string; level: Level; file: string; v: string };

const BASE = import.meta.env.BASE_URL + 'drawings/';
let cache: Promise<CatalogEntry[]> | null = null;

export function loadCatalog(): Promise<CatalogEntry[]> {
  return (cache ??= fetch(BASE + 'catalog.json').then((r) => r.json()));
}
export const drawingUrl = (e: CatalogEntry) => BASE + e.file;
export async function drawingBlob(e: CatalogEntry): Promise<Blob> {
  const r = await fetch(drawingUrl(e));
  return new Blob([await r.text()], { type: 'image/svg+xml' });
}
