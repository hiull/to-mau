type Pt = { x: number; y: number };

/**
 * Khung nhìn phóng to/kéo cho bức tranh.
 * - Chế độ 'fill': một ngón chạm = onTap, kéo một ngón = di chuyển.
 * - Chế độ 'draw': một ngón = nét vẽ (onStroke*).
 * - Hai ngón: phóng to + kéo; nếu đang vẽ dở thì huỷ nét (onStrokeCancel).
 * - Chuột: lăn = zoom, nút giữa hoặc giữ Space + kéo = di chuyển.
 */
export class Viewport {
  mode: 'fill' | 'draw' = 'fill';
  onTap: (x: number, y: number) => void = () => {};
  onStrokeStart: (x: number, y: number) => void = () => {};
  onStrokeMove: (x: number, y: number) => void = () => {};
  onStrokeEnd: (x: number, y: number) => void = () => {};
  onStrokeCancel: () => void = () => {};

  private scale = 1;
  private tx = 0;
  private ty = 0;
  private minScale = 0.1;
  private maxScale = 16;
  private pointers = new Map<number, Pt>();
  private start: Pt | null = null;
  private moved = false;
  private drawing = false;
  private panning = false;
  private pinch: { dist: number; mid: Pt; scale: number; tx: number; ty: number } | null = null;
  private lastPan: Pt | null = null;
  private space = false;
  /** Người dùng đã tự phóng to/kéo: khi khung đổi kích thước thì giữ nguyên góc nhìn thay vì fit() lại. */
  private userMoved = false;
  private lastSize: { w: number; h: number } | null = null;
  private cleanup: (() => void)[] = [];

  constructor(private el: HTMLElement, private stage: HTMLElement, private contentW: number, private contentH: number) {
    stage.style.width = contentW + 'px';
    stage.style.height = contentH + 'px';
    stage.style.transformOrigin = '0 0';
    const on = <K extends keyof HTMLElementEventMap>(t: EventTarget, type: K | string, fn: (e: any) => void, opts?: AddEventListenerOptions) => {
      t.addEventListener(type, fn, opts);
      this.cleanup.push(() => t.removeEventListener(type, fn, opts));
    };
    on(el, 'pointerdown', (e: PointerEvent) => this.down(e));
    on(el, 'pointermove', (e: PointerEvent) => this.move(e));
    on(el, 'pointerup', (e: PointerEvent) => this.up(e));
    on(el, 'pointercancel', (e: PointerEvent) => this.up(e, true));
    on(el, 'wheel', (e: WheelEvent) => this.wheel(e), { passive: false });
    on(el, 'gesturestart', (e: Event) => e.preventDefault());
    on(el, 'contextmenu', (e: Event) => e.preventDefault());
    on(window, 'keydown', (e: KeyboardEvent) => { if (e.code === 'Space') this.space = true; });
    on(window, 'keyup', (e: KeyboardEvent) => { if (e.code === 'Space') this.space = false; });
    const ro = new ResizeObserver(() => this.resized());
    ro.observe(el);
    this.cleanup.push(() => ro.disconnect());
    this.fit(false);
  }

  destroy() { this.cleanup.forEach((f) => f()); }

  private resized() {
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (!this.userMoved || !this.lastSize) return this.fit(false);
    // Giữ điểm nội dung ở giữa khung đứng yên.
    this.tx += (r.width - this.lastSize.w) / 2;
    this.ty += (r.height - this.lastSize.h) / 2;
    this.lastSize = { w: r.width, h: r.height };
    this.apply();
  }

  /** Vừa khung, căn giữa. */
  fit(byUser = true): void {
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.lastSize = { w: r.width, h: r.height };
    if (byUser) this.userMoved = false;
    const pad = 16;
    const s = Math.min((r.width - pad * 2) / this.contentW, (r.height - pad * 2) / this.contentH);
    this.scale = s;
    this.minScale = s * 0.5;
    this.maxScale = Math.max(s * 12, 4);
    this.tx = (r.width - this.contentW * s) / 2;
    this.ty = (r.height - this.contentH * s) / 2;
    this.apply();
  }

