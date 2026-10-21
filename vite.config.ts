import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vitest/config'

// Reload the browser by itself whenever a source file is saved. Hot module replacement alone can leave a page showing stale code
// (a module that also exports non-components, a timer-driven overlay...), which meant refreshing by hand. A full reload always shows the new code.
function reloadOnSave(): Plugin {
  return {
    name: 'reload-on-save',
    apply: 'serve',
    handleHotUpdate({ file, server }) {
      if (/[\/]src[\/].*\.(tsx?|css|json|svg)$/.test(file) && !/\.test\.tsx?$/.test(file)) {
        server.ws.send({ type: 'full-reload' })
        return []   // we handled it: skip the partial update
      }
    },
  }
}

// https://vite.dev/config/
// No service worker: a cached script inside an OBS Browser Source would keep showing yesterday's overlay.
export default defineConfig({
  plugins: [react(), tailwindcss(), reloadOnSave()],
  optimizeDeps: { include: ['react-image-crop'] },
  server: {
    host: true,   // listen on the LAN so a tablet / OBS machine can open http://192.168.1.6:5173
    allowedHosts: true,   // open it by any address or machine name (a phone using the laptop's name, a tunnel...), not only localhost
    // Poll for saved files: on some Windows drives and editors the normal file events are missed, so changes did not show until a restart.
    watch: { usePolling: true, interval: 300 },
    // One address for everything: the browser talks only to this server, which forwards API calls to the API on this machine.
    // That lets a single tunnel / Tailscale address work, and avoids cross-origin calls altogether.
    proxy: {
      // API_PROXY lets a second dev server point at another API (default: the API on its usual port)
      '/api': { target: process.env.API_PROXY ?? 'http://localhost:5141', changeOrigin: true },
      '/uploads': { target: process.env.API_PROXY ?? 'http://localhost:5141', changeOrigin: true },
      '/hubs': { target: process.env.API_PROXY ?? 'http://localhost:5141', changeOrigin: true, ws: true },
    },
  },
  preview: { host: true, allowedHosts: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
