import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { createAdvancedQueryClient } from '@/lib/advanced-query-client';
import { AdvancedErrorBoundary, setupGlobalErrorHandling } from '@/components/error/AdvancedErrorBoundary';
import { AccessibilityProvider, SkipToContent } from '@/components/accessibility/AccessibilityProvider';
import { SEOHead } from '@/components/SEO/SEOHead';
import { EnhancedAuthProvider } from '@/contexts/EnhancedAuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { FeatureProvider } from '@/contexts/FeatureContext';
import { ThemeProvider } from 'next-themes';
import AppRoutes from './AppRoutes';
import { LazyPageWrapper } from '@/components/LazyPageWrapper';

// Setup global error handling
setupGlobalErrorHandling();

// Create query client
const queryClient = createAdvancedQueryClient();

function App() {
  return (
    <StrictMode>
      <AdvancedErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <AccessibilityProvider>
                <EnhancedAuthProvider>
                  <OrganizationProvider>
                    <FeatureProvider slug="">
                      {/* SEO Head with default meta tags */}
                      <SEOHead />
                      
                      {/* Skip to content link for accessibility */}
                      <SkipToContent />
                      
                      {/* Main application wrapped in lazy loading */}
                      <LazyPageWrapper name="app">
                        <main id="main-content" className="min-h-screen bg-background" tabIndex={-1}>
                          <AppRoutes />
                        </main>
                      </LazyPageWrapper>
                      
                      {/* Toast notifications */}
                      <Toaster />
                    </FeatureProvider>
                  </OrganizationProvider>
                </EnhancedAuthProvider>
              </AccessibilityProvider>
            </ThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AdvancedErrorBoundary>
    </StrictMode>
  );
}

export default App;
