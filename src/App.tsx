import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

// Create a stable query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Stage 4: Add AuthProvider
function App() {
  const [message, setMessage] = React.useState('App + QueryClient + Router + AuthProvider Works!');
  const [stage, setStage] = React.useState(4);
  
  const nextStage = () => {
    setStage(s => s + 1);
    setMessage(`Ready for Stage ${stage + 1}: Add OrganizationProvider`);
  };
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontFamily: 'system-ui',
            backgroundColor: '#f8fafc'
          }}>
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <h1 style={{ color: '#1f2937', marginBottom: '1rem' }}>
                Stage {stage}: {message}
              </h1>
              
              <div style={{ marginBottom: '2rem' }}>
                <button 
                  onClick={() => setMessage('AuthProvider + All previous stages working!')}
                  style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '10px'
                  }}
                >
                  Test Current Stage
                </button>
                
                {stage < 6 && (
                  <button 
                    onClick={nextStage}
                    style={{
                      padding: '10px 20px',
                      fontSize: '16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Next Stage →
                  </button>
                )}
              </div>
              
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                <p>✅ React hooks working</p>
                <p>✅ QueryClient working</p>
                <p>✅ BrowserRouter working</p>
                <p>🧪 AuthProvider testing...</p>
                <p style={{ marginTop: '1rem' }}>
                  This stage tests if AuthProvider causes the context error.
                </p>
              </div>
            </div>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;