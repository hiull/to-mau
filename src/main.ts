import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { openStore, type Store } from './storage/db';
import { openEditor, type EditorSource } from './ui/editor-view';
import { FIXTURE_SVG } from './ui/fixture';
import { openLibrary } from './ui/library-view';
import { openImport } from './ui/import-view';
import { drawingBlob, loadCatalog } from './library/catalog';

registerSW({ immediate: true });

const app = document.getElementById('app')!;
let teardown: (() => void | Promise<void>) | null = null;
let routeToken = 0;
/**
 * Độ sâu lịch sử trong app (lưu ở history.state.d) để nút ← quay lại bằng history.back
 * thay vì chồng thêm mục lịch sử (nút Back của Android sẽ mở lại tranh).
 */
let depth = 0;
let replacing = false;
const replaceHash = (h: string) => { replacing = true; location.replace(h); };
const goLibrary = () => (depth > 0 ? history.back() : replaceHash('#/'));
history.replaceState({ ...(history.state ?? {}), d: history.state?.d ?? 0 }, '');
depth = history.state.d;
let storePromise: Promise<Store> | null = null;
const getStore = () => (storePromise ??= openStore());

async function resolveSource(id: string): Promise<EditorSource | null> {
  if (id === '__fixture') return { kind: 'svg', data: new Blob([FIXTURE_SVG], { type: 'image/svg+xml' }), id, name: 'Hình thử' };
  const entry = (await loadCatalog()).find((e) => e.id === id);
  if (entry) return { kind: 'svg', data: await drawingBlob(entry), id, name: entry.name, version: entry.v };
  const mine = (await (await getStore()).listImages()).find((i) => i.id === id);
  if (mine) return { kind: mine.kind, data: mine.data, id, name: mine.name };
  return null;
}

async function route() {
  const token = ++routeToken;
  const prev = teardown;
  teardown = null;
  await prev?.(); // chờ tranh đang tô lưu xong trước khi mở màn hình khác
  if (token !== routeToken) return;
  const hash = location.hash.replace(/^#/, '') || '/';
  const store = await getStore();
  if (token !== routeToken) return;
  const m = hash.match(/^\/to\/(.+)$/);
  if (m) {
    const src = await resolveSource(decodeURIComponent(m[1]));
    if (token !== routeToken) return;
    if (src) {
      teardown = openEditor(app, src, store, goLibrary);
      return;
    }
  }
  if (hash === '/import') {
    teardown = openImport(app, store, (id) => replaceHash('#/to/' + encodeURIComponent(id)), goLibrary);
    return;
  }
  if (hash !== '/') { replaceHash('#/'); return; }
  teardown = openLibrary(app, store);
}

window.addEventListener('hashchange', () => {
  if (typeof history.state?.d === 'number' && !replacing) depth = history.state.d; // back/forward
  else history.replaceState({ d: replacing ? depth : (depth += 1) }, '');
  replacing = false;
  void route();
});
route();
