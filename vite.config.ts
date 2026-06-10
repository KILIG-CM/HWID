import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// @tauri-apps/cli sets TAURI_DEV_HOST for mobile/remote dev.
const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Tauri expects a fixed port and fails if it is not available.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: 'ws', host, port: 1421 }
      : undefined,
    watch: {
      // Don't watch the Rust backend — Cargo handles that.
      ignored: ['**/src-tauri/**'],
    },
  },
  // Produce a relative-path build so Tauri can load it from bundled assets.
  base: './',
})
