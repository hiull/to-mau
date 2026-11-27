// Tạo các hình tô màu có sẵn trong public/drawings/. Chạy: node scripts/gen-drawings.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const OUT = 'public/drawings/';
mkdirSync(OUT, { recursive: true });

const f = (n) => +n.toFixed(1);
const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const pts = (arr) => arr.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

const circle = (cx, cy, r) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`;
const ellipse = (cx, cy, rx, ry, rot = 0) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}"${rot ? ` transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"` : ''}/>`;
const rect = (x, y, w, h, r = 0) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${r ? ` rx="${r}"` : ''}/>`;
const line = (x1, y1, x2, y2) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
const polygon = (arr) => `<polygon points="${pts(arr)}"/>`;
const polyline = (arr) => `<polyline points="${pts(arr)}"/>`;
const path = (d) => `<path d="${d}"/>`;
/** Cánh hoa hình giọt nước từ tâm (cx,cy), hướng a, dài len, rộng w. */
const petal = (cx, cy, a, r0, len, w) => {
  const [x0, y0] = pol(cx, cy, r0, a);
  const [x1, y1] = pol(cx, cy, r0 + len, a);
  const [c1x, c1y] = pol(x0, y0, w, a - Math.PI / 2);
  const [c2x, c2y] = pol(x0, y0, w, a + Math.PI / 2);
  const [d1x, d1y] = pol(x1, y1, w, a - Math.PI / 2);
  const [d2x, d2y] = pol(x1, y1, w, a + Math.PI / 2);
  return path(`M${f(x0)} ${f(y0)} C${f(c1x)} ${f(c1y)} ${f(d1x)} ${f(d1y)} ${f(x1)} ${f(y1)} C${f(d2x)} ${f(d2y)} ${f(c2x)} ${f(c2y)} ${f(x0)} ${f(y0)}Z`);
};
const star = (cx, cy, R, r, n = 5, rot = -Math.PI / 2) =>
  Array.from({ length: n * 2 }, (_, i) => pol(cx, cy, i % 2 ? r : R, rot + (i * Math.PI) / n));

function svg(stroke, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
<rect width="1000" height="1000" fill="#fff"/>
<g fill="none" stroke="#000" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round">
${body}
</g>
</svg>
`;
}

const drawings = [];
const add = (id, name, level, stroke, body) => drawings.push({ id, name, level, file: `${id}.svg`, svg: svg(stroke, body.flat(Infinity).join('\n')) });

/* ------------------------------ DỄ ------------------------------ */
add('qua-tao', 'Quả táo', 'de', 14, [
  ellipse(500, 880, 260, 40),
  path('M500 330 C420 260 220 270 210 480 C200 700 360 840 500 800 C640 840 800 700 790 480 C780 270 580 260 500 330Z'),
  ellipse(330, 470, 40, 80, 20),
  path('M495 330 C490 260 500 210 530 160 L555 175 C530 215 520 265 522 330Z'),
  path('M540 230 C600 150 700 150 740 190 C690 250 610 270 540 230Z'),
  path('M470 250 C420 180 340 180 310 210 C350 260 420 270 470 250Z'),
]);

add('con-ca', 'Con cá', 'de', 14, [
  ellipse(450, 500, 280, 170),
  polygon([[720, 500], [900, 360], [900, 640]]),
  circle(300, 460, 45), circle(310, 465, 18),
  path('M430 335 C470 420 470 580 430 665'),
  path('M560 350 C600 430 600 570 560 650'),
  path('M470 330 C520 230 620 230 640 340'),
  circle(150, 300, 30), circle(110, 200, 22), circle(170, 130, 16),
]);

add('ngoi-nha', 'Ngôi nhà', 'de', 14, [
  rect(220, 450, 560, 400),
  polygon([[170, 460], [500, 170], [830, 460]]),
  rect(640, 220, 80, 150),
  rect(430, 620, 140, 230),
  circle(545, 740, 14),
  rect(270, 520, 120, 120), line(330, 520, 330, 640), line(270, 580, 390, 580),
  rect(610, 520, 120, 120),
]);

