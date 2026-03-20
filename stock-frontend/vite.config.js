import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'pratchaya.tailb94bae.ts.net'
    ],
    hmr: {
      clientPort: 443
    },
    proxy: {
      '/api': {
        target: 'https://pratchaya.tailb94bae.ts.net:8443',
        changeOrigin: true,
        secure: false,
      },
      // ✅ เพิ่มส่วนนี้สำหรับ SignalR
      '/hubs': {
        target: 'https://pratchaya.tailb94bae.ts.net:8443', // URL ของ Backend คุณ (เปลี่ยนพอร์ตให้ตรง)
        changeOrigin: true,
        ws: true, // 🚨 สำคัญมาก! ต้องเปิด WebSockets (ws: true)
      }
    }
  }
})
