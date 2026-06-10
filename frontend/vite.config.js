import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // 백엔드 API 프록시 (개발 시 CORS 회피)
      '/api': 'http://localhost:3001',
    },
  },
})
