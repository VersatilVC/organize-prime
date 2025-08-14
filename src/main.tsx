import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Ensure React is fully loaded before proceeding
if (!React || typeof React !== 'object') {
  throw new Error('React is not properly loaded');
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

// Simple, direct initialization with React availability check
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);

// Render with error handling
try {
  root.render(<App />);
} catch (error) {
  console.error('Failed to render app:', error);
  // Fallback rendering without React features
  rootElement.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: white;">
      <div style="text-align: center;">
        <h2>Loading...</h2>
        <p>Initializing application...</p>
      </div>
    </div>
  `;
}