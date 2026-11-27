import type { Gray, Level } from '../core/types';
import { LEVEL_NAMES } from '../core/types';
import { buildRegionMap } from '../core/regions';
import { detectEnv, workingSize } from '../core/resolution';
import { guessLevel, guessMode, toLineArt, type ImportMode } from '../import/lineart';
import type { Store } from '../storage/db';
import { canvasToBlob } from './export';

type Crop = { x0: number; y0: number; x1: number; y1: number }; // 0..1

export function grayToCanvas(g: Gray, crop?: { x: number; y: number; w: number; h: number }): HTMLCanvasElement {
  const c = crop ?? { x: 0, y: 0, w: g.width, h: g.height };
  const canvas = document.createElement('canvas');
  canvas.width = c.w;
  canvas.height = c.h;
  const img = new ImageData(c.w, c.h);
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const v = g.data[(y + c.y) * g.width + x + c.x];
      const j = (y * c.w + x) * 4;
      img.data[j] = img.data[j + 1] = img.data[j + 2] = v;
      img.data[j + 3] = 255;
    }
  }
  canvas.getContext('2d')!.putImageData(img, 0, 0);
  return canvas;
}

/** Giải mã ảnh và thu nhỏ về kích thước làm việc ngay khi vẽ, không giữ ảnh gốc lớn trong canvas. */
async function decodeToWorking(file: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const { width, height } = workingSize(bmp.width, bmp.height, detectEnv());
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  return c;
}

