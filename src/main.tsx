import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Simple error fallback without DOM manipulation
const showErrorFallback = (error: Error) => {
  console.error('Application failed to load:', error);
  
  // Use document.write as last resort to avoid DOM conflicts
  const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>OrganizePrime - Error</title>
      <style>
        body { 
          font-family: system-ui; 
          margin: 0; 
          padding: 20px; 
          background: #f8fafc; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          min-height: 100vh; 
        }
        .error-container { 
          text-align: center; 
          background: white; 
          padding: 2rem; 
          border-radius: 8px; 
          box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
          max-width: 500px;
        }
        .error-icon { font-size: 3rem; margin-bottom: 1rem; }
        .error-title { color: #1f2937; margin-bottom: 1rem; }
        .error-message { color: #6b7280; margin-bottom: 2rem; }
        .error-button { 
          background: #3b82f6; 
          color: white; 
          border: none; 
          padding: 0.75rem 1.5rem; 
          border-radius: 0.5rem; 
          cursor: pointer; 
          font-size: 1rem;
        }
        .error-button:hover { background: #2563eb; }
      </style>
    </head>
    <body>
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h2 class="error-title">Application Error</h2>
        <p class="error-message">OrganizePrime failed to load properly. Please refresh the page to try again.</p>
        <button class="error-button" onclick="window.location.reload()">Refresh Page</button>
        <p style="margin-top: 1rem; font-size: 0.875rem; color: #9ca3af;">Error: ${error.message}</p>
      </div>
    </body>
    </html>
  `;
  
  // Replace entire document to avoid DOM conflicts
  document.open();
  document.write(errorHtml);
  document.close();
};

// Main initialization function with minimal DOM manipulation
const initializeApp = () => {
  try {
    console.log('🚀 Starting OrganizePrime initialization...');
    
    // Basic environment checks
    if (typeof React !== 'object' || !React.createElement) {
      throw new Error('React is not available');
    }
    
    if (typeof createRoot !== 'function') {
      throw new Error('React 18 createRoot is not available');
    }
    
    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found in DOM');
    }
    
    console.log('✅ Environment checks passed');
    
    // Create React root WITHOUT clearing existing content
    // This avoids the removeChild error
    let root;
    try {
      root = createRoot(rootElement);
      console.log('✅ React root created successfully');
    } catch (rootError) {
      console.error('Failed to create React root:', rootError);
      throw new Error(`React root creation failed: ${rootError.message}`);
    }
    
    // Render the app
    try {
      console.log('🎨 Rendering React application...');
      
      root.render(
        React.createElement(React.StrictMode, null,
          React.createElement(App)
        )
      );
      
      console.log('✅ OrganizePrime loaded successfully!');
      
    } catch (renderError) {
      console.error('React render failed:', renderError);
      throw new Error(`React rendering failed: ${renderError.message}`);
    }
    
  } catch (error) {
    console.error('Initialization failed:', error);
    showErrorFallback(error as Error);
  }
};

// Minimal global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error || event.message);
  // Don't prevent default to maintain browser behavior
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Don't prevent default to maintain browser behavior
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM is already ready, initialize immediately
  initializeApp();
}
