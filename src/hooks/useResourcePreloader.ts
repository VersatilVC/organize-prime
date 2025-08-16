import { useEffect } from 'react';

interface PreloadResource {
  href: string;
  as: 'script' | 'style' | 'font' | 'image' | 'fetch';
  type?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
}

/**
 * Hook to preload critical resources for faster page loads
 */
export function useResourcePreloader(resources: PreloadResource[]) {
  useEffect(() => {
    const links: HTMLLinkElement[] = [];

    resources.forEach(resource => {
      // Check if resource is already preloaded
      const existing = document.querySelector(`link[href="${resource.href}"]`);
      if (existing) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      
      if (resource.type) {
        link.type = resource.type;
      }
      
      if (resource.crossOrigin) {
        link.crossOrigin = resource.crossOrigin;
      }

      document.head.appendChild(link);
      links.push(link);
    });

    // Cleanup function
    return () => {
      links.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, [resources]);
}

/**
 * Preload route-specific components
 */
export function useRoutePreloader(routePaths: string[]) {
  useEffect(() => {
    // Preload route chunks on idle
    const handleIdle = () => {
      routePaths.forEach(path => {
        // Dynamically import routes to trigger chunk loading
        switch (path) {
          case '/dashboard':
            import('@/pages/Dashboard');
            break;
          case '/users':
            import('@/pages/Users');
            break;
          case '/features/knowledge-base':
            import('@/apps/knowledge-base/KBApp');
            break;
          case '/settings':
            Promise.all([
              import('@/pages/ProfileSettings'),
              import('@/pages/CompanySettings'),
              import('@/pages/SystemSettings')
            ]);
            break;
          default:
            break;
        }
      });
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      const idleId = requestIdleCallback(handleIdle, { timeout: 2000 });
      return () => cancelIdleCallback(idleId);
    } else {
      const timeoutId = setTimeout(handleIdle, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [routePaths]);
}

/**
 * Preload critical API data
 */
export function useDataPreloader() {
  useEffect(() => {
    // Preload commonly accessed API endpoints
    const preloadEndpoints = [
      '/auth/session',
      '/organization/features',
      '/user/profile'
    ];

    const controller = new AbortController();

    preloadEndpoints.forEach(endpoint => {
      fetch(endpoint, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'max-age=300' // 5 minutes
        }
      }).catch(() => {
        // Silently fail - this is just preloading
      });
    });

    return () => controller.abort();
  }, []);
}