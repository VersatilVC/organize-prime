
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Ensure React is fully loaded before proceeding
if (!React || typeof React !== 'object' || !React.useState) {
  throw new Error('React is not properly loaded or hooks are not available');
}

// Add CSS for spinner animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Wait for DOM to be ready
const initializeApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = createRoot(rootElement);

  // Render with error handling
  try {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to render app:', error);
    // Fallback rendering
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: white;">
        <div style="text-align: center;">
          <h2>Application Error</h2>
          <p>Failed to initialize the application. Please refresh the page.</p>
          <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.25rem; cursor: pointer;">Refresh Page</button>
        </div>
      </div>
    `;
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
