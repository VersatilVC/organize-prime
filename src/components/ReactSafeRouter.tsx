import React from 'react';
import { BrowserRouter } from 'react-router-dom';

interface ReactSafeRouterProps {
  children: React.ReactNode;
}

// Simple router wrapper - React validation is handled in App.tsx
export function ReactSafeRouter({ children }: ReactSafeRouterProps) {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
}