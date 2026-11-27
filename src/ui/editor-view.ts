import { binarize, buildRegionMap, nearestRegion } from '../core/regions';
import { fillRegion, type Patch } from '../core/fill';
import { History } from '../core/history';
import { Stroke, eraseRegion } from '../core/brush';
import { detectEnv, workingSize } from '../core/resolution';
import type { RegionMap } from '../core/types';
import type { Store } from '../storage/db';
import { Viewport } from './viewport';
import { createToolbar, type ToolState } from './toolbar';
import { createPalette } from './palette';

export type EditorSource = { kind: 'svg' | 'png'; data: Blob; id: string; name: string };

export async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  try {
    await img.decode();
  } catch {
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('Không mở được hình')); });
  }
  return img;
}

/** Kích thước lớp màu: SVG được raster ở độ phân giải làm việc tối đa; PNG giữ kích thước gốc (đã thu nhỏ). */
export function sizeFor(src: EditorSource, img: HTMLImageElement): { width: number; height: number } {
  const w = img.naturalWidth || 1000;
  const h = img.naturalHeight || 1000;
  if (src.kind === 'svg') {
    const max = workingSize(1e6, 1e6, detectEnv()).width;
    const k = max / Math.max(w, h);
    return { width: Math.round(w * k), height: Math.round(h * k) };
  }
  return workingSize(w, h, detectEnv());
}

