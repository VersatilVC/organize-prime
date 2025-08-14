import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // Bundle analyzer - generates stats.html in dist folder
    mode === 'production' && visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap' // or 'sunburst', 'network'
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: mode === 'production' ? (id) => {
          if (id.includes('node_modules')) {
            // Core React bundle
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Everything else in one vendor chunk to avoid circular deps
            return 'vendor';
          }
        } : undefined, // No chunk splitting in development to prevent race conditions
      },
    },
    // Increase chunk size warning limit for better optimization
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
