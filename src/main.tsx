import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeSecurity } from './lib/security-config'

// Initialize security configuration
try {
  initializeSecurity();
} catch (error) {
  console.error('Security initialization failed:', error);
}

// Register service worker for caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
