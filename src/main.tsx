import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { createAdvancedQueryClient } from '@/lib/advanced-query-client';
import { registerServiceWorker } from '@/lib/service-worker';
import App from './App.tsx';
import './index.css';

// Initialize app components registry
import '@/apps/knowledge-base';

// Register enhanced service worker
registerServiceWorker();

// Create optimized query client with advanced patterns
const queryClient = createAdvancedQueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
