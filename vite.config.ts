import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 5174,
    // Re-enable HMR with proper configuration
    hmr: {
      port: 24679,
    },
    // Use strict port to prevent conflicts
    strictPort: true,
    fs: {
      strict: false,
    },
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
      external: mode === 'production' ? [] : undefined,
      output: {
        // Strategic chunking for better caching and performance
        manualChunks: mode === 'production' ? {
          // Vendor chunk for stable dependencies - better caching
          vendor: [
            'react', 
            'react-dom', 
            'react-router-dom',
            '@tanstack/react-query'
          ],
          // UI chunk for design system components
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            'lucide-react'
          ],
          // Supabase chunk for API functionality
          supabase: ['@supabase/supabase-js'],
          // Utils chunk for utility libraries
          utils: ['lodash', 'date-fns', 'zod', 'clsx', 'tailwind-merge'],
          // Charts chunk for visualization
          charts: ['recharts'],
          // KB specific chunk for knowledge base features
          knowledge: [
            '@hello-pangea/dnd',
            'react-dropzone',
            'jspdf'
          ]
        } : undefined,
        
        // Optimize chunk file names for better caching
        chunkFileNames: (chunkInfo) => {
          // Group chunks by type for better organization
          if (chunkInfo.name?.includes('vendor')) return 'js/vendor-[hash].js';
          if (chunkInfo.name?.includes('ui')) return 'js/ui-[hash].js';
          if (chunkInfo.name?.includes('supabase')) return 'js/api-[hash].js';
          return `js/[name]-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'css/[name]-[hash].css';
          }
          if (assetInfo.name?.match(/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/)) {
            return 'images/[name]-[hash].[ext]';
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
    // Increase chunk size warning limit for better optimization
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging
    sourcemap: mode === 'production' ? 'hidden' : true,
    // Optimize for modern browsers with better performance
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13'],
    // Advanced minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
        pure_funcs: mode === 'production' ? ['console.log'] : [],
      },
      mangle: {
        safari10: true,
      },
    },
    // Enable compression reporting
    reportCompressedSize: true,
    // Enable CSS code splitting for better performance
    cssCodeSplit: mode === 'production',
    // Optimize assets
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Ensure single React instance
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },
  // Enhanced dependency optimization
  optimizeDeps: {
    include: [
      // Core React dependencies
      'react',
      'react-dom',
      'react-router-dom',
      
      // State management
      '@tanstack/react-query',
      '@tanstack/react-query-persist-client',
      '@tanstack/query-sync-storage-persister',
      
      // UI components (frequently used)
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      'lucide-react',
      
      // Utility libraries
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'date-fns',
      'zod',
      'lodash',
      
      // Supabase ecosystem - DISABLED to prevent auto-loading
      // '@supabase/supabase-js',
      // '@supabase/postgrest-js',
      // '@supabase/realtime-js',
      // '@supabase/storage-js',
      
      // Knowledge Base specific
      'react-dropzone',
      '@hello-pangea/dnd',
      
      // Forms and validation
      'react-hook-form',
      '@hookform/resolvers',
    ],
    // Force re-optimization when dependencies change
    force: mode === 'development',
    // Pre-bundle entries for faster startup - DISABLED auto-discovery to prevent unwanted imports
    entries: [
      'src/main.tsx',
      // 'src/apps/**/index.ts',     // Disabled - might auto-import Supabase
      // 'src/features/**/index.ts'  // Disabled - might auto-import Supabase
    ],
    // Exclude problematic dependencies
    exclude: mode === 'production' ? ['@testing-library/*'] : [],
    // Enable esbuild optimizations
    esbuildOptions: {
      target: 'es2020',
      supported: {
        'top-level-await': true,
      },
    },
  },
  // Fix ESM/CommonJS compatibility issues
  ssr: {
    noExternal: ['@supabase/supabase-js'],
  },
  // Ensure React consistency across the app
  define: {
    global: 'globalThis',
  },
  
  // Vitest configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist'],
    css: true,
    mockReset: true,
    restoreMocks: true,
  },
}));