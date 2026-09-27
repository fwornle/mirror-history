import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],

  // GitHub Pages serves this as a *project* site at /mirror-history/, so the
  // built asset URLs have to carry that prefix. The dev server stays at the
  // root, where a prefix would only get in the way.
  base: command === 'build' ? '/mirror-history/' : '/',

  server: { port: 3002 },
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  build: { outDir: 'dist', assetsDir: 'assets' },
}))
