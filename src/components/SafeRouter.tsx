import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';

interface SafeRouterProps {
  children: React.ReactNode;
}

// A wrapper component that ensures React Router only initializes when React is fully ready
export function SafeRouter({ children }: SafeRouterProps) {
  // Double-check React availability before rendering Router
  if (!React || !React.useContext || !React.createContext) {
    console.warn('SafeRouter: React not fully available, skipping router initialization');
    return null;
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