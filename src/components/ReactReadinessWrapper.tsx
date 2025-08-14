import React, { useState, useEffect } from 'react';

interface ReactReadinessWrapperProps {
  children: React.ReactNode;
}

export function ReactReadinessWrapper({ children }: ReactReadinessWrapperProps) {
  const [isReactReady, setIsReactReady] = useState(false);
  const [checkAttempts, setCheckAttempts] = useState(0);
  const maxAttempts = 50; // Maximum attempts before giving up

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
        attempt: checkAttempts + 1,
        isReady,
        reactAvailable: !!React,
        hooksAvailable: !!(React && React.useState && React.useEffect),
        contextAvailable: !!(React && React.useContext && React.createContext)
      });

      if (isReady) {
        console.log('✅ React is ready, rendering application');
        setIsReactReady(true);
      } else if (checkAttempts < maxAttempts) {
        setCheckAttempts(prev => prev + 1);
        // Retry after a short delay
        setTimeout(checkReactReadiness, 50);
      } else {
        console.error('❌ React readiness check failed after maximum attempts');
        // Give up and try to render anyway
        setIsReactReady(true);
      }
    };

    checkReactReadiness();
  }, [checkAttempts]);

  if (!isReactReady) {
    // Use a simple div instead of complex styling to avoid conflicts
    return React.createElement('div', {
      style: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        fontFamily: 'system-ui'
      }
    }, React.createElement('div', {
      style: {
        textAlign: 'center'
      }
    }, [
      React.createElement('div', {
        key: 'spinner',
        style: {
          width: '32px',
          height: '32px',
          border: '3px solid #e5e7eb',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }
      }),
      React.createElement('div', {
        key: 'text',
        style: {
          color: '#6b7280'
        }
      }, `Loading React framework... (${checkAttempts}/${maxAttempts})`)
    ]));
  }

  return React.createElement(React.Fragment, null, children);
}
