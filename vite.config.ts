import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 5173,
    // Disable HMR to prevent infinite reload loops
    hmr: false,
    // Use strict port to prevent conflicts
    strictPort: false,
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
        // Simplified chunking to prevent React instance splitting
        manualChunks: mode === 'production' ? (id) => {
          // Keep React together in main bundle
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor';
          }
          // Group other vendor dependencies
          if (id.includes('node_modules')) {
            return 'vendor';
          }
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
    },
    dedupe: ['react', 'react-dom'],
  },
  // Enhanced dependency optimization with React deduplication
  optimizeDeps: {
    include: [
      // Core React dependencies - must be first
      'react',
      'react-dom',
      'react-router-dom',
      
      // State management
      '@tanstack/react-query',
      
      // UI components (frequently used)
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu', 
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      'lucide-react',
      
      // Utility libraries
      'clsx',
      'tailwind-merge',
      
      // Forms and validation
      'react-hook-form',
    ],
    // Force re-optimization to fix React issues
    force: true,
    // Exclude problematic dependencies that might duplicate React
    exclude: ['@testing-library/*'],
    // Ensure React compatibility
    esbuildOptions: {
      target: 'es2020',
      define: {
        'process.env.NODE_ENV': mode === 'production' ? '"production"' : '"development"'
      }
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