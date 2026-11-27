import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { openStore, type Store } from './storage/db';
import { openEditor, type EditorSource } from './ui/editor-view';
import { FIXTURE_SVG } from './ui/fixture';

registerSW({ immediate: true });

const app = document.getElementById('app')!;
let teardown: (() => void) | null = null;
let storePromise: Promise<Store> | null = null;
const getStore = () => (storePromise ??= openStore());

async function resolveSource(id: string): Promise<EditorSource | null> {
  if (id === '__fixture') return { kind: 'svg', data: new Blob([FIXTURE_SVG], { type: 'image/svg+xml' }), id, name: 'Hình thử' };
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
  app.textContent = 'Tô Màu';
}

window.addEventListener('hashchange', route);
route();
