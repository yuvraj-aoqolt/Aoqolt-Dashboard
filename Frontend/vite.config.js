import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Target modern browsers — smaller output, no polyfills
    target: 'esnext',
    // esbuild is 10-20x faster than terser and produces comparable output
    minify: 'esbuild',
    cssMinify: true,
    // Skip reporting gzip size per-chunk (speeds up build)
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Function form lets us catch every node_modules package individually
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('framer-motion'))   return 'vendor-motion'
          if (id.includes('@react-oauth'))     return 'vendor-oauth'
          if (id.includes('react-dom'))        return 'vendor-react'
          if (id.includes('react-router-dom')) return 'vendor-router'
          if (id.includes('react-hook-form'))  return 'vendor-forms'
          if (id.includes('react-hot-toast'))  return 'vendor-ui'
          if (id.includes('date-fns'))         return 'vendor-dates'
          if (id.includes('react-icons'))      return 'vendor-icons'
          if (id.includes('axios'))            return 'vendor-http'
          return 'vendor-misc'
        },
      },
    },
  },
  // Strip console.log / debugger from production builds
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },
})
