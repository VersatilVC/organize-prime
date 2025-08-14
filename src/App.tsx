
import React from 'react';
import { AuthProvider } from '@/auth/AuthProvider';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import AppRoutes from './AppRoutes';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

// Create a single query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrganizationProvider>
          <AppRoutes />
          <Toaster />
        </OrganizationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
