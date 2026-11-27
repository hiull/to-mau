import type { Level } from '../core/types';
import type { Store } from '../storage/db';
import { drawingUrl, loadCatalog } from '../library/catalog';

type Tab = Level | 'mine';
const TABS: [Tab, string][] = [['de', 'Dễ'], ['vua', 'Vừa'], ['kho', 'Khó'], ['mine', 'Của tôi']];
const TAB_KEY = 'to-mau:tab';

function savedTab(): Tab {
  try { const t = localStorage.getItem(TAB_KEY); if (TABS.some(([k]) => k === t)) return t as Tab; } catch { /* bỏ qua */ }
  return 'de';
}

export type Card = { id: string; name: string; thumb: string; route: string; onDelete?: () => void };

/** Mở màn hình thư viện. Trả về hàm huỷ. */
export function openLibrary(root: HTMLElement, store: Store): () => void {
  const urls: string[] = [];
  const objUrl = (b: Blob) => { const u = URL.createObjectURL(b); urls.push(u); return u; };
  let tab = savedTab();

  const el = document.createElement('div');
  el.className = 'library';
  el.innerHTML = `
    <header class="lib-header"><h1>🎨 Tô Màu</h1><button class="primary add" data-testid="add-image">＋ Thêm hình</button></header>
    <nav class="tabs" role="tablist"></nav>
    <div class="banner" hidden></div>
    <main class="grid"></main>`;
  const tabsEl = el.querySelector('.tabs')!;
  const grid = el.querySelector<HTMLElement>('.grid')!;
  (el.querySelector('.add') as HTMLButtonElement).onclick = () => { location.hash = '#/import'; };
  if (!store.available) {
    const b = el.querySelector<HTMLElement>('.banner')!;
    b.hidden = false;
    b.textContent = 'Không lưu được tranh trên trình duyệt này';
  }
  for (const [k, label] of TABS) {
    const b = document.createElement('button');
    b.textContent = label;
    b.setAttribute('data-testid', 'tab-' + k);
    b.setAttribute('role', 'tab');
    b.onclick = () => { tab = k; try { localStorage.setItem(TAB_KEY, k); } catch { /* bỏ qua */ } render(); };
    tabsEl.append(b);
  }

  const card = (c: Card) => {
    const a = document.createElement('a');
    a.className = 'card';
    a.href = c.route;
    a.setAttribute('data-testid', 'card');
    const img = document.createElement('img');
    img.src = c.thumb;
    img.alt = '';
    img.loading = 'lazy';
    const name = document.createElement('span');
    name.textContent = c.name;
    a.append(img, name);
    if (c.onDelete) {
      const del = document.createElement('button');
      del.className = 'del';
      del.textContent = '✕';
      del.setAttribute('aria-label', 'Xoá hình');
      del.setAttribute('data-testid', 'delete');
      del.onclick = (e) => { e.preventDefault(); if (confirm('Xoá hình này?')) c.onDelete!(); };
      a.append(del);
    }
    return a;
  };

  let renderId = 0;
  const render = async () => {
    const id = ++renderId;
    tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.testid === 'tab-' + tab));
    const progress = new Map((await store.listProgress()).map((p) => [p.imageId, p]));
    let cards: Card[];
    if (tab === 'mine') {
      const imgs = (await store.listImages()).sort((a, b) => b.createdAt - a.createdAt);
      cards = imgs.map((i) => ({
        id: i.id, name: i.name, route: '#/to/' + encodeURIComponent(i.id),
        thumb: objUrl(progress.get(i.id)?.thumb ?? i.data),
        onDelete: async () => { await store.deleteImage(i.id); render(); },
      }));
    } else {
      const cat = (await loadCatalog()).filter((e) => e.level === tab);
      cards = cat.map((e) => ({
        id: e.id, name: e.name, route: '#/to/' + encodeURIComponent(e.id),
        thumb: progress.get(e.id) ? objUrl(progress.get(e.id)!.thumb) : drawingUrl(e),
      }));
    }
    if (id !== renderId) return;
    if (!cards.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.innerHTML = 'Chưa có hình nào.<br>Bấm <b>＋ Thêm hình</b> để biến ảnh của bạn thành tranh tô màu.';
      grid.replaceChildren(empty);
    } else {
      grid.replaceChildren(...cards.map(card));
    }
  };

  root.replaceChildren(el);
  render();
  return () => urls.forEach((u) => URL.revokeObjectURL(u));
}
