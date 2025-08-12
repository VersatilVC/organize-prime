import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './lib/code-splitting'
import { initializeSecurity } from './lib/security-config'

// Initialize app components registry
import '@/apps/knowledge-base';

// Initialize security configuration
try {
  initializeSecurity();
} catch (error) {
  console.error('Security initialization failed:', error);
}

// Silence verbose logs in production (keep warnings and errors)
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
}

// Register service worker for caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.debug('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.debug('SW registration failed: ', registrationError);
      });
  });
}

// Global recovery for dynamic import/chunk load errors
window.addEventListener('unhandledrejection', (event) => {
  const reason: any = (event as any).reason;
  const msg = String(reason?.message || reason || '');
  if (/Loading chunk|ChunkLoadError|dynamic import/i.test(msg)) {
    console.warn('Chunk load error detected. Reloading to recover...');
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
