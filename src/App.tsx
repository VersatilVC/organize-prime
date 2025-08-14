
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SafeRouter } from './components/SafeRouter';
import AppRoutes from './AppRoutes';
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

// Main App with proper routing
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeRouter>
          <AppRoutes />
        </SafeRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
