import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import AppRoutes from './AppRoutes';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './index.css';

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
  
  // Ensure all React hooks are available
  const [appReady, setAppReady] = React.useState(false);
  
  React.useEffect(() => {
    console.log('App: useEffect running, setting app ready');
    setAppReady(true);
  }, []);
  
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
        <BrowserRouter>
          <AuthProvider>
            <OrganizationProvider>
              <AppRoutes />
            </OrganizationProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;