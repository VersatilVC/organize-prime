// Critical path optimization for initial page load
import { prefetchByPath } from '@/lib/route-prefetch';
import { prefetchQueriesByPath } from '@/lib/query-prefetch';
import { QueryClient } from '@tanstack/react-query';

// Preload critical resources based on route
export function preloadCriticalResources(path: string) {
  // Add critical CSS font preloading
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.crossOrigin = 'anonymous';
  link.href = '/fonts/inter-var.woff2'; // If you have custom fonts
  document.head.appendChild(link);
}

// Enhanced prefetch on user intent
export function enhancedPrefetchOnIntent(queryClient: QueryClient) {
  let prefetchTimeout: NodeJS.Timeout;
  
  const handleMouseEnter = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a[href]') as HTMLAnchorElement;
    
    if (link && link.href) {
      const url = new URL(link.href);
      const path = url.pathname;
      
      // Debounce prefetching to avoid excessive calls
      clearTimeout(prefetchTimeout);
      prefetchTimeout = setTimeout(() => {
        prefetchByPath(path);
        prefetchQueriesByPath(path, queryClient);
      }, 50);
    }
  };
  
  const handleFocus = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      const link = target as HTMLAnchorElement;
      if (link.href) {
        const url = new URL(link.href);
        prefetchByPath(url.pathname);
        prefetchQueriesByPath(url.pathname, queryClient);
      }
    }
  };
  
  // Add listeners with passive flag for better performance
  document.addEventListener('mouseover', handleMouseEnter, { passive: true });
  document.addEventListener('focusin', handleFocus, { passive: true });
  
  return () => {
    document.removeEventListener('mouseover', handleMouseEnter);
    document.removeEventListener('focusin', handleFocus);
    clearTimeout(prefetchTimeout);
  };
}

// Intelligent resource loading based on network conditions
export function adaptiveResourceLoading() {
  const connection = (navigator as any).connection;
  
  if (!connection) return { shouldPreload: true, maxConcurrent: 4 };
  
  const effectiveType = connection.effectiveType;
  const downlink = connection.downlink;
  
  // Adapt loading strategy based on network speed
  if (effectiveType === 'slow-2g' || downlink < 0.5) {
    return { shouldPreload: false, maxConcurrent: 1 };
  } else if (effectiveType === '2g' || downlink < 1.5) {
    return { shouldPreload: false, maxConcurrent: 2 };
  } else if (effectiveType === '3g' || downlink < 10) {
    return { shouldPreload: true, maxConcurrent: 3 };
  } else {
    return { shouldPreload: true, maxConcurrent: 6 };
  }
}