export type Tool = 'fill' | 'brush' | 'eraser';
export type EraserMode = 'region' | 'brush';
export type ToolState = { tool: Tool; size: number; opacity: number; clip: boolean; eraserMode: EraserMode };

export type ToolbarHandlers = {
  onChange: (s: ToolState) => void;
  onUndo: () => void;
  onRedo: () => void;
  onBack: () => void;
  onZoom: (k: number) => void;
  onFit: () => void;
};

export type Toolbar = {
  header: HTMLElement;
  tools: HTMLElement;
  /** Ô chứa thêm nút ở header (lưu ảnh, tô lại…). */
  actions: HTMLElement;
  state: ToolState;
  setHistory(canUndo: boolean, canRedo: boolean): void;
};

const SIZES = [4, 12, 24, 48];

function btn(label: string, testid: string, title: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.innerHTML = label;
  b.setAttribute('data-testid', testid);
  b.title = title;
  b.setAttribute('aria-label', title);
  return b;
}

export function createToolbar(title: string, h: ToolbarHandlers): Toolbar {
  const state: ToolState = { tool: 'fill', size: 12, opacity: 1, clip: false, eraserMode: 'region' };

  const header = document.createElement('header');
  header.className = 'editor-header';
  const back = btn('←', 'back', 'Về thư viện');
  back.onclick = h.onBack;
  const name = document.createElement('h1');
  name.textContent = title;
  const undo = btn('↶', 'undo', 'Hoàn tác');
  const redo = btn('↷', 'redo', 'Làm lại');
  undo.onclick = h.onUndo;
  redo.onclick = h.onRedo;
  const actions = document.createElement('div');
  actions.className = 'actions';
  header.append(back, name, undo, redo, actions);

  const tools = document.createElement('div');
  tools.className = 'tools';
  const toolRow = document.createElement('div');
  toolRow.className = 'tool-row';
  const toolBtns: Record<Tool, HTMLButtonElement> = {
    fill: btn('🪣<span>Tô vùng</span>', 'tool-fill', 'Tô vùng'),
    brush: btn('🖌️<span>Cọ</span>', 'tool-brush', 'Cọ'),
    eraser: btn('🧽<span>Tẩy</span>', 'tool-eraser', 'Tẩy'),
  };
  const zoomOut = btn('－', 'zoom-out', 'Thu nhỏ');
  const zoomIn = btn('＋', 'zoom-in', 'Phóng to');
  const fit = btn('⤢', 'zoom-fit', 'Vừa màn hình');
  zoomOut.onclick = () => h.onZoom(1 / 1.5);
  zoomIn.onclick = () => h.onZoom(1.5);
  fit.onclick = h.onFit;
  const zoom = document.createElement('div');
  zoom.className = 'zoom';
  zoom.append(zoomOut, fit, zoomIn);
  toolRow.append(...Object.values(toolBtns), zoom);

  // Tuỳ chọn cọ
  const opts = document.createElement('div');
  opts.className = 'brush-opts';
  const sizeBtns = SIZES.map((s) => {
    const b = btn(`<i style="width:${Math.max(4, s / 2)}px;height:${Math.max(4, s / 2)}px"></i>`, 'size-' + s, 'Cỡ ' + s);
    b.className = 'size-btn';
    b.onclick = () => { state.size = s; sizeRange.value = String(s); sync(); };
    return b;
  });
  const sizeRange = document.createElement('input');
  Object.assign(sizeRange, { type: 'range', min: '1', max: '96', value: String(state.size) });
  sizeRange.setAttribute('aria-label', 'Cỡ cọ');
  sizeRange.oninput = () => { state.size = +sizeRange.value; sync(); };
  const opLabel = document.createElement('label');
  opLabel.textContent = 'Độ mờ ';
  const opRange = document.createElement('input');
  Object.assign(opRange, { type: 'range', min: '10', max: '100', value: '100' });
  opRange.oninput = () => { state.opacity = +opRange.value / 100; sync(); };
  opLabel.append(opRange);
  const clipLabel = document.createElement('label');
  clipLabel.className = 'toggle';
  const clip = document.createElement('input');
  clip.type = 'checkbox';
  clip.setAttribute('data-testid', 'clip');
  clip.onchange = () => { state.clip = clip.checked; sync(); };
  clipLabel.append(clip, ' Giữ trong vùng');
  const brushBits = document.createElement('div');
  brushBits.className = 'brush-bits';
  brushBits.append(...sizeBtns, sizeRange, opLabel, clipLabel);

  const eraserBits = document.createElement('div');
  eraserBits.className = 'eraser-bits';
  const eraseRegionBtn = btn('Chạm xoá vùng', 'erase-region', 'Chạm xoá cả vùng');
  const eraseBrushBtn = btn('Tẩy bằng cọ', 'erase-brush', 'Tẩy bằng cọ');
  eraseRegionBtn.onclick = () => { state.eraserMode = 'region'; sync(); };
  eraseBrushBtn.onclick = () => { state.eraserMode = 'brush'; sync(); };
  eraserBits.append(eraseRegionBtn, eraseBrushBtn);
  opts.append(eraserBits, brushBits);

  tools.append(toolRow, opts);

  const sync = () => {
    for (const [t, b] of Object.entries(toolBtns)) b.classList.toggle('active', t === state.tool);
    sizeBtns.forEach((b, i) => b.classList.toggle('active', SIZES[i] === state.size));
    eraseRegionBtn.classList.toggle('active', state.eraserMode === 'region');
    eraseBrushBtn.classList.toggle('active', state.eraserMode === 'brush');
    const brushy = state.tool === 'brush' || (state.tool === 'eraser' && state.eraserMode === 'brush');
    brushBits.hidden = !brushy;
    eraserBits.hidden = state.tool !== 'eraser';
    opLabel.hidden = state.tool !== 'brush';
    opts.hidden = state.tool === 'fill';
    h.onChange({ ...state });
  };
  for (const [t, b] of Object.entries(toolBtns)) b.onclick = () => { state.tool = t as Tool; sync(); };
  sync();

  return {
    header, tools, actions, state,
    setHistory(cu, cr) { undo.disabled = !cu; redo.disabled = !cr; },
  };
}
