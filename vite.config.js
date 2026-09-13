import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.{test,spec}.js'],
    setupFiles: ['./tests/setup.js']
  },
  server: {
    allowedHosts: true,           // allow any host (simplest for Railway)
    host: true,
    port: Number(process.env.PORT) || 5173,
  },
})
