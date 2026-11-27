import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import type { RGBA } from '../../src/core/types';

export function renderSvg(svg: string, width: number, background?: string): RGBA {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: width }, ...(background ? { background } : {}) }).render();
  return { width: r.width, height: r.height, data: new Uint8ClampedArray(r.pixels) };
}

/** Giả lập ảnh chụp tranh nét: giấy hơi xám, bóng đổ một góc, nhiễu nhẹ. */
export function photographedDrawing(file = 'public/drawings/ngoi-nha.svg', width = 800): RGBA {
  const img = renderSvg(readFileSync(file, 'utf8'), width, '#fff');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const shade = 0.55 + 0.4 * (x / img.width) * 0.5 + 0.4 * (y / img.height) * 0.5; // 0.55..0.95
      const n = (rnd() - 0.5) * 16;
      for (let c = 0; c < 3; c++) img.data[i + c] = Math.max(0, Math.min(255, img.data[i + c] * shade * (c === 2 ? 0.92 : 1) + n));
    }
  }
  return img;
}

/** Giả lập ảnh chụp thật: nền chuyển màu, các khối màu, nhiễu. */
export function syntheticPhoto(w = 640, h = 480): RGBA {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fa8dc"/><stop offset="1" stop-color="#cfe2f3"/></linearGradient>
  <radialGradient id="ball"><stop offset="0" stop-color="#ffd966"/><stop offset="1" stop-color="#e69138"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <rect y="${h * 0.65}" width="${w}" height="${h * 0.35}" fill="#6aa84f"/>
  <circle cx="${w * 0.3}" cy="${h * 0.5}" r="${h * 0.18}" fill="url(#ball)"/>
  <rect x="${w * 0.55}" y="${h * 0.3}" width="${w * 0.25}" height="${h * 0.4}" fill="#a61c00"/>
  <polygon points="${w * 0.5},${h * 0.3} ${w * 0.675},${h * 0.1} ${w * 0.85},${h * 0.3}" fill="#783f04"/>
  <circle cx="${w * 0.85}" cy="${h * 0.15}" r="${h * 0.06}" fill="#fff2cc"/></svg>`;
  const img = renderSvg(svg, w);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 24;
    for (let c = 0; c < 3; c++) img.data[i + c] = Math.max(0, Math.min(255, img.data[i + c] + n));
  }
  return img;
}

/** Tranh nét trên nền trong suốt. */
export function transparentDrawing(width = 600): RGBA {
  return renderSvg(readFileSync('public/drawings/mat-troi.svg', 'utf8').replace('<rect width="1000" height="1000" fill="#fff"/>', ''), width);
}
