/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    // Root-relative, so `@/lib/supabase` resolves to `<root>/src/lib/supabase`.
    alias: { '@/': '/src/' },
  },
  server: { port: 5174 },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
  },
})
