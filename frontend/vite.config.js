import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '192.168.0.108',  // This allows access from other devices on the network
    port: 3000,       // Specify a port
    strictPort: true, // Don't try another port if 3000 is in use
    hmr: {
      clientPort: 3000  // Ensure HMR works on the network
    },
    proxy: {
      // Proxy API requests to your FastAPI server
      '/api': {
        target: 'http://192.168.0.108:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // Proxy WebSocket connections
      '/ws': {
        target: 'ws://192.168.0.108:8000',
        ws: true
      }
    }
  }
})