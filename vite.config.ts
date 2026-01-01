import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    target: 'esnext'
  },
  // Tauri expects a fixed port
  server: {
    port: 5173,
    strictPort: true
  },
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_']
})
