import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';

interface SafeRouterProps {
  children: React.ReactNode;
}

// A wrapper component that ensures React Router only initializes when React is fully ready
export function SafeRouter({ children }: SafeRouterProps) {
  // Defensive React availability check - check React exists first
  let reactAvailable = false;
  
  try {
    reactAvailable = !!(
      React && 
      typeof React === 'object' &&
      React.useContext && 
      React.createContext && 
      React.useState && 
      React.useEffect &&
      typeof React.useContext === 'function' &&
      typeof React.useState === 'function'
    );
  } catch (e) {
    console.error('SafeRouter: Error checking React availability:', e);
    reactAvailable = false;
  }

  if (!reactAvailable) {
    console.warn('SafeRouter: React not fully available, showing loading state');
    
    // Return a minimal loading state without using React hooks
    return React.createElement('div', {
      className: 'min-h-screen flex items-center justify-center bg-white',
      style: { 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#ffffff'
      }
    }, React.createElement('div', {
      style: {
        width: '32px',
        height: '32px',
        border: '2px solid #e5e7eb',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }
    }));
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    }>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Suspense>
  );
}