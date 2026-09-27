import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  server: { port: 3002 },
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  build: { outDir: 'dist', assetsDir: 'assets' },
})
