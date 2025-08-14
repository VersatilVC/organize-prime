import React, { useState, useEffect } from 'react';

interface ReactReadinessWrapperProps {
  children: React.ReactNode;
}

export function ReactReadinessWrapper({ children }: ReactReadinessWrapperProps) {
  const [isReactReady, setIsReactReady] = useState(false);

  useEffect(() => {
    // Wait for React to be fully loaded
    const checkReactReadiness = () => {
      const isReady = !!(
        React && 
        typeof React === 'object' &&
        React.useState && 
        React.useEffect &&
        React.useContext &&
        React.createContext &&
        typeof React.useState === 'function' &&
        typeof React.useEffect === 'function'
      );

      console.log('React readiness check:', {
        isReady,
        reactAvailable: !!React,
        hooksAvailable: !!(React && React.useState && React.useEffect),
        contextAvailable: !!(React && React.useContext && React.createContext)
      });

      if (isReady) {
        setIsReactReady(true);
      } else {
        // Retry after a short delay
        setTimeout(checkReactReadiness, 10);
      }
    };

    checkReactReadiness();
  }, []);

  if (!isReactReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading React framework...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}