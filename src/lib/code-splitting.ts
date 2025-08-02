import { useState, useEffect } from 'react';

// Bundle analyzer for development
export function useBundleAnalyzer() {
  const [bundleInfo, setBundleInfo] = useState<{
    loadedChunks: string[];
    totalSize: number;
    loadTime: number;
  }>({
    loadedChunks: [],
    totalSize: 0,
    loadTime: 0,
  });

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const chunks = entries
          .filter(entry => entry.name.includes('chunk'))
          .map(entry => entry.name);
        
        setBundleInfo(prev => ({
          ...prev,
          loadedChunks: [...new Set([...prev.loadedChunks, ...chunks])],
          loadTime: performance.now(),
        }));
      });

      observer.observe({ entryTypes: ['resource'] });

      return () => observer.disconnect();
    }
  }, []);

  return bundleInfo;
}

// Performance metrics for code splitting
export function useLoadPerformance() {
  const [metrics, setMetrics] = useState<{
    initialLoad: number;
    routeChanges: number;
    averageRouteLoadTime: number;
    cacheHitRate: number;
  }>({
    initialLoad: 0,
    routeChanges: 0,
    averageRouteLoadTime: 0,
    cacheHitRate: 0,
  });

  useEffect(() => {
    const startTime = performance.now();
    
    // Measure initial load
    window.addEventListener('load', () => {
      setMetrics(prev => ({
        ...prev,
        initialLoad: performance.now() - startTime,
      }));
    });

    // Track route changes
    let routeChangeStart = 0;
    const routeLoadTimes: number[] = [];

    const trackRouteChange = () => {
      if (routeChangeStart > 0) {
        const loadTime = performance.now() - routeChangeStart;
        routeLoadTimes.push(loadTime);
        
        setMetrics(prev => ({
          ...prev,
          routeChanges: prev.routeChanges + 1,
          averageRouteLoadTime: routeLoadTimes.reduce((a, b) => a + b, 0) / routeLoadTimes.length,
        }));
      }
      routeChangeStart = performance.now();
    };

    // Listen for route changes (simplified)
    window.addEventListener('popstate', trackRouteChange);

    return () => {
      window.removeEventListener('load', () => {});
      window.removeEventListener('popstate', trackRouteChange);
    };
  }, []);

  return metrics;
}

// Preload strategies
export class PreloadManager {
  private static preloadedRoutes = new Set<string>();
  private static preloadedComponents = new Set<string>();

  static preloadRoute(routePath: string, importFn: () => Promise<any>) {
    if (this.preloadedRoutes.has(routePath)) {
      return Promise.resolve();
    }

    this.preloadedRoutes.add(routePath);
    
    return importFn().catch((error) => {
      console.warn(`Failed to preload route ${routePath}:`, error);
      this.preloadedRoutes.delete(routePath);
    });
  }

  static preloadComponent(componentName: string, importFn: () => Promise<any>) {
    if (this.preloadedComponents.has(componentName)) {
      return Promise.resolve();
    }

    this.preloadedComponents.add(componentName);
    
    return importFn().catch((error) => {
      console.warn(`Failed to preload component ${componentName}:`, error);
      this.preloadedComponents.delete(componentName);
    });
  }

  static preloadCriticalRoutes() {
    // Preload most commonly accessed routes
    this.preloadRoute('/dashboard', () => import('../pages/Dashboard'));
    this.preloadRoute('/users', () => import('../pages/Users'));
    this.preloadRoute('/feedback', () => import('../pages/Feedback'));
  }

  static preloadOnUserIntent() {
    // Preload on user interaction hints
    document.addEventListener('mouseover', (e) => {
      const link = (e.target as Element)?.closest('a[href]') as HTMLAnchorElement;
      if (link) {
        const href = link.getAttribute('href');
        if (href?.startsWith('/')) {
          this.preloadForPath(href);
        }
      }
    });

    document.addEventListener('touchstart', (e) => {
      const link = (e.target as Element)?.closest('a[href]') as HTMLAnchorElement;
      if (link) {
        const href = link.getAttribute('href');
        if (href?.startsWith('/')) {
          this.preloadForPath(href);
        }
      }
    });
  }

  private static preloadForPath(path: string) {
    const routeMap: Record<string, () => Promise<any>> = {
      '/dashboard': () => import('../pages/Dashboard'),
      '/users': () => import('../pages/Users'),
      '/organizations': () => import('../pages/Organizations'),
      '/feedback': () => import('../pages/Feedback'),
      '/settings/profile': () => import('../pages/ProfileSettings'),
      '/settings/company': () => import('../pages/CompanySettings'),
      '/settings/system': () => import('../pages/SystemSettings'),
      '/billing': () => import('../pages/Billing'),
      '/marketplace': () => import('../pages/Marketplace'),
    };

    const importFn = routeMap[path];
    if (importFn) {
      this.preloadRoute(path, importFn);
    }
  }

  static clearCache() {
    this.preloadedRoutes.clear();
    this.preloadedComponents.clear();
  }
}

// Initialize preload manager
if (typeof window !== 'undefined') {
  // Preload critical routes after initial load
  window.addEventListener('load', () => {
    setTimeout(() => {
      PreloadManager.preloadCriticalRoutes();
      PreloadManager.preloadOnUserIntent();
    }, 1000); // Wait 1 second after load
  });
}