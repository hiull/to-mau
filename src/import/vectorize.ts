import type { Gray } from '../core/types';

type P = [number, number];

/**
 * Dò mọi đường biên giữa pixel đen (0) và trắng. Mỗi biên là một vòng khép kín trên lưới góc pixel,
 * đi theo chiều sao cho phần đen luôn ở bên phải. Ở đỉnh "yên ngựa" luôn rẽ phải để các pixel chỉ
 * chạm góc không bị nối vào nhau.
 */
function traceLoops(g: Gray): P[][] {
  const { width: w, height: h, data } = g;
  const black = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && data[y * w + x] === 0;
  const W = w + 1;
  // Cạnh có hướng, đánh chỉ mục theo đỉnh xuất phát. Mỗi đỉnh có tối đa 2 cạnh ra.
  const out = new Map<number, number[]>(); // đỉnh -> danh sách đỉnh đích
  const addEdge = (x0: number, y0: number, x1: number, y1: number) => {
    const k = y0 * W + x0;
    const list = out.get(k);
    const v = y1 * W + x1;
    if (list) list.push(v); else out.set(k, [v]);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!black(x, y)) continue;
      if (!black(x, y - 1)) addEdge(x, y, x + 1, y); // trên: trái → phải
      if (!black(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1); // phải: xuống
      if (!black(x, y + 1)) addEdge(x + 1, y + 1, x, y + 1); // dưới: phải → trái
      if (!black(x - 1, y)) addEdge(x, y + 1, x, y); // trái: lên
    }
  }
  const loops: P[][] = [];
  for (const [startKey, firstList] of out) {
    while (firstList.length) {
      const loop: P[] = [];
      let from = startKey;
      let to = firstList.pop()!;
      loop.push([from % W, (from / W) | 0]);
      while (to !== startKey) {
        loop.push([to % W, (to / W) | 0]);
        const list = out.get(to)!;
        let pick = 0;
        if (list.length > 1) {
          // Rẽ phải: tích có hướng lớn nhất theo hệ toạ độ màn hình.
          const dx = (to % W) - (from % W), dy = ((to / W) | 0) - ((from / W) | 0);
          let best = -Infinity;
          list.forEach((v, i) => {
            const ex = (v % W) - (to % W), ey = ((v / W) | 0) - ((to / W) | 0);
            const cross = dx * ey - dy * ex;
            if (cross > best) { best = cross; pick = i; }
          });
        }
        const next = list.splice(pick, 1)[0];
        from = to;
        to = next;
      }
      if (out.get(startKey) === firstList && !firstList.length) out.delete(startKey);
      loops.push(loop);
    }
  }
  return loops;
}

/** Ramer–Douglas–Peucker cho đường mở. */
function rdp(pts: P[], eps: number): P[] {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  const len = Math.hypot(bx - ax, by - ay) || 1;
  let maxD = -1, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}

/** Đơn giản hoá vòng khép kín: cắt ở điểm xa nhất rồi RDP hai nửa. */
function simplifyLoop(loop: P[], eps: number): P[] {
  if (loop.length < 8) return loop;
  let far = 0, best = -1;
  for (let i = 1; i < loop.length; i++) {
    const d = (loop[i][0] - loop[0][0]) ** 2 + (loop[i][1] - loop[0][1]) ** 2;
    if (d > best) { best = d; far = i; }
  }
  const a = rdp(loop.slice(0, far + 1), eps);
  const b = rdp([...loop.slice(far), loop[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Vòng → path: đoạn thẳng giữa các đỉnh, mỗi góc được bo trong bán kính tối đa `radius` px. */
function smoothPath(pts: P[], radius = 2): string {
  const n = pts.length;
  if (n < 3) return '';
  const toward = (p: P, q: P): P => {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const t = Math.min(radius, len / 2) / len;
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  };
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = toward(p, pts[(i + n - 1) % n]);
    const b = toward(p, pts[(i + 1) % n]);
    d += `${i ? 'L' : 'M'}${r1(a[0])} ${r1(a[1])}Q${r1(p[0])} ${r1(p[1])} ${r1(b[0])} ${r1(b[1])}`;
  }
  return d + 'Z';
}

/** Vector hoá tranh nét (0 = nét) thành SVG nền trắng, viewBox đúng kích thước ảnh. */
export async function vectorize(line: Gray, opts: { tolerance?: number } = {}): Promise<string> {
  const eps = opts.tolerance ?? 0.9;
  const { width: w, height: h } = line;
  const d = traceLoops(line)
    .map((l) => smoothPath(simplifyLoop(l, eps)))
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#fff"/><path fill="#000" fill-rule="evenodd" d="${d}"/></svg>`;
}
