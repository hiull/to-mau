import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/to-mau/',
  worker: { format: 'es' },
  build: { target: 'es2022' },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'drawings/*'],
      manifest: {
        name: 'Tô Màu',
        short_name: 'Tô Màu',
        lang: 'vi',
        display: 'standalone',
        theme_color: '#ff8a3d',
        background_color: '#fff8f0',
        start_url: '/to-mau/',
        scope: '/to-mau/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,wasm}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
} as any);
