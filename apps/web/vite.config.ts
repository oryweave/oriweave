import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@oriweave/core': path.resolve(__dirname, '../../packages/core/src'),
      '@oriweave/renderer': path.resolve(__dirname, '../../packages/renderer/src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: [
            'codemirror',
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/language',
            '@codemirror/lang-yaml',
            '@codemirror/commands',
            '@codemirror/search',
            '@codemirror/autocomplete',
            '@codemirror/lint',
          ],
          vendor: ['react', 'react-dom', 'html2canvas'],
        },
      },
    },
  },
})
