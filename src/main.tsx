// Import React as the very first thing to ensure it's available globally
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Ensure React is globally available
if (typeof window !== 'undefined') {
  (window as any).React = React;
}

// Verify React is properly loaded
const verifyReact = () => {
  if (!React || !React.useState || !React.useEffect || !React.createContext) {
    throw new Error('React hooks are not available - React may not be properly loaded');
  }
  console.log('✅ React verification passed');
  return true;
};

// Clear any potential cached modules or state that might be causing issues
const clearAppCache = () => {
  try {
    // Clear problematic localStorage items
    if (typeof Storage !== 'undefined') {
      const keysToRemove = ['react-context-cache', 'app-state-cache', 'vite-cache'];
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

// Dynamic import of App to ensure React is ready
const loadApp = async () => {
  try {
    console.log('🚀 Loading App component...');
    
    // Verify React is ready
    verifyReact();
    
    // Dynamic import of App to ensure all dependencies are loaded
    const { default: App } = await import('./App');
    
    console.log('✅ App component loaded successfully');
    return App;
  } catch (error) {
    console.error('❌ Failed to load App component:', error);
    throw error;
  }
};

// Initialize app with comprehensive error handling
const initializeApp = async () => {
  try {
    console.log('🚀 Initializing OrganizePrime...');
    
    // Clear any problematic cache first
    clearAppCache();
    
    // Verify React is available
    verifyReact();
    
    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }
    
    console.log('✅ Root element found');
    
    // Load App component dynamically
    const App = await loadApp();
    
    // Create React root
    const root = createRoot(rootElement);
    console.log('✅ React root created');
    
    // Render app
    root.render(React.createElement(App));
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
          <div style="text-align: center; max-width: 600px; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h2 style="color: #1f2937; margin-bottom: 1rem;">Failed to Load OrganizePrime</h2>
            <p style="color: #6b7280; margin-bottom: 2rem;">
              The application could not start properly. This is likely due to a React initialization issue or browser cache problem.
            </p>
            <div style="margin-bottom: 2rem;">
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
            </div>
            <details style="text-align: left;">
              <summary style="cursor: pointer; color: #6b7280; margin-bottom: 1rem;">Error Details</summary>
              <pre style="font-size: 0.875rem; color: #9ca3af; white-space: pre-wrap; word-break: break-word; background: #f3f4f6; padding: 1rem; border-radius: 4px;">${error.message}\n\n${error.stack || ''}</pre>
            </details>
          </div>
        </div>
      `;
    }
  }
};

// Enhanced error handlers
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  
  if (event.error && event.error.message) {
    const message = event.error.message;
    
    // Check for React-related errors
    if (message.includes('useState') || 
        message.includes('useContext') || 
        message.includes('useEffect') ||
        message.includes('React')) {
      console.error('React Error detected:', event.error);
      
      // Show immediate feedback
      const body = document.body;
      if (body) {
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
          <div style="
            position: fixed; 
            top: 0; 
            left: 0; 
            right: 0; 
            background: #dc2626; 
            color: white; 
            padding: 1rem; 
            text-align: center; 
            z-index: 9999;
          ">
            React Error Detected - Page will reload in 3 seconds...
          </div>
        `;
        body.appendChild(errorDiv);
        
        // Force reload after a delay
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    }
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Initialize when DOM is ready with proper timing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Add a small delay to ensure all modules are loaded
    setTimeout(initializeApp, 100);
  });
} else {
  // Add a small delay to ensure React is fully available
  setTimeout(initializeApp, 100);
}