import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages открывает сайт по адресу https://<логин>.github.io/<репозиторий>/,
// поэтому при сборке в GitHub Actions BASE_PATH = '/<репозиторий>/'. Локально — '/'.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        id: '.',
        name: 'Трекер цикла',
        short_name: 'Цикл',
        description: 'Личный трекер менструального цикла',
        lang: 'ru',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFFFFF',
        theme_color: '#FFFFFF',
        // Рисуются скриптом scripts/make-icons.py; кольцо в безопасной зоне для maskable
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // woff2 шрифта Onest должен попасть в кэш, иначе офлайн без шрифта
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
});
