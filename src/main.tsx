import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Minimal initialization without any DOM manipulation
const initializeApp = () => {
  try {
    console.log('🚀 Initializing OrganizePrime...');
    
    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }
    
    console.log('✅ Root element found');
    
    // Create React root without touching existing DOM
    const root = createRoot(rootElement);
    console.log('✅ React root created');
    
    // Render app WITHOUT StrictMode to avoid double renders
    root.render(React.createElement(App));
    console.log('✅ App rendered successfully');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    
    // Fallback error display using document.body
    document.body.innerHTML = `
      <div style="
        display: flex; 
        align-items: center; 
        justify-content: center; 
        min-height: 100vh; 
        font-family: system-ui; 
        background: #f8fafc;
      ">
        <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
          <h2 style="color: #1f2937; margin-bottom: 1rem;">Failed to Load</h2>
          <p style="color: #6b7280; margin-bottom: 2rem;">OrganizePrime could not start. Please refresh the page.</p>
          <button onclick="window.location.reload()" style="
            background: #3b82f6; 
            color: white; 
            border: none; 
            padding: 0.75rem 1.5rem; 
            border-radius: 0.5rem; 
            cursor: pointer;
          ">Refresh</button>
          <p style="margin-top: 1rem; font-size: 0.875rem; color: #9ca3af;">Error: ${error.message}</p>
        </div>
      </div>
    `;
  }
};

// Initialize when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
