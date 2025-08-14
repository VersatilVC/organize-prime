import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clear any potential cached modules or state that might be causing issues
const clearAppCache = () => {
  try {
    // Clear localStorage items that might be causing issues
    if (typeof Storage !== 'undefined') {
      // Only remove items that might interfere with React context
      const keysToRemove = ['react-context-cache', 'app-state-cache'];
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('Could not remove localStorage key:', key);
        }
      });
    }
    
    // Force reload service worker cache if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.update();
        });
      });
    }
  } catch (error) {
    console.warn('Error clearing cache:', error);
  }
};

// Initialize app with proper error handling
const initializeApp = () => {
  try {
    console.log('🚀 Initializing OrganizePrime...');
    
    // Clear any problematic cache first
    clearAppCache();
    
    // Verify React is available
    if (!React || !React.createElement) {
      throw new Error('React is not properly loaded');
    }
    
    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }
    
    console.log('✅ Root element found');
    
    // Create React root
    const root = createRoot(rootElement);
    console.log('✅ React root created');
    
    // Render app - using JSX instead of createElement to avoid issues
    root.render(<App />);
    console.log('✅ App rendered successfully');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    
    // Fallback error display
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="
          display: flex; 
          align-items: center; 
          justify-content: center; 
          min-height: 100vh; 
          font-family: system-ui; 
          background: #f8fafc;
          padding: 2rem;
        ">
          <div style="text-align: center; max-width: 500px; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h2 style="color: #1f2937; margin-bottom: 1rem;">Failed to Load OrganizePrime</h2>
            <p style="color: #6b7280; margin-bottom: 2rem;">
              The application could not start properly. This might be due to a browser cache issue.
            </p>
            <button onclick="window.location.reload(true)" style="
              background: #3b82f6; 
              color: white; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 0.5rem; 
              cursor: pointer;
              font-size: 1rem;
              margin-right: 1rem;
            ">Hard Refresh</button>
            <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload();" style="
              background: #6b7280; 
              color: white; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 0.5rem; 
              cursor: pointer;
              font-size: 1rem;
            ">Clear Cache & Reload</button>
            <details style="margin-top: 2rem; text-align: left;">
              <summary style="cursor: pointer; color: #6b7280;">Error Details</summary>
              <pre style="margin-top: 1rem; font-size: 0.875rem; color: #9ca3af; white-space: pre-wrap; word-break: break-word;">${error.message}\n\n${error.stack || ''}</pre>
            </details>
          </div>
        </div>
      `;
    }
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // Use setTimeout to ensure React has fully loaded
  setTimeout(initializeApp, 0);
}

// Add global error handler for unhandled React errors
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && event.error.message.includes('useContext')) {
    console.error('React Context Error detected:', event.error);
    // Force reload to clear any React state issues
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
