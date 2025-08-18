import * as React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
// Temporarily disable React Query to isolate the issue
// import { QueryClientProvider } from '@tanstack/react-query';
// import { createOptimizedQueryClient } from '@/lib/query-client';
// import { AuthProvider } from './auth/AuthProvider'; // Temporarily disabled
import { emergencyCircuitBreaker } from './lib/emergency-circuit-breaker';
import { renderMonitor } from './lib/render-monitor';

// Create query client - disabled for isolation
// const queryClient = createOptimizedQueryClient();

// Minimal test component to check auth state
const TestAuthStatus = () => {
  const [authState, setAuthState] = React.useState('checking...');
  
  React.useEffect(() => {
    // Simple auth check without complex providers
    setAuthState('loading...');
    
    // Use a reliable timeout that won't cause loops
    const timeoutId = setTimeout(() => {
      setAuthState('minimal app loaded successfully');
    }, 1000);
    
    // Cleanup timeout on unmount
    return () => clearTimeout(timeoutId);
  }, []); // Empty dependency array prevents infinite re-runs

  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#f8fafc'
    }}>
      <h1 style={{ color: '#1f2937', marginBottom: '1rem' }}>
        🧪 OrganizePrime - Minimal Test Mode
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Auth Status: <strong>{authState}</strong>
      </p>
      <button 
        onClick={() => window.location.href = '/login'} 
        style={{
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          cursor: 'pointer'
        }}
      >
        Go to Login
      </button>
    </div>
  );
};

function MinimalApp() {
  // Track renders to detect infinite loops
  renderMonitor.track('MinimalApp');
  
  // Emergency circuit breaker
  if (!emergencyCircuitBreaker.checkRenderAllowed('MinimalApp')) {
    return null;
  }

  // REMOVED: console.log on every render - this was causing infinite console output
  // console.log('🧪 MinimalApp rendering...');

  return (
    <Router 
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <TestAuthStatus />
    </Router>
  );
}

export default MinimalApp;