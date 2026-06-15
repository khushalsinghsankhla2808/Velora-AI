import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("node_modules/firebase")) {
            return "firebase";
          }

          if (
            id.includes("node_modules/framer-motion") ||
            id.includes("node_modules/motion")
          ) {
            return "motion";
          }

          if (
            id.includes("node_modules/lucide-react") ||
            id.includes("node_modules/@monaco-editor")
          ) {
            return "ui";
          }

          return undefined;
        },
      },
    },
  },
})