add('mat-troi', 'Mặt trời', 'de', 14, [
  circle(500, 500, 220),
  ...Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return polygon([pol(500, 500, 260, a - 0.18), pol(500, 500, 420, a), pol(500, 500, 260, a + 0.18)]);
  }),
  circle(430, 450, 28), circle(570, 450, 28),
  path('M400 560 Q500 660 600 560 Q500 610 400 560Z'),
]);

add('bong-bay', 'Bóng bay', 'de', 14, [
  ...[[300, 330, -12], [520, 280, 0], [720, 360, 12]].flatMap(([x, y, r]) => [
    ellipse(x, y, 130, 170, r),
    ellipse(x - 50, y - 70, 22, 45, r + 25),
    polygon([[x - 22, y + 190], [x + 22, y + 190], [x, y + 165]]),
    path(`M${x} ${y + 190} C${x - 40} ${y + 300} ${x + 40} ${y + 400} ${500} 900`),
  ]),
]);

add('ngoi-sao', 'Ngôi sao', 'de', 14, [
  polygon(star(500, 520, 400, 170)),
  ...star(500, 520, 400, 170).map(([x, y]) => line(500, 520, x, y)),
]);

/* ------------------------------ VỪA ------------------------------ */
add('con-meo', 'Con mèo', 'vua', 8, [
  ellipse(520, 700, 230, 190),
  path('M720 760 C860 760 900 620 860 520 C850 500 830 505 835 530 C860 640 820 720 720 720'),
  line(450, 520, 470, 880), line(570, 520, 560, 880), line(660, 560, 640, 860),
  ellipse(420, 880, 70, 35), ellipse(620, 880, 70, 35),
  circle(470, 380, 190),
  polygon([[320, 280], [300, 110], [430, 210]]), polygon([[340, 250], [330, 160], [400, 215]]),
  polygon([[620, 280], [640, 110], [510, 210]]), polygon([[600, 250], [610, 160], [540, 215]]),
  ellipse(400, 360, 40, 55), ellipse(400, 370, 18, 35),
  ellipse(540, 360, 40, 55), ellipse(540, 370, 18, 35),
  polygon([[450, 440], [490, 440], [470, 465]]),
  path('M470 465 Q440 510 410 485'), path('M470 465 Q500 510 530 485'),
  line(280, 440, 380, 450), line(280, 480, 380, 470), line(660, 440, 560, 450), line(660, 480, 560, 470),
  path('M340 540 Q470 600 600 540 L600 580 Q470 640 340 580Z'),
  circle(470, 620, 30), line(440, 620, 500, 620),
]);

add('o-to', 'Ô tô', 'vua', 8, [
  path('M110 640 L110 520 Q120 470 200 460 L300 450 L380 330 Q400 300 450 300 L650 300 Q700 300 720 330 L800 450 L870 460 Q910 470 910 520 L910 640Z'),
  polygon([[320, 450], [400, 340], [500, 340], [500, 450]]),
  polygon([[530, 450], [530, 340], [660, 340], [740, 450]]),
  line(515, 450, 515, 640), rect(420, 480, 60, 20, 8), rect(560, 480, 60, 20, 8),
  rect(110, 520, 60, 50, 10), rect(850, 520, 60, 50, 10),
  rect(90, 620, 840, 40, 15),
  ...[290, 730].flatMap((x) => [
    circle(x, 660, 100), circle(x, 660, 55),
    ...Array.from({ length: 4 }, (_, i) => line(x, 660, ...pol(x, 660, 55, (i * Math.PI) / 2 + Math.PI / 4))),
  ]),
  path('M100 820 L900 820'),
  ellipse(160, 170, 90, 45), ellipse(240, 150, 80, 50), ellipse(780, 180, 110, 50),
]);

