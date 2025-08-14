import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from './auth/AuthProvider';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { AppLayout } from './components/layout/AppLayout'; // Named import instead of default
import './index.css';

// Create a client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <OrganizationProvider>
            <AppLayout>
              {/* AppLayout expects children - add RouterGuard component here */}
            </AppLayout>
            <Toaster />
          </OrganizationProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;