import React, { useState, useEffect } from 'react';

interface ReactStabilityCheckerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
}

export const ReactStabilityChecker: React.FC<ReactStabilityCheckerProps> = ({ 
  children, 
  fallback,
  delay = 100 
}) => {
  const [isReactStable, setIsReactStable] = useState(false);

  useEffect(() => {
    const checkReactStability = () => {
      // Comprehensive React stability check
      const isStable = !!(
        React &&
        typeof React === 'object' &&
        React.useState &&
        React.useEffect &&
        React.useContext &&
        typeof React.useState === 'function' &&
        typeof React.useEffect === 'function' &&
        typeof React.useContext === 'function'
      );

      console.log('React stability check:', isStable);
      
      if (isStable) {
        setIsReactStable(true);
      } else {
        // Retry after a short delay
        setTimeout(checkReactStability, delay);
      }
    };

    // Initial check with small delay to allow module loading
    const timer = setTimeout(checkReactStability, delay);
    
    return () => clearTimeout(timer);
  }, [delay]);

  if (!isReactStable) {
    return (
      <>
        {fallback || (
          <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'white',
            zIndex: 9999
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '24px', 
                height: '24px', 
                border: '2px solid #f3f3f3',
                borderTop: '2px solid #3498db',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }} />
              <p>Initializing...</p>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
};