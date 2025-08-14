import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Enhanced error handling with proper logging
const handleGlobalError = (error: Error, context: string) => {
  console.error(`[${context}] Application Error:`, error);
  
  // Create error display
  const rootElement = document.getElementById('root');
  if (rootElement) {
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

    // Create root and render app
    const root = createRoot(rootElement);
    
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

    // Render the React app
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    console.log('✅ OrganizePrime application initialized successfully');
    
  } catch (error) {
    handleGlobalError(error as Error, 'Initialization');
  }
};

// Set up global error handlers
window.addEventListener('error', (event) => {
  handleGlobalError(new Error(event.message), 'Global Error');
});

window.addEventListener('unhandledrejection', (event) => {
  handleGlobalError(new Error(event.reason), 'Unhandled Promise');
});

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