  zoomBy(k: number): void {
    const r = this.el.getBoundingClientRect();
    this.zoomAt(r.width / 2, r.height / 2, this.scale * k);
  }

  toContent(clientX: number, clientY: number): [number, number] {
    const r = this.el.getBoundingClientRect();
    return [(clientX - r.left - this.tx) / this.scale, (clientY - r.top - this.ty) / this.scale];
  }

  private apply() {
    this.stage.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.scale})`;
  }

  private zoomAt(lx: number, ly: number, s: number) {
    this.userMoved = true;
    s = Math.min(this.maxScale, Math.max(this.minScale, s));
    this.tx = lx - ((lx - this.tx) * s) / this.scale;
    this.ty = ly - ((ly - this.ty) * s) / this.scale;
    this.scale = s;
    this.apply();
  }

  private local(e: { clientX: number; clientY: number }): Pt {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private down(e: PointerEvent) {
    try { this.el.setPointerCapture(e.pointerId); } catch { /* sự kiện giả lập */ }
    this.pointers.set(e.pointerId, this.local(e));
    if (this.pointers.size === 2) {
      if (this.drawing) { this.drawing = false; this.onStrokeCancel(); }
      this.start = null;
      this.panning = false;
      const [a, b] = [...this.pointers.values()];
      this.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, scale: this.scale, tx: this.tx, ty: this.ty };
      return;
    }
    if (this.pointers.size > 2) return;
    const p = this.local(e);
    if (e.pointerType === 'mouse' && (e.button === 1 || e.button === 2 || this.space)) {
      this.panning = true;
      this.lastPan = p;
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.start = p;
    this.moved = false;
    if (this.mode === 'draw') {
      this.drawing = true;
      this.onStrokeStart(...this.toContent(e.clientX, e.clientY));
    }
  }

  private move(e: PointerEvent) {
    if (!this.pointers.has(e.pointerId)) return;
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = Math.min(this.maxScale, Math.max(this.minScale, (this.pinch.scale * dist) / this.pinch.dist));
      // Giữ điểm nội dung dưới trung điểm ban đầu đi theo trung điểm hiện tại.
      const cx = (this.pinch.mid.x - this.pinch.tx) / this.pinch.scale;
      const cy = (this.pinch.mid.y - this.pinch.ty) / this.pinch.scale;
      this.userMoved = true;
      this.scale = s;
      this.tx = mid.x - cx * s;
      this.ty = mid.y - cy * s;
      this.apply();
      return;
    }
    if (this.panning && this.lastPan) {
      this.userMoved = true;
      this.tx += p.x - this.lastPan.x;
      this.ty += p.y - this.lastPan.y;
      this.lastPan = p;
      this.apply();
      return;
    }
    if (!this.start) return;
    if (!this.moved && Math.hypot(p.x - this.start.x, p.y - this.start.y) > 8) {
      this.moved = true;
      if (this.mode === 'fill') { this.panning = true; this.lastPan = p; return; }
    }
    if (this.drawing) this.onStrokeMove(...this.toContent(e.clientX, e.clientY));
  }

  private up(e: PointerEvent, cancelled = false) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    if (this.pinch) {
      if (this.pointers.size === 0) this.pinch = null;
      return; // không tiếp tục vẽ/tô sau khi đã dùng hai ngón
    }
    if (this.drawing) {
      this.drawing = false;
      if (cancelled) this.onStrokeCancel();
      else this.onStrokeEnd(...this.toContent(e.clientX, e.clientY));
    } else if (this.start && !this.moved && !this.panning && !cancelled && this.mode === 'fill') {
      this.onTap(...this.toContent(e.clientX, e.clientY));
    }
    this.start = null;
    this.panning = false;
    this.lastPan = null;
  }

  private wheel(e: WheelEvent) {
    e.preventDefault();
    const p = this.local(e);
    if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
      this.zoomAt(p.x, p.y, this.scale * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    } else {
      this.userMoved = true;
      this.tx -= e.deltaX;
      this.apply();
    }
  }
}
