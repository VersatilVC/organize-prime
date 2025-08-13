import { StrictMode, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { createAdvancedQueryClient } from '@/lib/advanced-query-client';
import { SimpleAuthProvider } from '@/contexts/SimpleAuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { FeatureProvider } from '@/contexts/FeatureContext';
import { ThemeProvider } from 'next-themes';
import AppRoutes from './AppRoutes';

// Create query client
const queryClient = createAdvancedQueryClient();

// Minimal loading component
const AppLoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
  </div>
);

function App() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SimpleAuthProvider>
              <OrganizationProvider>
                <FeatureProvider slug="">
                  <main className="min-h-screen bg-background">
                    <Suspense fallback={<AppLoadingSpinner />}>
                      <AppRoutes />
                    </Suspense>
                  </main>
                  <Toaster />
                </FeatureProvider>
              </OrganizationProvider>
            </SimpleAuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>
  );
}

export default App;
