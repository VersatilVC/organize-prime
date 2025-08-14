import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Enhanced error handling with proper logging
const handleGlobalError = (error: Error, context: string) => {
  console.error(`[${context}] Application Error:`, error);
  
  // Safely handle DOM manipulation
  const rootElement = document.getElementById('root');
  if (rootElement) {
    try {
      // Clear any existing content safely
      rootElement.innerHTML = '';
      
      // Create error display
      rootElement.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; font-family: system-ui;">
          <div style="text-align: center; max-width: 500px; padding: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h2 style="color: #1f2937; margin-bottom: 1rem;">Application Error</h2>
            <p style="color: #6b7280; margin-bottom: 2rem;">The application failed to load. This might be due to a network issue or server problem.</p>
            <button onclick="window.location.reload()" style="
              background: #3b82f6; 
              color: white; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 0.5rem; 
              cursor: pointer;
              font-size: 1rem;
              transition: background 0.2s;
            " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
              Refresh Page
            </button>
            <div style="margin-top: 1rem; font-size: 0.875rem; color: #9ca3af;">
              Error: ${error.message}
            </div>
          </div>
        </div>
      `;
    } catch (domError) {
      console.error('Failed to update DOM:', domError);
      // Fallback to alert if DOM manipulation fails
      alert(`Application Error: ${error.message}\n\nPlease refresh the page.`);
    }
  }
};

// Wait for DOM to be ready and handle initialization
const initializeApp = async () => {
  try {
    // Ensure DOM is ready
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found - HTML structure may be corrupted');
    }

    // Verify React is properly loaded
    if (!React || typeof React.createElement !== 'function') {
      throw new Error('React is not properly loaded or hooks are not available');
    }

    // Clear any existing content safely before creating root
    try {
      rootElement.innerHTML = '';
    } catch (clearError) {
      console.warn('Could not clear root element:', clearError);
    }

    // Create root with error handling
    let root;
    try {
      root = createRoot(rootElement);
    } catch (rootError) {
      console.error('Failed to create React root:', rootError);
      throw new Error('Failed to initialize React root - this might be a browser compatibility issue');
    }

    // Add loading indicator while app initializes
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #ffffff;">
        <div style="text-align: center;">
          <div style="
            width: 40px; 
            height: 40px; 
            border: 3px solid #e5e7eb; 
            border-top: 3px solid #3b82f6; 
            border-radius: 50%; 
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          "></div>
          <div style="color: #6b7280; font-family: system-ui;">Loading OrganizePrime...</div>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    // Add a small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Clear loading and render the React app
    try {
      rootElement.innerHTML = '';
    } catch (clearError) {
      console.warn('Could not clear loading state:', clearError);
    }

    // Render the React app with error boundary
    try {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    } catch (renderError) {
      console.error('Failed to render React app:', renderError);
      throw new Error(`React rendering failed: ${renderError.message}`);
    }

    console.log('✅ OrganizePrime application initialized successfully');
    
  } catch (error) {
    handleGlobalError(error as Error, 'Initialization');
  }
};

// Enhanced global error handlers
window.addEventListener('error', (event) => {
  // Prevent the default browser error handling
  event.preventDefault();
  
  // Handle different types of errors
  let errorMessage = event.message || 'Unknown error occurred';
  if (event.error) {
    errorMessage = event.error.message || errorMessage;
  }
  
  handleGlobalError(new Error(errorMessage), 'Global Error');
});

window.addEventListener('unhandledrejection', (event) => {
  // Prevent the default unhandled rejection behavior
  event.preventDefault();
  
  let errorMessage = 'Unhandled promise rejection';
  if (event.reason) {
    if (event.reason instanceof Error) {
      errorMessage = event.reason.message;
    } else if (typeof event.reason === 'string') {
      errorMessage = event.reason;
    } else {
      errorMessage = JSON.stringify(event.reason);
    }
  }
  
  handleGlobalError(new Error(errorMessage), 'Unhandled Promise');
});

// Add DOM error handling
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - initializing app');
  initializeApp();
});

// Initialize app when DOM is ready with fallback
if (document.readyState === 'loading') {
  // DOM is still loading, wait for DOMContentLoaded
  console.log('DOM still loading, waiting for DOMContentLoaded event');
} else {
  // DOM is already ready
  console.log('DOM already ready, initializing app immediately');
  initializeApp();
}

// Additional safety net - initialize after a delay if nothing else worked
setTimeout(() => {
  const rootElement = document.getElementById('root');
  if (rootElement && (!rootElement.hasChildNodes() || rootElement.innerHTML.includes('Loading OrganizePrime'))) {
    console.log('Fallback initialization triggered');
    initializeApp();
  }
}, 2000);
