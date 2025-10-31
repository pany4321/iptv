import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/ 这是注释
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/playlist': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/epg': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/proxy': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    }
  }
})
