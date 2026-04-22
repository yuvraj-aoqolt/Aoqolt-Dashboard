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
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    reportCompressedSize: false,
    // Inline assets smaller than 4KB as base64 (saves HTTP requests)
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // Specific react-* packages first to avoid false matches from /react/ below
          if (id.includes('framer-motion'))    return 'vendor-motion'
          if (id.includes('@react-oauth'))     return 'vendor-oauth'
          if (id.includes('react-router-dom')) return 'vendor-router'
          if (id.includes('react-hook-form'))  return 'vendor-forms'
          if (id.includes('react-hot-toast'))  return 'vendor-ui'
          if (id.includes('react-icons'))      return 'vendor-icons'
          if (id.includes('@tanstack'))        return 'vendor-query'
          // react + react-dom together (core is small, colocation avoids waterfall)
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react'
          if (id.includes('axios'))            return 'vendor-http'
          if (id.includes('date-fns'))         return 'vendor-dates'
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
