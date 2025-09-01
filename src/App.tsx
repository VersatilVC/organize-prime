import * as React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createOptimizedQueryClient } from '@/lib/query-client';
import { AuthProvider } from './auth/AuthProvider';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { ImpersonationProvider } from './contexts/ImpersonationContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { AccessibilityProvider, SkipToContent } from './components/accessibility/AccessibilityProvider';
import { AppRoutes } from './AppRoutes';
import { ErrorBoundary, AsyncErrorBoundary } from '@/components/ErrorBoundary';
import { setupGlobalErrorHandling } from '@/lib/error-handling';
import { errorHandler } from '@/lib/error-handling';
import './index.css';

// Create optimized query client instance - memoized to prevent recreation
const queryClient = createOptimizedQueryClient();

// Setup global error handling on module load
setupGlobalErrorHandling();

// Memoized app content with properly structured error boundaries
const AppContent = React.memo(() => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      errorHandler.handleError(error, 'App Root Error Boundary');
    }}
  >
    <AccessibilityProvider>
      <SkipToContent />
      <AsyncErrorBoundary>
        <AuthProvider>
          <AsyncErrorBoundary>
            <OrganizationProvider>
              <AsyncErrorBoundary>
                <ImpersonationProvider>
                  <PermissionProvider>
                    <AppRoutes />
                  </PermissionProvider>
                </ImpersonationProvider>
              </AsyncErrorBoundary>
            </OrganizationProvider>
          </AsyncErrorBoundary>
        </AuthProvider>
      </AsyncErrorBoundary>
    </AccessibilityProvider>
  </ErrorBoundary>
));

AppContent.displayName = 'AppContent';


/**
 * Main App Component
 * 
 * Provides the core application structure with proper error boundaries,
 * context providers, and optimized rendering patterns.
 */
function App() {
  // Initialize service worker in production for progressive enhancement
  React.useEffect(() => {
    try {
      if (import.meta.env.PROD) {
        // Service worker temporarily disabled for debugging - enable when ready
        console.log('Service worker registration skipped for debugging');
        // TODO: Re-enable when service worker is stable
        // registerServiceWorker();
      } else {
        console.log('Service worker disabled in development to prevent caching issues.');
      }
    } catch (error) {
      errorHandler.handleError(error, 'App initialization', errorHandler.ErrorSeverity.LOW);
    }
  }, []);

  try {
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
  } catch (error) {
    // Fallback for critical render errors
    errorHandler.handleError(error, 'App render', errorHandler.ErrorSeverity.CRITICAL);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Application Error</h1>
          <p className="text-muted-foreground">The application failed to start properly.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }
}

export default App;