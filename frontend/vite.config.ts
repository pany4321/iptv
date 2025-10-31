import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/ 这是注释
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/playlist': 'http://localhost:3000',
      '/epg': 'http://localhost:3000',
      '/proxy': 'http://localhost:3000',
    }
  }
})