export function rasterLines(img: HTMLImageElement, width: number, height: number): ImageData {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export type EditorContext = {
  root: HTMLElement;
  colorCanvas: HTMLCanvasElement;
  colorData: ImageData;
  map: RegionMap;
  history: History;
  toolbar: ReturnType<typeof createToolbar>;
  /** Gọi sau mỗi thay đổi lớp màu (tô, cọ, hoàn tác). */
  changed: Set<() => void>;
};

/** Mở màn hình tô. Trả về hàm huỷ. */
export function openEditor(root: HTMLElement, src: EditorSource, _store: Store, onBack: () => void = () => history.back()): () => void {
  let destroyed = false;
  const cleanups: (() => void)[] = [];
  const el = document.createElement('div');
  el.className = 'editor';
  el.setAttribute('data-testid', 'editor');
  el.dataset.ready = 'false';

  let state: ToolState;
  let viewport: Viewport | null = null;
  const toolbar = createToolbar(src.name, {
    onChange: (s) => { state = s; if (viewport) viewport.mode = s.tool === 'fill' || (s.tool === 'eraser' && s.eraserMode === 'region') ? 'fill' : 'draw'; },
    onUndo: () => ctx && undo(),
    onRedo: () => ctx && redo(),
    onBack,
    onZoom: (k) => viewport?.zoomBy(k),
    onFit: () => viewport?.fit(),
  });
  state = { ...toolbar.state };
  toolbar.setHistory(false, false);
  const palette = createPalette(() => {});

  const vpEl = document.createElement('div');
  vpEl.className = 'viewport';
  vpEl.setAttribute('data-testid', 'viewport');
  const stage = document.createElement('div');
  stage.className = 'stage';
  const loading = document.createElement('div');
  loading.className = 'loading';
  loading.textContent = 'Đang chuẩn bị hình…';
  vpEl.append(stage, loading);

  const dock = document.createElement('div');
  dock.className = 'dock';
  dock.append(toolbar.tools, palette.el);
  el.append(toolbar.header, vpEl, dock);
  root.replaceChildren(el);

  let ctx: EditorContext | null = null;

  const flushRect = (x0: number, y0: number, x1: number, y1: number) => {
    if (!ctx) return;
    const { colorData, colorCanvas } = ctx;
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(colorData.width, Math.ceil(x1)); y1 = Math.min(colorData.height, Math.ceil(y1));
    if (x1 <= x0 || y1 <= y0) return;
    colorCanvas.getContext('2d')!.putImageData(colorData, 0, 0, x0, y0, x1 - x0, y1 - y0);
  };
  const flushPatch = (p: Patch) => {
    const w = ctx!.colorData.width;
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (const i of p.indices) {
      const x = i % w, y = (i / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    flushRect(x0, y0, x1 + 1, y1 + 1);
  };
  const commit = (p: Patch | null) => {
    if (!ctx || !p) return;
    ctx.history.push(p);
    toolbar.setHistory(ctx.history.canUndo, ctx.history.canRedo);
    ctx.changed.forEach((f) => f());
  };
  const undo = () => {
    if (!ctx) return;
    const top = ctx.history.peekUndo();
    if (ctx.history.undo(ctx.colorData) && top) flushPatch(top);
    toolbar.setHistory(ctx.history.canUndo, ctx.history.canRedo);
    ctx.changed.forEach((f) => f());
  };
  const redo = () => {
    if (!ctx) return;
    const top = ctx.history.peekRedo();
    if (ctx.history.redo(ctx.colorData) && top) flushPatch(top);
    toolbar.setHistory(ctx.history.canUndo, ctx.history.canRedo);
    ctx.changed.forEach((f) => f());
  };

  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  };
  window.addEventListener('keydown', onKey);
  cleanups.push(() => window.removeEventListener('keydown', onKey));

  (async () => {
    const img = await loadImage(src.data);
    if (destroyed) return;
    const { width, height } = sizeFor(src, img);
    const map = buildRegionMap(binarize(rasterLines(img, width, height)));
    if (destroyed) return;

    const paper = document.createElement('div');
    paper.className = 'paper';
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = width;
    colorCanvas.height = height;
    colorCanvas.setAttribute('data-testid', 'color-canvas');
    const lines = img;
    lines.className = 'lines';
    lines.draggable = false;
    lines.alt = '';
    stage.append(paper, colorCanvas, lines);
    const colorData = new ImageData(width, height);
    ctx = { root: el, colorCanvas, colorData, map, history: new History(30), toolbar, changed: new Set() };
    (el as any).__editor = ctx;

    viewport = new Viewport(vpEl, stage, width, height);
    cleanups.push(() => viewport?.destroy());
    viewport.mode = state.tool === 'fill' || (state.tool === 'eraser' && state.eraserMode === 'region') ? 'fill' : 'draw';

    viewport.onTap = (x, y) => {
      const label = nearestRegion(map, x, y);
      if (label < 0) return;
      const p = state.tool === 'eraser' ? eraseRegion(colorData, map, label) : fillRegion(colorData, map, label, palette.color);
      if (p) {
        flushPatch(p);
        if (state.tool !== 'eraser') palette.commitRecent();
      }
      commit(p);
    };
    let stroke: Stroke | null = null;
    let last: [number, number] = [0, 0];
    const strokeFlush = (x: number, y: number) => {
      const r = state.size + 2;
      flushRect(Math.min(x, last[0]) - r, Math.min(y, last[1]) - r, Math.max(x, last[0]) + r, Math.max(y, last[1]) + r);
      last = [x, y];
    };
    viewport.onStrokeStart = (x, y) => {
      const erase = state.tool === 'eraser';
      stroke = new Stroke(colorData, map, {
        size: state.size,
        opacity: erase ? 1 : state.opacity,
        color: palette.color,
        erase,
        clipLabel: state.clip && !erase ? nearestRegion(map, x, y) : null,
      });
      last = [x, y];
      stroke.add(x, y);
      strokeFlush(x, y);
    };
    viewport.onStrokeMove = (x, y) => { if (stroke) { stroke.add(x, y); strokeFlush(x, y); } };
    viewport.onStrokeEnd = (x, y) => {
      if (!stroke) return;
      stroke.add(x, y);
      strokeFlush(x, y);
      const p = stroke.finish();
      stroke = null;
      if (p && state.tool === 'brush') palette.commitRecent();
      commit(p);
    };
    viewport.onStrokeCancel = () => {
      if (!stroke) return;
      stroke.cancel();
      stroke = null;
      flushRect(0, 0, width, height);
    };

    loading.remove();
    el.dataset.ready = 'true';
    editorReady.forEach((f) => f(ctx!));
  })().catch((err) => {
    loading.textContent = 'Không mở được hình: ' + (err?.message ?? err);
  });

  return () => {
    destroyed = true;
    cleanups.forEach((f) => f());
  };
}

/** Móc nối để các phần khác (tự lưu, xuất ảnh) gắn vào editor khi nó sẵn sàng. */
export const editorReady = new Set<(ctx: EditorContext) => void>();
