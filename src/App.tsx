import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeRouter } from './components/SafeRouter';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import AppRoutes from './AppRoutes';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Create QueryClient with error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Main App Component with comprehensive error handling
function App() {
  console.log('App: Starting application, React available:', !!React);
  console.log('App: QueryClient created:', !!queryClient);
  
  // Ensure all React hooks are available before proceeding
  const [appReady, setAppReady] = React.useState(false);
  const [initError, setInitError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    try {
      // Validate React is fully available
      if (!React || !React.useState || !React.useEffect || !React.createContext) {
        throw new Error('React hooks not available');
      }
      
      // Small delay to ensure all React internals are properly initialized
      const timer = setTimeout(() => {
        console.log('App: All React hooks validated, setting app ready');
        setAppReady(true);
      }, 50); // Slightly longer delay
      
      return () => clearTimeout(timer);
    } catch (error) {
      console.error('App: React initialization failed:', error);
      setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
    }
  }, []);
  
  // Show error state if initialization failed
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-destructive mb-2">Application Error</h1>
          <p className="text-muted-foreground mb-4">{initError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
  
  if (!appReady) {
    console.log('App: Not ready yet, showing loading');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading application...</p>
        </div>
      </div>
    );
  }
  
  console.log('App: App ready, rendering full app');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* Only render Router when React is fully ready */}
        {appReady ? (
          <SafeRouter>
            <AuthProvider>
              <OrganizationProvider>
                <AppRoutes />
              </OrganizationProvider>
            </AuthProvider>
          </SafeRouter>
        ) : null}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;