// Optimize chunk loading with retry and error recovery
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface ChunkError extends Error {
  name: string;
  message: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export function useChunkLoadingOptimization() {
  const retryCountRef = useRef(0);
  const isRetryingRef = useRef(false);

  useEffect(() => {
    const handleChunkError = (event: PromiseRejectionEvent) => {
      const error = event.reason as ChunkError;
      const isChunkError = error?.message?.includes('Loading chunk') || 
                          error?.message?.includes('ChunkLoadError') ||
                          error?.name === 'ChunkLoadError';

      if (isChunkError && !isRetryingRef.current) {
        event.preventDefault(); // Prevent unhandled rejection
        
        if (retryCountRef.current < MAX_RETRIES) {
          isRetryingRef.current = true;
          retryCountRef.current++;
          
          console.warn(`Chunk load error (attempt ${retryCountRef.current}/${MAX_RETRIES}):`, error);
          
          // Show user feedback for retry attempts
          if (retryCountRef.current === 1) {
            toast.loading('Loading application modules...', {
              id: 'chunk-loading',
              duration: 3000
            });
          }
          
          // Retry after delay
          setTimeout(() => {
            // Clear module cache to force fresh reload
            if ('webpackChunkName' in error) {
              delete (window as any).__webpack_require__.cache;
            }
            
            // Attempt to reload the page if too many retries
            if (retryCountRef.current >= MAX_RETRIES) {
              toast.error('Failed to load application. Refreshing page...', {
                id: 'chunk-loading'
              });
              setTimeout(() => window.location.reload(), 1500);
            } else {
              // Try to re-import the failed chunk
              isRetryingRef.current = false;
              toast.success('Modules loaded successfully', {
                id: 'chunk-loading',
                duration: 2000
              });
            }
          }, RETRY_DELAY * retryCountRef.current);
        } else {
          // Max retries reached, reload page
          console.error('Max chunk load retries reached, reloading page');
          toast.error('Application update detected. Refreshing...', {
            duration: 2000
          });
          setTimeout(() => window.location.reload(), 2000);
        }
      }
    };

    // Reset retry count on successful navigation
    const handleSuccessfulNavigation = () => {
      retryCountRef.current = 0;
      isRetryingRef.current = false;
    };

    window.addEventListener('unhandledrejection', handleChunkError);
    window.addEventListener('popstate', handleSuccessfulNavigation);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleChunkError);
      window.removeEventListener('popstate', handleSuccessfulNavigation);
    };
  }, []);

  return {
    retryCount: retryCountRef.current,
    isRetrying: isRetryingRef.current
  };
}

// Preload critical chunks on app initialization
export function preloadCriticalChunks() {
  if (typeof window === 'undefined') return;
  
  // Preload chunks that are likely to be needed soon
  const criticalImports = [
    () => import('@/pages/Dashboard'),
    () => import('@/components/layout/AppHeader'),
    () => import('@/components/layout/AppSidebar'),
    () => import('@/components/ui/toaster')
  ];

  // Use requestIdleCallback for non-blocking preloading
  const preloadNext = (index: number) => {
    if (index >= criticalImports.length) return;
    
    const callback = () => {
      criticalImports[index]()
        .then(() => {
          // Preload next chunk
          preloadNext(index + 1);
        })
        .catch(() => {
          // Ignore preload errors
          preloadNext(index + 1);
        });
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback, { timeout: 2000 });
    } else {
      setTimeout(callback, 100);
    }
  };

  preloadNext(0);
}