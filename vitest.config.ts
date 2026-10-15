import { defineConfig } from 'vitest/config';

// Отдельный конфиг, чтобы тестам не мешал PWA-плагин
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
