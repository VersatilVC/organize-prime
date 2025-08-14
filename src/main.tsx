import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Ensure React is globally available to prevent null reference errors
console.log('main.tsx: React available:', !!React);
console.log('main.tsx: StrictMode available:', !!StrictMode);

// Absolutely minimal entry point with error handling
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found');
} else {
  try {
    const root = createRoot(rootElement);
    console.log('main.tsx: createRoot successful, rendering App');
    
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    
    console.log('main.tsx: App rendered successfully');
  } catch (error) {
    console.error('main.tsx: Error during render:', error);
    // Fallback render without StrictMode
    try {
      const root = createRoot(rootElement);
      root.render(<App />);
      console.log('main.tsx: Fallback render successful');
    } catch (fallbackError) {
      console.error('main.tsx: Fallback render failed:', fallbackError);
      rootElement.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Application Error</h1><p>Failed to load the application. Please refresh the page.</p></div>';
    }
  }
}