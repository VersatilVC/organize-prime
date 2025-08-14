import React, { Suspense } from 'react';
import { AuthProvider } from '@/auth/AuthProvider';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { AppRoutes } from './AppRoutes';
import { Toaster } from '@/components/ui/toaster';
import { ReactReadinessWrapper } from '@/components/ReactReadinessWrapper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import './index.css';

// Create a single query client instance with enhanced error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          return false;
        }
        return failureCount < 3;
      },
      onError: (error) => {
        console.error('Query error:', error);
      },
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// Enhanced loading component
const AppLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      <p className="text-sm text-muted-foreground">Initializing OrganizePrime...</p>
    </div>
  </div>
);

// Error fallback component
const AppErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="text-center max-w-md">
      <div className="text-6xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-4">
        The application encountered an error. Please try refreshing the page.
      </p>
      <div className="space-x-2">
        <button
          onClick={resetError}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
        >
          Refresh Page
        </button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-sm font-medium">Error Details</summary>
          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  </div>
);

function App() {
  try {
    return (
      <ReactReadinessWrapper>
        <ErrorBoundary fallback={AppErrorFallback}>
          <QueryClientProvider client={queryClient}>
            <Suspense fallback={<AppLoading />}>
              <AuthProvider>
                <OrganizationProvider>
                  <AppRoutes />
                  <Toaster />
                </OrganizationProvider>
              </AuthProvider>
            </Suspense>
          </QueryClientProvider>
        </ErrorBoundary>
      </ReactReadinessWrapper>
    );
  } catch (error) {
    console.error('Critical error in App component:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-800 mb-2">Critical Application Error</h1>
          <p className="text-red-600 mb-4">Failed to initialize the application</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }
}

export default App;
