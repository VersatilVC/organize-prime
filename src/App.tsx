
import React from 'react';
import { AuthProvider } from '@/auth/AuthProvider';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { AppRoutes } from './AppRoutes';
import { SafeToaster } from '@/components/SafeToaster';
import { ReactStabilityChecker } from '@/components/ReactStabilityChecker';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

// Enhanced query client with error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        console.log('Query retry attempt:', failureCount, error);
        return failureCount < 3;
      }
    },
  },
});

function App() {
  console.log('App component rendering, React version:', React.version);
  
  return (
    <ErrorBoundary>
      <ReactStabilityChecker>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <OrganizationProvider>
              <AppRoutes />
              <SafeToaster />
            </OrganizationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ReactStabilityChecker>
    </ErrorBoundary>
  );
}

export default App;
