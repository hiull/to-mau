/** Ghép nền trắng + lớp màu + nét (nhân màu) thành ảnh PNG ở kích thước w×h. */
export async function composePng(color: HTMLCanvasElement, line: CanvasImageSource, w: number, h: number): Promise<Blob> {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(color, 0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(line, 0, 0, w, h);
  return canvasToBlob(c);
}

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** PNG từ canvas. OffscreenCanvas.convertToBlob nhanh hơn toBlob (Chrome hoãn toBlob tới lúc rảnh). */
export function canvasToBlob(c: HTMLCanvasElement | OffscreenCanvas): Promise<Blob> {
  if ('convertToBlob' in c) return c.convertToBlob({ type: 'image/png' });
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh'))), 'image/png'));
}

/** Tên file an toàn: bỏ dấu tiếng Việt và ký tự lạ (một số trình duyệt bỏ qua tên có dấu). */
export function safeFileName(name: string): string {
  const s = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  return s.replace(/[^A-Za-z0-9 _-]+/g, '').trim() || 'tranh-to-mau';
}

/** Trên điện thoại dùng bảng chia sẻ của hệ điều hành (lưu vào Ảnh…); trên máy tính tải file xuống. */
export async function shareOrDownload(blob: Blob, name: string): Promise<void> {
  const fileName = safeFileName(name) + '.png';
  const file = new File([blob], fileName, { type: 'image/png' });
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (coarse && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
