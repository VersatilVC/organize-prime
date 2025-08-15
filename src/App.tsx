import * as React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createOptimizedQueryClient } from '@/lib/query-client';
import { AuthProvider } from './auth/AuthProvider';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { AccessibilityProvider, SkipToContent } from './components/accessibility/AccessibilityProvider';
import { AccessibilityChecker } from './components/accessibility/AccessibilityChecker';
import { ProgressiveEnhancementDemo } from './components/ProgressiveEnhancementDemo';
import { AppRoutes } from './AppRoutes';
import { registerServiceWorker } from './utils/serviceWorker';
import './index.css';

// Create optimized query client instance - memoized to prevent recreation
const queryClient = createOptimizedQueryClient();

// Memoized app content to prevent unnecessary re-renders
const AppContent = React.memo(() => (
  <AccessibilityProvider>
    <SkipToContent />
    <AuthProvider>
      <OrganizationProvider>
        <AppRoutes />
      </OrganizationProvider>
    </AuthProvider>
  </AccessibilityProvider>
));

AppContent.displayName = 'AppContent';

function App() {
  // Register service worker for progressive enhancement
  React.useEffect(() => {
    registerServiceWorker({
      onUpdate: (registration) => {
        console.log('Service worker updated. New content will be available after refresh.');
      },
      onSuccess: (registration) => {
        console.log('Service worker registered successfully.');
      },
      onOffline: () => {
        console.log('App is working offline.');
      },
      onOnline: () => {
        console.log('App is back online.');
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
        <AccessibilityChecker />
        <ProgressiveEnhancementDemo />
      </Router>
    </QueryClientProvider>
  );
}

export default App;