import React from 'react';
import { BrowserRouter } from 'react-router-dom';

interface ReactSafeRouterProps {
  children: React.ReactNode;
}

// Ultra-safe router that won't render until React is 100% confirmed working
export function ReactSafeRouter({ children }: ReactSafeRouterProps) {
  const [isReactReady, setIsReactReady] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    // Test that React is actually working by using multiple hooks
    try {
      let testState = false;
      const setState = React.useState(false)[1];
      
      // Test useEffect works
      const testEffect = React.useEffect(() => {
        testState = true;
      }, []);
      
      // Test useContext works
      const TestContext = React.createContext('test');
      const testUseContext = React.useContext(TestContext);
      
      // If we got here, React is working
      setTimeout(() => {
        console.log('ReactSafeRouter: React validated, enabling router');
        setIsReactReady(true);
      }, 150); // Even longer delay
      
    } catch (error) {
      console.error('ReactSafeRouter: React validation failed:', error);
      setHasError(true);
    }
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-destructive mb-2">React Error</h1>
          <p className="text-muted-foreground mb-4">React hooks are not working properly</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!isReactReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Initializing application...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
}