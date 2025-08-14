import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthProvider';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { Routes, Route } from 'react-router-dom';
import { AuthGuard, GuestGuard } from '@/components/auth/AuthGuard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

// Import components directly
import Index from '@/pages/Index';
import { AuthPage } from '@/auth/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import Users from '@/pages/Users';
import Organizations from '@/pages/Organizations';
import ProfileSettings from '@/pages/ProfileSettings';
import CompanySettings from '@/pages/CompanySettings';
import SystemSettings from '@/pages/SystemSettings';
import Feedback from '@/pages/Feedback';
import NotFound from '@/pages/NotFound';

// Create a stable query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Simple loading component
const AppLoading = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    fontFamily: 'system-ui'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid #e5e7eb',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 1rem'
      }}></div>
      <div style={{ color: '#6b7280' }}>Loading OrganizePrime...</div>
    </div>
  </div>
);

// Simple error component
const AppError = ({ error }: { error: Error }) => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    fontFamily: 'system-ui',
    padding: '2rem'
  }}>
    <div style={{ textAlign: 'center', maxWidth: '500px' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
      <h2 style={{ color: '#1f2937', marginBottom: '1rem' }}>Application Error</h2>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Something went wrong with the application. Please refresh the page.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        Refresh Page
      </button>
      <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#9ca3af' }}>
        Error: {error.message}
      </p>
    </div>
  </div>
);

// Error boundary class component
class ReactErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return <AppError error={this.state.error} />;
    }

    return this.props.children;
  }
}

// App routes component without extra BrowserRouter
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      
      <Route 
        path="/auth" 
        element={
          <GuestGuard>
            <AuthPage />
          </GuestGuard>
        } 
      />

      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        } 
      />

      <Route 
        path="/users" 
        element={
          <AuthGuard>
            <Users />
          </AuthGuard>
        } 
      />

      <Route 
        path="/organizations" 
        element={
          <AuthGuard>
            <Organizations />
          </AuthGuard>
        } 
      />

      <Route 
        path="/profile-settings" 
        element={
          <AuthGuard>
            <ProfileSettings />
          </AuthGuard>
        } 
      />

      <Route 
        path="/company-settings" 
        element={
          <AuthGuard>
            <CompanySettings />
          </AuthGuard>
        } 
      />

      <Route 
        path="/system-settings" 
        element={
          <AuthGuard>
            <SystemSettings />
          </AuthGuard>
        } 
      />

      <Route 
        path="/feedback" 
        element={
          <AuthGuard>
            <Feedback />
          </AuthGuard>
        } 
      />

      {/* Catch all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Main App component with fixed provider hierarchy
function App() {
  console.log('App component rendering');
  
  try {
    return (
      <ReactErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <React.Suspense fallback={<AppLoading />}>
              <AuthProvider>
                <OrganizationProvider>
                  <ErrorBoundary>
                    <AppRoutes />
                    <Toaster />
                  </ErrorBoundary>
                </OrganizationProvider>
              </AuthProvider>
            </React.Suspense>
          </BrowserRouter>
        </QueryClientProvider>
      </ReactErrorBoundary>
    );
  } catch (error) {
    console.error('Error in App component:', error);
    return <AppError error={error as Error} />;
  }
}

export default App;