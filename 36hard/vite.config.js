import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Served from GitHub Pages at https://<user>.github.io/workout/36hard/
const BASE = process.env.BASE_PATH || '/workout/36hard/';

export default defineConfig({
  base: BASE,
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: '36 Hard',
        short_name: '36 Hard',
        description: '36-day habit and fitness challenge tracker.',
        lang: 'en-GB',
        start_url: BASE,
        scope: BASE,
        id: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0c0d0f',
        theme_color: '#0c0d0f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${BASE}index.html`,
        // Latin glyphs only; other scripts fall back to system fonts offline.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
