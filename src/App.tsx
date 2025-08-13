import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { createAdvancedQueryClient } from '@/lib/advanced-query-client';
import { AdvancedErrorBoundary, setupGlobalErrorHandling } from '@/components/error/AdvancedErrorBoundary';
import { AccessibilityProvider, SkipToContent } from '@/components/accessibility/AccessibilityProvider';
import { SEOHead } from '@/components/SEO/SEOHead';
import { SimpleAuthProvider } from '@/contexts/SimpleAuthContext';
import { AuthErrorBoundary } from '@/components/error/AuthErrorBoundary';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { FeatureProvider } from '@/contexts/FeatureContext';
import { ThemeProvider } from 'next-themes';
import AppRoutes from './AppRoutes';
import { Suspense } from 'react';

// Setup global error handling
setupGlobalErrorHandling();

// Create query client
const queryClient = createAdvancedQueryClient();

// Optimized loading component
const AppLoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      <p className="text-sm text-muted-foreground">Loading OrganizePrime...</p>
    </div>
  </div>
);

function App() {
  return (
    <StrictMode>
      <AdvancedErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <AccessibilityProvider>
                <AuthErrorBoundary>
                  <SimpleAuthProvider>
                    <OrganizationProvider>
                      <FeatureProvider slug="">
                        {/* SEO Head with default meta tags */}
                        <SEOHead />
                        
                        {/* Skip to content link for accessibility */}
                        <SkipToContent />
                        
                        {/* Main application with proper loading state */}
                        <main id="main-content" className="min-h-screen bg-background" tabIndex={-1}>
                          <Suspense fallback={<AppLoadingSpinner />}>
                            <AppRoutes />
                          </Suspense>
                        </main>
                        
                        {/* Toast notifications */}
                        <Toaster />
                      </FeatureProvider>
                    </OrganizationProvider>
                  </SimpleAuthProvider>
                </AuthErrorBoundary>
              </AccessibilityProvider>
            </ThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AdvancedErrorBoundary>
    </StrictMode>
  );
}

export default App;
