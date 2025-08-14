// Critical path loader for immediate performance gains
export function initializeCriticalOptimizations() {
  // Preload critical components during browser idle time
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      // Preload dashboard components
      import('@/pages/SimpleDashboard').catch(() => {});
      import('@/components/ui/card').catch(() => {});
      import('@/components/ui/skeleton').catch(() => {});
    }, { timeout: 2000 });
  }
  
  // Register optimized service worker
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw-optimized.js')
        .then(registration => console.log('SW registered'))
        .catch(error => console.log('SW registration failed'));
    });
  }
}