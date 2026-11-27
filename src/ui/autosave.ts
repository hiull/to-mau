/**
 * Tự lưu có hàng đợi: lưu sau `delay` ms kể từ thay đổi cuối, các lần lưu không bao giờ chạy chồng
 * lên nhau, và `reset` chờ lần lưu đang chạy xong rồi mới xoá (để màu cũ không quay lại).
 */
export class Autosaver {
  private dirty = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(private save: () => Promise<void>, private delay = 1000) {}

  markDirty(): void {
    this.dirty = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.delay);
  }

  /** Lưu ngay nếu có thay đổi; trả về khi mọi lần lưu đã xong. */
  flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.dirty) {
      this.dirty = false;
      this.queue = this.queue.then(() => this.save()).catch(() => {});
    }
    return this.queue;
  }

  /** Bỏ thay đổi chưa lưu, chờ lần lưu đang chạy, rồi chạy `clear`. */
  reset(clear: () => Promise<void>): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.dirty = false;
    this.queue = this.queue.then(clear).catch(() => {});
    return this.queue;
  }
}
