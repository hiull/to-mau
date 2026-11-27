import type { Color } from '../core/fill';

export const QUICK_COLORS = [
  '#e63946', '#ff6b6b', '#ff8a3d', '#ffb703', '#ffd166', '#fff3b0',
  '#a7c957', '#52b788', '#2a9d8f', '#1b4332', '#90e0ef', '#48cae4',
  '#457b9d', '#1d3557', '#8e5bd8', '#c77dff', '#ff8fab', '#f4acb7',
  '#9c6644', '#d4a373', '#ffffff', '#adb5bd', '#495057', '#000000',
];

export const THEMES: Record<string, string[]> = {
  Pastel: ['#ffd6e0', '#ffefcf', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'],
  Rừng: ['#081c15', '#1b4332', '#2d6a4f', '#40916c', '#74c69d', '#b7e4c7', '#7f5539', '#ddb892'],
  Biển: ['#03045e', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8', '#f4d58d', '#ee9b00', '#ffffff'],
  'Hoàng hôn': ['#355070', '#6d597a', '#b56576', '#e56b6f', '#eaac8b', '#ffb4a2', '#ffcdb2', '#f9c74f'],
};

const RECENT_KEY = 'to-mau:recent';
const RECENT_MAX = 8;

export function hexToColor(hex: string): Color {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
}
export function normalizeHex(s: string): string | null {
  let h = s.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/.test(h) ? '#' + h : null;
}
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))).toString(16).padStart(2, '0');
  return `#${f(0)}${f(8)}${f(4)}`;
}
function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToColor(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter((x: unknown) => typeof x === 'string'); } catch { return []; }
}
function saveRecent(list: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* bỏ qua */ }
}

function swatch(hex: string, onPick: (h: string) => void, prefix = 'swatch-'): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'swatch';
  b.style.background = hex;
  b.setAttribute('data-testid', prefix + hex);
  b.setAttribute('aria-label', 'Màu ' + hex);
  b.dataset.hex = hex;
  b.onclick = () => onPick(hex);
  return b;
}

export type Palette = { el: HTMLElement; readonly color: Color; readonly hex: string; commitRecent(): void };

/** Thanh màu: màu nhanh, màu gần đây và bảng chọn chi tiết. */
export function createPalette(onChange: (c: Color) => void): Palette {
  let hex = QUICK_COLORS[0];
  let recent = loadRecent();
  const el = document.createElement('div');
  el.className = 'palette';

  const current = document.createElement('button');
  current.className = 'swatch current';
  current.setAttribute('data-testid', 'open-picker');
  current.setAttribute('aria-label', 'Bảng màu chi tiết');
  current.textContent = '🎨';

  const recentRow = document.createElement('div');
  recentRow.className = 'swatch-row recent';
  const quickRow = document.createElement('div');
  quickRow.className = 'swatch-row quick';

  const set = (h: string) => {
    hex = h;
    current.style.setProperty('--c', h);
    el.querySelectorAll('.swatch.selected').forEach((s) => s.classList.remove('selected'));
    el.querySelectorAll(`.swatch[data-hex="${h}"]`).forEach((s) => s.classList.add('selected'));
    onChange(hexToColor(h));
  };
  const renderRecent = () => {
    recentRow.replaceChildren(...recent.map((h) => swatch(h, set, 'recent-')));
    recentRow.hidden = recent.length === 0;
    recentRow.querySelectorAll(`.swatch[data-hex="${hex}"]`).forEach((s) => s.classList.add('selected'));
  };
  for (const h of QUICK_COLORS) quickRow.append(swatch(h, set));
  el.append(current, recentRow, quickRow);

  // Bảng chọn chi tiết
  const dlg = document.createElement('div');
  dlg.className = 'picker';
  dlg.hidden = true;
  dlg.innerHTML = `
    <div class="picker-card" role="dialog" aria-label="Chọn màu">
      <div class="picker-preview"></div>
      <label>Sắc độ <input type="range" min="0" max="360" class="h"></label>
      <label>Độ đậm <input type="range" min="0" max="100" class="s"></label>
      <label>Độ sáng <input type="range" min="0" max="100" class="l"></label>
      <label>Mã màu <input type="text" class="hex" data-testid="hex-input" maxlength="7" inputmode="text" autocomplete="off"></label>
      <div class="themes"></div>
      <button class="primary" data-testid="close-picker">Xong</button>
    </div>`;
  const q = <T extends Element>(s: string) => dlg.querySelector(s) as T;
  const [hIn, sIn, lIn] = ['.h', '.s', '.l'].map((s) => q<HTMLInputElement>(s));
  const hexIn = q<HTMLInputElement>('.hex');
  const preview = q<HTMLElement>('.picker-preview');
  const syncPicker = () => {
    const [h, s, l] = hexToHsl(hex);
    hIn.value = String(h); sIn.value = String(s); lIn.value = String(l);
    hexIn.value = hex;
    preview.style.background = hex;
  };
  const fromSliders = () => { set(hslToHex(+hIn.value, +sIn.value, +lIn.value)); hexIn.value = hex; preview.style.background = hex; };
  [hIn, sIn, lIn].forEach((i) => (i.oninput = fromSliders));
  const fromHex = () => { const n = normalizeHex(hexIn.value); if (n) { set(n); syncPicker(); } };
  hexIn.onchange = fromHex;
  hexIn.onkeydown = (e) => { if (e.key === 'Enter') fromHex(); };
  const themes = q<HTMLElement>('.themes');
  for (const [name, colors] of Object.entries(THEMES)) {
    const row = document.createElement('div');
    row.className = 'theme';
    const label = document.createElement('span');
    label.textContent = name;
    const sw = document.createElement('div');
    sw.className = 'swatch-row';
    colors.forEach((c) => sw.append(swatch(c, (h) => { set(h); syncPicker(); }, 'theme-')));
    row.append(label, sw);
    themes.append(row);
  }
  const close = () => { fromHex(); dlg.hidden = true; };
  q<HTMLButtonElement>('[data-testid=close-picker]').onclick = close;
  dlg.onclick = (e) => { if (e.target === dlg) close(); };
  current.onclick = () => { syncPicker(); dlg.hidden = false; };
  el.append(dlg);

  renderRecent();
  set(hex);
  return {
    el,
    get color() { return hexToColor(hex); },
    get hex() { return hex; },
    /** Gọi khi màu thực sự được dùng để tô. */
    commitRecent() {
      if (recent[0] === hex) return;
      recent = [hex, ...recent.filter((h) => h !== hex)].slice(0, RECENT_MAX);
      saveRecent(recent);
      renderRecent();
    },
  };
}
