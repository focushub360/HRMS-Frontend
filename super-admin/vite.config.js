import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  // server: {
  //   port: 5173,
  //   // proxy: {
  //   //   '/api': {
  //   //     // target: 'http://localhost:5000',
  //   //     target: 'https://hrm-backend-axau.onrender.com',
  //   //     changeOrigin: true
  //   //   }
  //   // }
  // },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    }
  },
  define: {
    'process.env': {}
  }
})