add('bong-hoa', 'Bông hoa', 'vua', 8, [
  ...Array.from({ length: 8 }, (_, i) => petal(500, 330, (i * Math.PI) / 4, 70, 190, 70)),
  circle(500, 330, 85),
  ...Array.from({ length: 6 }, (_, i) => circle(...pol(500, 330, 50, (i * Math.PI) / 3), 14)), circle(500, 330, 16),
  path('M490 600 C480 680 500 720 490 760 L510 760 C520 720 500 680 510 600Z'),
  path('M495 690 C420 620 320 630 290 660 C350 720 440 720 495 690Z'), path('M495 690 C420 660 350 655 300 660'),
  path('M505 650 C580 580 680 590 710 620 C650 680 560 680 505 650Z'), path('M505 650 C580 620 650 615 700 620'),
  polygon([[340, 760], [660, 760], [620, 940], [380, 940]]),
  line(350, 800, 650, 800), line(365, 860, 635, 860),
]);

add('con-buom', 'Con bướm', 'vua', 8, [
  path('M490 450 C380 200 140 160 130 320 C120 460 300 500 490 470Z'),
  path('M510 450 C620 200 860 160 870 320 C880 460 700 500 510 470Z'),
  path('M490 490 C340 480 200 560 230 680 C260 780 420 720 490 520Z'),
  path('M510 490 C660 480 800 560 770 680 C740 780 580 720 510 520Z'),
  path('M490 455 C400 350 300 300 200 290'), path('M510 455 C600 350 700 300 800 290'),
  circle(260, 360, 45), circle(380, 400, 30), circle(250, 250, 25),
  circle(740, 360, 45), circle(620, 400, 30), circle(750, 250, 25),
  circle(300, 640, 40), circle(400, 600, 25), circle(700, 640, 40), circle(600, 600, 25),
  ellipse(500, 330, 30, 40), ellipse(500, 430, 26, 60), ellipse(500, 560, 22, 70), ellipse(500, 680, 16, 50),
  path('M490 295 C460 220 420 180 380 160'), circle(372, 155, 16),
  path('M510 295 C540 220 580 180 620 160'), circle(628, 155, 16),
]);

add('khu-vuon', 'Khu vườn', 'vua', 8, [
  circle(150, 150, 70),
  ellipse(600, 150, 100, 50), ellipse(690, 130, 80, 55), ellipse(780, 160, 90, 45),
  line(0, 700, 1000, 700),
  ...Array.from({ length: 8 }, (_, i) => {
    const x = 40 + i * 120;
    return polygon([[x, 700], [x, 560], [x + 40, 520], [x + 80, 560], [x + 80, 700]]);
  }),
  ...[[200, 430], [500, 380], [800, 440]].flatMap(([x, y]) => [
    line(x, y + 60, x, 840),
    ...Array.from({ length: 5 }, (_, i) => petal(x, y, (i * 2 * Math.PI) / 5 - Math.PI / 2, 30, 70, 32)),
    circle(x, y, 34),
  ]),
  path('M0 880 Q250 840 500 880 T1000 880'),
]);

add('tau-thuy', 'Tàu thuỷ', 'vua', 8, [
  circle(850, 140, 70),
  ellipse(200, 140, 90, 40), ellipse(280, 120, 70, 45),
  path('M150 560 L850 560 L760 720 L240 720Z'),
  line(185, 610, 815, 610), line(215, 665, 785, 665),
  rect(260, 420, 480, 140),
  ...[330, 430, 530, 630].map((x) => circle(x, 490, 28)),
  rect(340, 270, 90, 150), rect(560, 270, 90, 150),
  line(340, 320, 430, 320), line(560, 320, 650, 320),
  line(500, 420, 500, 230), polygon([[500, 230], [600, 260], [500, 290]]),
  path('M0 760 Q125 720 250 760 T500 760 T750 760 T1000 760'),
  path('M0 840 Q125 800 250 840 T500 840 T750 840 T1000 840'),
  path('M0 920 Q125 880 250 920 T500 920 T750 920 T1000 920'),
  polyline([[680, 200], [700, 180], [720, 200]]), polyline([[730, 240], [750, 220], [770, 240]]),
]);

