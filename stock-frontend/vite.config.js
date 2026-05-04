import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // ดึงค่า env ทั้งหมดที่ขึ้นต้นด้วย VITE_
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      host: true,
      // แปลง String จาก env เป็น Number
      port: Number(env.VITE_PORT) || 5173, 
      allowedHosts: [
        env.VITE_HOST_NAME
      ],
      hmr: {
        // สำหรับการใช้งานผ่าน Tunnel/Reverse Proxy
        clientPort: 443 
      },
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/hubs': {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
          ws: true, // สำคัญสำหรับ SignalR
        }
      }
    }
  }
})