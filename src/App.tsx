import * as React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createOptimizedQueryClient } from '@/lib/query-client';
import { AuthProvider } from './auth/AuthProvider';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { AccessibilityProvider, SkipToContent } from './components/accessibility/AccessibilityProvider';
import { AppRoutes } from './AppRoutes';
// import { registerServiceWorker } from './utils/serviceWorker'; // Temporarily disabled
import { useRoutePreloader } from './hooks/useResourcePreloader';
import { useBundlePerformance, useMemoryOptimization } from './hooks/usePerformanceMonitor';
import { usePerformanceMonitoring, useLifecycleMonitoring } from './hooks/usePerformanceMonitoring';
import { ErrorBoundary } from '@/components/ErrorBoundary';
// Preview system removed - using simplified webhook management
import { emergencyCircuitBreaker } from './lib/emergency-circuit-breaker';
import './index.css';

// Create optimized query client instance - memoized to prevent recreation
const queryClient = createOptimizedQueryClient();

// Memoized app content with error boundaries around each context provider
const AppContent = React.memo(() => (
  <ErrorBoundary>
    <AccessibilityProvider>
      <SkipToContent />
      <ErrorBoundary>
        <AuthProvider>
          <ErrorBoundary>
            <OrganizationProvider>
              <ErrorBoundary>
                <PermissionProvider>
                  <AppRoutes />
                </PermissionProvider>
              </ErrorBoundary>
            </OrganizationProvider>
          </ErrorBoundary>
        </AuthProvider>
      </ErrorBoundary>
    </AccessibilityProvider>
  </ErrorBoundary>
));

AppContent.displayName = 'AppContent';


function App() {
  // BYPASS MECHANISM DISABLED PER USER REQUEST
  // User requested: "let's cancel the bypass it is causing too many issues"
  // const isDevelopmentBypass = false; // Always disabled now


  // Initialize service worker only (feature configs handled server-side)
  React.useEffect(() => {
    try {
      // Disable service worker in development to prevent fetch errors
      if (import.meta.env.PROD) {
        // Register service worker for progressive enhancement (production only)
        // Service worker temporarily disabled for debugging
        console.log('Service worker registration skipped for debugging');
      } else {
        console.log('Service worker disabled in development to prevent caching issues.');
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }, []);

  // 🚨 Emergency circuit breaker - prevent infinite loops (after hooks)
  if (!emergencyCircuitBreaker.checkRenderAllowed('App')) {
    return null; // Component blocked by emergency system
  }

  // 🚫 TEMPORARILY DISABLED: Performance monitoring (causing overhead)
  // usePerformanceMonitoring('App');
  // useLifecycleMonitoring('App');
  
  // 🚫 TEMPORARILY DISABLED: Bundle and memory monitoring
  // useBundlePerformance({ 
  //   enabled: import.meta.env.VITE_ENABLE_BUNDLE_MONITORING !== 'false',
  //   logPerformanceMetrics: import.meta.env.DEV 
  // });
  
  // const { addCleanupFunction } = useMemoryOptimization({ 
  //   enabled: import.meta.env.VITE_ENABLE_MEMORY_OPTIMIZATION !== 'false'
  // });

  // 🚫 TEMPORARILY DISABLED: Route preloading
  // useRoutePreloader([
  //   '/dashboard', 
  //   '/features/knowledge-base',
  //   '/users',
  //   '/settings'
  // ]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;