import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Absolutely minimal entry point
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found');
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}