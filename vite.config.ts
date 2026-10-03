import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
// No service worker: a cached script inside an OBS Browser Source would keep showing yesterday's overlay.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: { include: ['react-image-crop'] },
  server: { host: true },   // listen on the LAN so a tablet / OBS machine can open http://192.168.1.6:5173
  preview: { host: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
