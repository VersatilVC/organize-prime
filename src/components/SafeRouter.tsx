import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';

interface SafeRouterProps {
  children: React.ReactNode;
}

// A wrapper component that ensures React Router only initializes when React is fully ready
export function SafeRouter({ children }: SafeRouterProps) {
  // More comprehensive React availability check
  const reactAvailable = React && 
    React.useContext && 
    React.createContext && 
    React.useState && 
    React.useEffect &&
    typeof React.useContext === 'function';

  if (!reactAvailable) {
    console.warn('SafeRouter: React not fully available, skipping router initialization');
    console.log('React availability check:', {
      React: !!React,
      useContext: !!React?.useContext,
      createContext: !!React?.createContext,
      useState: !!React?.useState,
      useEffect: !!React?.useEffect
    });
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