/* ------------------------------ KHÓ ------------------------------ */
add('mandala-sen', 'Mandala hoa sen', 'kho', 4, [
  circle(500, 500, 60),
  ...Array.from({ length: 8 }, (_, i) => petal(500, 500, (i * Math.PI) / 4, 20, 110, 28)),
  circle(500, 500, 160),
  ...Array.from({ length: 16 }, (_, i) => line(...pol(500, 500, 160, (i * Math.PI) / 8), ...pol(500, 500, 200, (i * Math.PI) / 8))),
  circle(500, 500, 200),
  ...Array.from({ length: 12 }, (_, i) => petal(500, 500, (i * Math.PI) / 6, 200, 120, 45)),
  ...Array.from({ length: 12 }, (_, i) => petal(500, 500, (i * Math.PI) / 6, 225, 70, 20)),
  ...Array.from({ length: 24 }, (_, i) => circle(...pol(500, 500, 350, (i * Math.PI) / 12 + Math.PI / 24), 18)),
  circle(500, 500, 380),
  ...Array.from({ length: 24 }, (_, i) => petal(500, 500, (i * Math.PI) / 12, 380, 80, 26)),
  circle(500, 500, 470),
]);

add('mandala-hinh-hoc', 'Mandala hình học', 'kho', 4, [
  ...[60, 130, 200, 270, 340, 410, 470].map((r, k) => polygon(Array.from({ length: 12 }, (_, i) => pol(500, 500, r, (i * Math.PI) / 6 + (k % 2 ? Math.PI / 12 : 0))))),
  ...Array.from({ length: 24 }, (_, i) => line(...pol(500, 500, 60, (i * Math.PI) / 12), ...pol(500, 500, 470, (i * Math.PI) / 12))),
  ...Array.from({ length: 12 }, (_, i) => circle(...pol(500, 500, 235, (i * Math.PI) / 6 + Math.PI / 12), 14)),
]);

add('phong-canh-nui', 'Phong cảnh núi', 'kho', 4, [
  circle(780, 170, 70),
  ...Array.from({ length: 12 }, (_, i) => line(...pol(780, 170, 85, (i * Math.PI) / 6), ...pol(780, 170, 120, (i * Math.PI) / 6))),
  ellipse(250, 130, 80, 35), ellipse(320, 110, 70, 40), ellipse(500, 200, 90, 30),
  polygon([[0, 620], [220, 280], [440, 620]]), polygon([[220, 280], [180, 380], [220, 360], [260, 390]]), line(220, 280, 250, 620),
  polygon([[300, 620], [560, 220], [820, 620]]), polygon([[560, 220], [510, 330], [560, 300], [610, 340]]), line(560, 220, 600, 620),
  polygon([[640, 620], [860, 330], [1000, 520], [1000, 620]]), polygon([[860, 330], [820, 410], [860, 395], [900, 420]]), line(860, 330, 880, 620),
  line(0, 620, 1000, 620),
  ...[0, 1, 2, 3, 4].map((i) => path(`M${80 + i * 40} ${700 + i * 50} Q500 ${680 + i * 50} ${920 - i * 40} ${700 + i * 50}`)),
  ...Array.from({ length: 12 }, (_, i) => {
    const x = i < 6 ? 30 + i * 30 : 760 + (i - 6) * 40;
    const y = 640 + (i % 3) * 90;
    return [
      rect(x - 6, y + 70, 12, 30),
      polygon([[x - 40, y + 70], [x, y + 20], [x + 40, y + 70]]),
      polygon([[x - 32, y + 40], [x, y - 5], [x + 32, y + 40]]),
      polygon([[x - 24, y + 10], [x, y - 30], [x + 24, y + 10]]),
    ];
  }),
  ...Array.from({ length: 8 }, (_, i) => polyline([[100 + i * 50, 300 + (i % 2) * 30], [115 + i * 50, 285 + (i % 2) * 30], [130 + i * 50, 300 + (i % 2) * 30]])),
]);

