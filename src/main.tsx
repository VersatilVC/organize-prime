import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('🚀 MAIN.TSX: Starting application initialization - URL:', window.location.href);

// Simple, clean entry point without complex imports that could cause issues
try {
  console.log('🚀 MAIN.TSX: Creating React root');
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ MAIN.TSX: Root element not found!');
    throw new Error('Root element not found');
  }
  
  console.log('🚀 MAIN.TSX: Root element found, rendering App component');
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('✅ MAIN.TSX: React render initiated successfully');
} catch (error) {
  console.error('❌ MAIN.TSX: Fatal error during initialization:', error);
}
