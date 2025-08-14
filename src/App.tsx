
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MinimalApp } from './components/MinimalApp';
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

// Completely minimal App without any routing
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MinimalApp />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
