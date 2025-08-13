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
        manualChunks: (id) => {
          // Core vendor chunks - most critical
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('react-router-dom')) {
              return 'router-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'supabase-vendor';
            }
            
            // UI vendor chunks
            if (id.includes('@radix-ui/') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            
            // Feature-specific chunks
            if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) {
              return 'forms';
            }
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('lz-string')) {
              return 'utils';
            }
            if (id.includes('recharts')) {
              return 'charts';
            }
            if (id.includes('@hello-pangea/dnd')) {
              return 'admin-features';
            }
          }
          
          // App-specific chunks
          if (id.includes('src/components/admin/') || id.includes('src/pages/admin/')) {
            return 'admin-features';
          }
          if (id.includes('src/apps/knowledge-base/') || id.includes('src/features/knowledge-base/')) {
            return 'kb-app';
          }
          if (id.includes('src/components/settings/') || 
              id.includes('src/pages/CompanySettings') || 
              id.includes('src/pages/SystemSettings') || 
              id.includes('src/pages/ProfileSettings')) {
            return 'settings';
          }
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
