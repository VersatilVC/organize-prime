
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

interface ReactSafeRouterProps {
  children: React.ReactNode;
}

// Router wrapper that ensures context is properly established
export function ReactSafeRouter({ children }: ReactSafeRouterProps) {
  const [routerReady, setRouterReady] = React.useState(false);

  React.useEffect(() => {
    // Small delay to ensure BrowserRouter context is established
    const timer = setTimeout(() => {
      setRouterReady(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <BrowserRouter>
      {routerReady ? children : (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading application...</p>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}