function rotate90(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.height;
  c.height = src.width;
  const ctx = c.getContext('2d')!;
  ctx.translate(c.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return c;
}

const newId = () => 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Màn hình thêm hình mới. Trả về hàm huỷ. */
export function openImport(root: HTMLElement, store: Store, onDone: (id: string) => void, onBack: () => void): () => void {
  const el = document.createElement('div');
  el.className = 'import';
  el.innerHTML = `
    <header class="editor-header"><button data-testid="back" aria-label="Quay lại">←</button><h1>Thêm hình mới</h1></header>
    <main class="import-body">
      <section class="pick">
        <p>Chọn một hình vẽ hoặc ảnh chụp. App sẽ biến nó thành tranh tô màu.</p>
        <label class="primary big">📁 Chọn ảnh<input type="file" accept="image/*" data-testid="file-input" hidden></label>
        <label class="secondary big">📷 Chụp ảnh<input type="file" accept="image/*" capture="environment" hidden></label>
        <p class="hint">hoặc kéo-thả ảnh vào đây</p>
      </section>
      <section class="work" hidden>
        <div class="preview-wrap" data-testid="import-preview">
          <canvas class="preview"></canvas>
          <div class="crop"><i data-h="nw"></i><i data-h="ne"></i><i data-h="sw"></i><i data-h="se"></i></div>
          <div class="busy" hidden>Đang xử lý…</div>
        </div>
        <div class="controls">
          <div class="seg"><button data-testid="mode-drawing" data-mode="drawing">✏️ Hình vẽ nét</button><button data-testid="mode-photo" data-mode="photo">📷 Ảnh chụp</button></div>
          <label>Độ chi tiết <input type="range" min="0" max="100" value="50" data-testid="detail"></label>
          <div class="row"><button data-testid="rotate">⟳ Xoay 90°</button><button data-testid="reset-crop">Bỏ cắt</button><button data-testid="smooth" hidden>✨ Làm mượt nét</button></div>
          <label>Tên <input type="text" data-testid="import-name" maxlength="60"></label>
          <label>Cấp độ <select data-testid="import-level">
            <option value="auto">Tự động</option><option value="de">${LEVEL_NAMES.de}</option><option value="vua">${LEVEL_NAMES.vua}</option><option value="kho">${LEVEL_NAMES.kho}</option>
          </select></label>
          <button class="primary" data-testid="save-import">Lưu &amp; tô</button>
          <p class="error" hidden></p>
        </div>
      </section>
    </main>`;
  const q = <T extends Element>(s: string) => el.querySelector(s) as T;
  q<HTMLButtonElement>('[data-testid=back]').onclick = onBack;
  const pick = q<HTMLElement>('.pick');
  const work = q<HTMLElement>('.work');
  const preview = q<HTMLCanvasElement>('.preview');
  const cropEl = q<HTMLElement>('.crop');
  const busy = q<HTMLElement>('.busy');
  const detailIn = q<HTMLInputElement>('[data-testid=detail]');
  const nameIn = q<HTMLInputElement>('[data-testid=import-name]');
  const levelIn = q<HTMLSelectElement>('[data-testid=import-level]');
  const errEl = q<HTMLElement>('.error');
  const modeBtns = [...el.querySelectorAll<HTMLButtonElement>('.seg button')];

  let src: HTMLCanvasElement | null = null;
  let mode: ImportMode = 'drawing';
  let line: Gray | null = null;
  let crop: Crop = { x0: 0, y0: 0, x1: 1, y1: 1 };
  let job = 0;

  const showError = (m: string) => { errEl.hidden = false; errEl.textContent = m; };
  const syncCrop = () => {
    Object.assign(cropEl.style, { left: crop.x0 * 100 + '%', top: crop.y0 * 100 + '%', width: (crop.x1 - crop.x0) * 100 + '%', height: (crop.y1 - crop.y0) * 100 + '%' });
  };
  const syncMode = () => modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));

  const process = async () => {
    if (!src) return;
    const id = ++job;
    busy.hidden = false;
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
    if (id !== job) return;
    const data = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, src.width, src.height);
    line = toLineArt(data, mode, +detailIn.value);
    if (id !== job) return;
    const c = grayToCanvas(line);
    preview.width = c.width;
    preview.height = c.height;
    preview.getContext('2d')!.drawImage(c, 0, 0);
    preview.parentElement!.style.aspectRatio = `${c.width} / ${c.height}`;
    busy.hidden = true;
  };

  const load = async (file: File) => {
    errEl.hidden = true;
    try {
      src = await decodeToWorking(file);
    } catch {
      showError('Không mở được ảnh này. Hãy thử ảnh JPG hoặc PNG khác.');
      return;
    }
    const data = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, src.width, src.height);
    mode = guessMode(data);
    syncMode();
    nameIn.value = file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Hình của tôi';
    crop = { x0: 0, y0: 0, x1: 1, y1: 1 };
    syncCrop();
    pick.hidden = true;
    work.hidden = false;
    await process();
  };

  for (const input of el.querySelectorAll<HTMLInputElement>('input[type=file]')) {
    input.onchange = () => { const f = input.files?.[0]; if (f) void load(f); input.value = ''; };
  }
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag'));
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('drag');
    const f = [...(e.dataTransfer?.files ?? [])].find((x) => x.type.startsWith('image/'));
    if (f) void load(f);
  });

  modeBtns.forEach((b) => (b.onclick = () => { mode = b.dataset.mode as ImportMode; syncMode(); void process(); }));
  let t: ReturnType<typeof setTimeout> | undefined;
  detailIn.oninput = () => { clearTimeout(t); t = setTimeout(() => void process(), 150); };
  q<HTMLButtonElement>('[data-testid=rotate]').onclick = () => {
    if (!src) return;
    src = rotate90(src);
    crop = { x0: 1 - crop.y1, y0: crop.x0, x1: 1 - crop.y0, y1: crop.x1 };
    syncCrop();
    void process();
  };
  q<HTMLButtonElement>('[data-testid=reset-crop]').onclick = () => { crop = { x0: 0, y0: 0, x1: 1, y1: 1 }; syncCrop(); };

  // Kéo góc khung cắt
  cropEl.querySelectorAll<HTMLElement>('i').forEach((handle) => {
    handle.onpointerdown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handle.setPointerCapture(e.pointerId);
      const h = handle.dataset.h!;
      const rect = preview.getBoundingClientRect();
      handle.onpointermove = (m) => {
        const x = Math.min(1, Math.max(0, (m.clientX - rect.left) / rect.width));
        const y = Math.min(1, Math.max(0, (m.clientY - rect.top) / rect.height));
        const min = 0.08;
        if (h.includes('w')) crop.x0 = Math.min(x, crop.x1 - min);
        if (h.includes('e')) crop.x1 = Math.max(x, crop.x0 + min);
        if (h.includes('n')) crop.y0 = Math.min(y, crop.y1 - min);
        if (h.includes('s')) crop.y1 = Math.max(y, crop.y0 + min);
        syncCrop();
      };
      handle.onpointerup = () => { handle.onpointermove = null; };
    };
  });

  q<HTMLButtonElement>('[data-testid=save-import]').onclick = async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    if (!line) return;
    btn.disabled = true;
    try {
      const box = {
        x: Math.round(crop.x0 * line.width), y: Math.round(crop.y0 * line.height),
        w: Math.max(8, Math.round((crop.x1 - crop.x0) * line.width)), h: Math.max(8, Math.round((crop.y1 - crop.y0) * line.height)),
      };
      box.w = Math.min(box.w, line.width - box.x);
      box.h = Math.min(box.h, line.height - box.y);
      const canvas = grayToCanvas(line, box);
      let level = levelIn.value as Level | 'auto';
      if (level === 'auto') {
        const sub = canvas.getContext('2d')!.getImageData(0, 0, box.w, box.h);
        const g = new Uint8Array(box.w * box.h);
        for (let i = 0; i < g.length; i++) g[i] = sub.data[i * 4];
        level = guessLevel(buildRegionMap({ width: box.w, height: box.h, data: g }).count - 1);
      }
      const id = newId();
      await store.putImage({ id, name: nameIn.value.trim() || 'Hình của tôi', level, kind: 'png', data: await canvasToBlob(canvas), createdAt: Date.now() });
      onDone(id);
    } catch (err) {
      showError('Không lưu được hình: ' + ((err as Error)?.message ?? err));
      btn.disabled = false;
    }
  };

  root.replaceChildren(el);
  return () => clearTimeout(t);
}
