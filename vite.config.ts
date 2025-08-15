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
        // Strategic chunk splitting for optimal caching and loading
        manualChunks: mode === 'production' ? (id) => {
          if (id.includes('node_modules')) {
            // Keep React ecosystem together to prevent duplicate instances
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || id.includes('scheduler')) {
              return 'react-vendor';
            }
            
            // UI libraries (Radix, Tailwind, Lucide)
            if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('class-variance-authority')) {
              return 'ui-lib';
            }
            
            // Data fetching and state management
            if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
              return 'data-lib';
            }
            
            // Date/time utilities
            if (id.includes('date-fns') || id.includes('moment')) {
              return 'date-lib';
            }
            
            // Form handling
            if (id.includes('react-hook-form') || id.includes('zod')) {
              return 'form-lib';
            }
            
            // Supabase and auth
            if (id.includes('@supabase') || id.includes('supabase')) {
              return 'supabase-lib';
            }
            
            // Analytics and monitoring
            if (id.includes('analytics') || id.includes('sentry')) {
              return 'analytics-lib';
            }
            
            // Everything else
            return 'vendor';
          }
          
          // App-specific chunks
          // Authentication modules
          if (id.includes('src/auth/') || id.includes('src/contexts/AuthContext')) {
            return 'auth';
          }
          
          // Admin and system features
          if (id.includes('src/components/admin/') || id.includes('src/pages/admin/') || id.includes('SystemSettings')) {
            return 'admin';
          }
          
          // Feature apps (knowledge-base, etc.)
          if (id.includes('src/apps/')) {
            const appMatch = id.match(/src\/apps\/([^\/]+)/);
            if (appMatch) {
              return `app-${appMatch[1]}`;
            }
            return 'features';
          }
          
          // Analytics and reporting
          if (id.includes('analytics') || id.includes('dashboard') || id.includes('Dashboard')) {
            return 'analytics';
          }
          
          // Settings and configuration
          if (id.includes('settings') || id.includes('Settings') || id.includes('configuration')) {
            return 'settings';
          }
          
        } : undefined,
        
        // Optimize chunk file names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'css/[name]-[hash].css';
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
    // Increase chunk size warning limit for better optimization
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging in production
    sourcemap: mode === 'production' ? 'hidden' : true,
    // Optimize for modern browsers
    target: 'es2020',
    // Minimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Enhanced dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      'lucide-react',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'date-fns',
      // Include Supabase dependencies to fix ESM issues
      '@supabase/supabase-js',
      '@supabase/postgrest-js',
      '@supabase/realtime-js',
      '@supabase/storage-js',
    ],
    force: true
  },
  // Fix ESM/CommonJS compatibility issues
  ssr: {
    noExternal: ['@supabase/supabase-js'],
  },
  // Ensure React consistency across the app
  define: {
    global: 'globalThis',
  },
}));