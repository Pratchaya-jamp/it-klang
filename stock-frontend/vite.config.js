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
    proxy: {
      '/api': {
        target: 'http://localhost:5217',
        changeOrigin: true,
        secure: false,
      },
      // ✅ เพิ่มส่วนนี้สำหรับ SignalR
      '/hubs': {
        target: 'http://localhost:5217', // URL ของ Backend คุณ (เปลี่ยนพอร์ตให้ตรง)
        changeOrigin: true,
        ws: true, // 🚨 สำคัญมาก! ต้องเปิด WebSockets (ws: true)
      }
    }
  }
})
