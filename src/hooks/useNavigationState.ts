import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { navigationService, NavigationRoute } from '@/lib/navigation-service';

export interface UseNavigationStateResult {
  currentPath: string;
  isRouteActive: (routePath: string) => boolean;
  getBestMatch: (routes: NavigationRoute[]) => NavigationRoute | null;
  generateBreadcrumbs: (routes: NavigationRoute[]) => Array<{ label: string; path?: string }>;
  validateRoutes: (routes: NavigationRoute[]) => { isValid: boolean; errors: string[] };
  normalizeRoute: (route: string, featureSlug?: string) => string;
}

/**
 * Centralized hook for navigation state management
 * Uses the NavigationService for consistent behavior across the app
 */
export function useNavigationState(): UseNavigationStateResult {
  const location = useLocation();
  const currentPath = location.pathname;

  return useMemo(() => ({
    currentPath,
    
    isRouteActive: (routePath: string) => {
      // For individual route checking, we need to provide context
      // This is a simplified version for basic use cases
      return currentPath === routePath || currentPath.startsWith(routePath + '/');
    },

    getBestMatch: (routes: NavigationRoute[]) => {
      return navigationService.findBestMatch(currentPath, routes);
    },

    generateBreadcrumbs: (routes: NavigationRoute[]) => {
      return navigationService.generateBreadcrumbs(currentPath, routes);
    },

    validateRoutes: (routes: NavigationRoute[]) => {
      return navigationService.validateRoutes(routes);
    },

    normalizeRoute: (route: string, featureSlug?: string) => {
      return navigationService.normalizeRoute(route, featureSlug);
    }

  }), [currentPath]);
}

/**
 * Hook specifically for route hierarchy and active state detection
 * This is used by navigation components that need full context
 */
export function useRouteHierarchy(routes: NavigationRoute[]) {
  const location = useLocation();
  const currentPath = location.pathname;

  return useMemo(() => {
    const hierarchy = navigationService.buildHierarchy(routes);
    const activeRoute = navigationService.findBestMatch(currentPath, routes);
    
    // Create active state map for efficient lookups
    const activeStates = new Map<string, boolean>();
    for (const route of routes) {
      activeStates.set(
        route.path, 
        navigationService.isRouteActive(route.path, currentPath, routes)
      );
    }

    return {
      hierarchy,
      activeRoute,
      currentPath,
      isRouteActive: (routePath: string) => activeStates.get(routePath) || false,
      breadcrumbs: navigationService.generateBreadcrumbs(currentPath, routes)
    };
  }, [routes, currentPath]);
}