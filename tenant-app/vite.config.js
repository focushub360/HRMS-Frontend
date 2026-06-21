import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        //target: 'https://hrm-backend-axau.onrender.com',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      // Ensure imports from shared components resolve to this app's React
      // (fixes errors like: Rollup failed to resolve import "react/jsx-runtime")
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
      // Ensure shared imports of react-router-dom resolve to this app's package
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
    },
    // Avoid bundling duplicate React copies when resolving shared files
    dedupe: ['react', 'react-dom']
  },
  define: {
    'process.env': {}
  }
})