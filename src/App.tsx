import { StrictMode, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { createAdvancedQueryClient } from '@/lib/advanced-query-client';
import { SimpleAuthProvider } from '@/contexts/SimpleAuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { FeatureProvider } from '@/contexts/FeatureContext';
import { ThemeProvider } from 'next-themes';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ProductionLoadingFallback } from '@/components/ProductionLoadingFallback';
import AppRoutes from './AppRoutes';

// Create query client
const queryClient = createAdvancedQueryClient();

// Production-ready loading component
const AppLoadingSpinner = () => <ProductionLoadingFallback />;

function App() {
  console.log('🏗️ APP.TSX: App component rendering started');
  
  try {
    console.log('🏗️ APP.TSX: Setting up providers and contexts');
    return (
      <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ErrorBoundary>
              <SimpleAuthProvider>
                <OrganizationProvider>
                  <FeatureProvider slug="">
                    <main className="min-h-screen bg-background">
                      <Suspense fallback={<AppLoadingSpinner />}>
                        <ErrorBoundary>
                          <AppRoutes />
                        </ErrorBoundary>
                      </Suspense>
                    </main>
                    <Toaster />
                  </FeatureProvider>
                </OrganizationProvider>
              </SimpleAuthProvider>
            </ErrorBoundary>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
  } catch (error) {
    console.error('❌ APP.TSX: Fatal error in App component:', error);
    return <div>App initialization failed - check console</div>;
  }
}

export default App;
