import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    proxy: {
      // Any request to /api/* gets forwarded to your Express server
      // This means you don't need VITE_API_URL at all —
      // just call fetch('/api/upload') and it works
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})