add('con-cong', 'Con công', 'kho', 4, [
  ...Array.from({ length: 21 }, (_, i) => line(500, 760, ...pol(500, 760, 300, Math.PI + (i * Math.PI) / 20))),
  ...Array.from({ length: 21 }, (_, i) => {
    const a = Math.PI + (i * Math.PI) / 20;
    const [x, y] = pol(500, 760, 340, a);
    const rot = (a * 180) / Math.PI + 90;
    return [ellipse(x, y, 30, 85, rot), ellipse(x, y, 18, 45, rot), ellipse(x, y, 8, 18, rot)].map((e) => e.replace('/>', ' fill="#fff"/>'));
  }),
  ...Array.from({ length: 20 }, (_, i) => circle(...pol(500, 760, 450, Math.PI + ((i + 0.5) * Math.PI) / 20), 14)),
  `<path fill="#fff" d="M500 780 C400 780 390 650 430 560 C460 480 450 400 470 340 C485 300 540 300 550 340 C560 400 545 480 570 560 C610 650 600 780 500 780Z"/>`,
  circle(505, 345, 6), polygon([[548, 352], [580, 362], [548, 372]]),
  ...[-20, 0, 20].map((d) => [line(505, 312, 505 + d * 2, 262), circle(505 + d * 2, 254, 9)]),
  path('M440 640 C470 620 530 620 560 640'), path('M435 700 C470 680 530 680 565 700'),
  line(480, 780, 470, 880), line(520, 780, 530, 880),
  line(0, 880, 1000, 880),
]);

add('thanh-pho', 'Thành phố', 'kho', 4, [
  circle(150, 120, 55),
  ...[[40, 380, 130], [190, 250, 150], [360, 420, 110], [490, 180, 170], [680, 330, 130], [830, 260, 140]].flatMap(([x, top, w]) => {
    const out = [rect(x, top, w, 860 - top)];
    const cols = Math.floor((w - 20) / 35);
    for (let r = top + 25; r < 780; r += 60) for (let c = 0; c < cols; c++) out.push(rect(x + 15 + c * 35, r, 22, 32));
    return out;
  }),
  line(0, 860, 1000, 860), line(0, 940, 1000, 940),
  ...Array.from({ length: 6 }, (_, i) => rect(40 + i * 170, 893, 90, 14)),
]);

add('ran-san-ho', 'Rạn san hô', 'kho', 4, [
  path('M0 820 Q250 780 500 820 T1000 820'),
  ...Array.from({ length: 34 }, (_, i) => circle(40 + ((i * 137) % 920), 40 + ((i * 89) % 400), 10 + (i % 4) * 5)),
  ...[[220, 260, 1], [700, 200, -1], [430, 470, 1], [820, 520, -1], [160, 560, -1]].flatMap(([x, y, d]) => {
    const out = [ellipse(x, y, 90, 50), polygon([[x - d * 85, y], [x - d * 150, y - 45], [x - d * 150, y + 45]]), circle(x + d * 50, y - 10, 10)];
    for (let k = -1; k <= 1; k++) out.push(path(`M${x + k * 30} ${y - 48} Q${x + k * 30 + 12} ${y} ${x + k * 30} ${y + 48}`));
    return out;
  }),
  ...[[120, 820], [360, 830], [600, 820], [880, 830]].flatMap(([x, y]) => [
    path(`M${x - 15} ${y} L${x - 10} ${y - 120} L${x - 60} ${y - 200} L${x - 45} ${y - 210} L${x} ${y - 140} L${x + 50} ${y - 230} L${x + 65} ${y - 220} L${x + 15} ${y - 120} L${x + 15} ${y}Z`),
    circle(x - 52, y - 222, 12), circle(x + 58, y - 242, 12),
  ]),
  ...[[250, 900], [740, 910]].flatMap(([x, y]) => [
    path(`M${x - 70} ${y} Q${x} ${y - 110} ${x + 70} ${y} Z`),
    ...[-40, -15, 15, 40].map((dx) => line(x, y - 2, x + dx, y - 50)),
  ]),
  ...[480, 960].map((x) => path(`M${x} 980 Q${x - 30} 900 ${x} 840 Q${x + 30} 780 ${x} 720 Q${x - 25} 680 ${x} 640`)),
  ...Array.from({ length: 6 }, (_, i) => polygon(star(80 + i * 170, 960, 30, 12))),
]);

const catalog = drawings.map(({ svg: s, ...e }) => {
  writeFileSync(OUT + e.file, s);
  return { ...e, v: createHash('sha1').update(s).digest('hex').slice(0, 8) };
});
writeFileSync(OUT + 'catalog.json', JSON.stringify(catalog, null, 2) + '\n');
console.log(`Đã tạo ${catalog.length} hình.`);
