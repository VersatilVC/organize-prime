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
        manualChunks: {
          // Core vendor chunks - most critical
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'supabase-vendor': ['@supabase/supabase-js'],
          
          // UI vendor chunks - load on demand
          'ui-vendor': [
            '@radix-ui/react-dialog', 
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-popover',
            '@radix-ui/react-accordion'
          ],
          
          // Feature-specific chunks
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'utils': ['date-fns', 'clsx', 'tailwind-merge', 'lz-string'],
          'charts': ['recharts'],
          
          // Admin-only features (heavy, rarely used)
          'admin-features': [
            '@hello-pangea/dnd',
            'src/components/admin/',
            'src/pages/admin/'
          ],
          
          // Knowledge base app
          'kb-app': [
            'src/apps/knowledge-base/',
            'src/features/knowledge-base/'
          ],
          
          // Settings and configuration
          'settings': [
            'src/components/settings/',
            'src/pages/CompanySettings',
            'src/pages/SystemSettings',
            'src/pages/ProfileSettings'
          ]
        },
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
