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
let teardown: (() => void) | null = null;
let storePromise: Promise<Store> | null = null;
const getStore = () => (storePromise ??= openStore());

async function resolveSource(id: string): Promise<EditorSource | null> {
  if (id === '__fixture') return { kind: 'svg', data: new Blob([FIXTURE_SVG], { type: 'image/svg+xml' }), id, name: 'Hình thử' };
  const entry = (await loadCatalog()).find((e) => e.id === id);
  if (entry) return { kind: 'svg', data: await drawingBlob(entry), id, name: entry.name };
  const mine = (await (await getStore()).listImages()).find((i) => i.id === id);
  if (mine) return { kind: mine.kind, data: mine.data, id, name: mine.name };
  return null;
}

async function route() {
  teardown?.();
  teardown = null;
  const hash = location.hash.replace(/^#/, '') || '/';
  const store = await getStore();
  const m = hash.match(/^\/to\/(.+)$/);
  if (m) {
    const src = await resolveSource(decodeURIComponent(m[1]));
    if (src) {
      teardown = openEditor(app, src, store, () => { location.hash = '#/'; });
      return;
    }
  }
  if (hash === '/import') {
    teardown = openImport(app, store, (id) => location.replace('#/to/' + encodeURIComponent(id)), () => { location.hash = '#/'; });
    return;
  }
  if (hash !== '/') { location.replace('#/'); return; }
  teardown = openLibrary(app, store);
}

window.addEventListener('hashchange', route);
route();
