/**
 * Centralized Navigation Service
 * Handles route normalization, hierarchy, and active state detection
 */

export interface NavigationRoute {
  path: string;
  component: string;
  title: string;
  permissions: string[];
  icon?: string;
  isDefault?: boolean;
  menuOrder: number;
  featureSlug?: string;
  parentPath?: string;
}

export interface NavigationHierarchy {
  route: NavigationRoute;
  children: NavigationHierarchy[];
  level: number;
}

export class NavigationService {
  private static instance: NavigationService;

  static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService();
    }
    return NavigationService.instance;
  }

  /**
   * Normalize route to standard format: /features/{feature-slug}/{page-slug}
   */
  normalizeRoute(route: string, featureSlug?: string): string {
    // Normalize input
    const raw = (route || '').trim();

    // Strip query/hash and normalize slashes
    let path = raw.split('#')[0].split('?')[0]
      .replace(/\\+/g, '/')
      .replace(/\/{2,}/g, '/');

    // Remove leading slash for processing
    if (path.startsWith('/')) path = path.slice(1);

    // If already a feature path, keep tail and optionally override slug
    const featureMatch = path.match(/^features\/([^/]+)\/?(.*)$/);
    if (featureMatch) {
      const existingSlug = featureMatch[1];
      const rest = featureMatch[2] || '';
      const finalSlug = featureSlug || existingSlug;
      const tail = rest.replace(/^\/+|\/+$/g, '');
      return `/features/${finalSlug}${tail ? '/' + tail : ''}`;
    }

    // Strip apps/<id>/ prefix if present
    const appsMatch = path.match(/^apps\/[^/]+\/?(.*)$/);
    if (appsMatch) {
      path = appsMatch[1] || '';
    }

    // If path begins with the feature slug, remove the duplicate prefix
    if (featureSlug) {
      const segs = path.split('/').filter(Boolean);
      if (segs[0] === featureSlug) {
        segs.shift();
        path = segs.join('/');
      }
    }

    // Trim any extra slashes
    path = path.replace(/^\/+|\/+$/g, '');

    if (featureSlug) {
      return `/features/${featureSlug}${path ? '/' + path : ''}`;
    }

    // Fallback: ensure leading slash
    return `/${path}`;
  }

  /**
   * Extract feature slug from a route
   */
  extractFeatureSlug(route: string): string | null {
    const match = route.match(/^\/features\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract page slug from a route
   */
  extractPageSlug(route: string): string | null {
    const match = route.match(/^\/features\/[^\/]+\/(.+)$/);
    return match ? match[1] : null;
  }

  /**
   * Build route hierarchy from flat routes array
   */
  buildHierarchy(routes: NavigationRoute[]): NavigationHierarchy[] {
    const routeMap = new Map<string, NavigationHierarchy>();
    const rootRoutes: NavigationHierarchy[] = [];

    // Sort routes by specificity (fewer path segments first)
    const sortedRoutes = [...routes].sort((a, b) => {
      const aSegments = a.path.split('/').length;
      const bSegments = b.path.split('/').length;
      return aSegments - bSegments;
    });

    for (const route of sortedRoutes) {
      const hierarchy: NavigationHierarchy = {
        route,
        children: [],
        level: route.path.split('/').length - 1
      };

      routeMap.set(route.path, hierarchy);

      // Find parent route
      const parentPath = this.findParentPath(route.path, Array.from(routeMap.keys()));
      if (parentPath && routeMap.has(parentPath)) {
        routeMap.get(parentPath)!.children.push(hierarchy);
      } else {
        rootRoutes.push(hierarchy);
      }
    }

    return rootRoutes;
  }

  /**
   * Find the most specific parent path for a given route
   */
  private findParentPath(routePath: string, availablePaths: string[]): string | null {
    const segments = routePath.split('/').filter(s => s);
    
    // Try to find parent by removing the last segment
    for (let i = segments.length - 1; i > 0; i--) {
      const potentialParent = '/' + segments.slice(0, i).join('/');
      if (availablePaths.includes(potentialParent)) {
        return potentialParent;
      }
    }

    return null;
  }

  /**
   * Determine if a route is active based on current pathname
   * Uses hierarchical matching: most specific match wins
   */
  isRouteActive(routePath: string, currentPath: string, allRoutes: NavigationRoute[]): boolean {
    // Exact match has highest priority
    if (routePath === currentPath) {
      return true;
    }

    // Build hierarchy to determine specificity
    const hierarchy = this.buildHierarchy(allRoutes);
    const currentRouteSpecificity = this.getRouteSpecificity(routePath, currentPath);
    
    // Check if any more specific route matches
    const moreSpecificRoutes = allRoutes.filter(route => 
      route.path !== routePath && 
      this.getRouteSpecificity(route.path, currentPath) > currentRouteSpecificity &&
      this.isPathMatch(route.path, currentPath)
    );

    // If there's a more specific match, this route is not active
    if (moreSpecificRoutes.length > 0) {
      return false;
    }

    // Check if this route is a valid parent of the current path
    return this.isPathMatch(routePath, currentPath);
  }

  /**
   * Check if a route path matches the current path
   */
  private isPathMatch(routePath: string, currentPath: string): boolean {
    // Exact match
    if (routePath === currentPath) {
      return true;
    }

    // Parent-child relationship
    if (currentPath.startsWith(routePath + '/')) {
      return true;
    }

    return false;
  }

  /**
   * Get route specificity score (higher = more specific)
   */
  private getRouteSpecificity(routePath: string, currentPath: string): number {
    if (routePath === currentPath) {
      return 1000; // Exact match has highest score
    }

    if (currentPath.startsWith(routePath + '/')) {
      // Score based on how many segments match
      const routeSegments = routePath.split('/').filter(s => s);
      const currentSegments = currentPath.split('/').filter(s => s);
      return routeSegments.length * 10;
    }

    return 0;
  }

  /**
   * Find the best matching route for a given path
   */
  findBestMatch(targetPath: string, routes: NavigationRoute[]): NavigationRoute | null {
    let bestMatch: NavigationRoute | null = null;
    let bestScore = 0;

    for (const route of routes) {
      const score = this.getRouteSpecificity(route.path, targetPath);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = route;
      }
    }

    return bestMatch;
  }

  /**
   * Validate route consistency and detect conflicts
   */
  validateRoutes(routes: NavigationRoute[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const pathMap = new Map<string, NavigationRoute>();

    for (const route of routes) {
      // Check for duplicate paths
      if (pathMap.has(route.path)) {
        errors.push(`Duplicate route path: ${route.path}`);
      }
      pathMap.set(route.path, route);

      // Validate route format
      if (!route.path.startsWith('/')) {
        errors.push(`Route path must start with '/': ${route.path}`);
      }

      // Validate feature routes follow standard format
      if (route.featureSlug && !route.path.startsWith(`/features/${route.featureSlug}/`)) {
        errors.push(`Feature route must follow format /features/{slug}/...: ${route.path}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate breadcrumbs for a given path
   */
  generateBreadcrumbs(currentPath: string, routes: NavigationRoute[]): Array<{ label: string; path?: string }> {
    const breadcrumbs: Array<{ label: string; path?: string }> = [];
    const hierarchy = this.buildHierarchy(routes);
    
    // Find the route that matches the current path
    const currentRoute = this.findBestMatch(currentPath, routes);
    if (!currentRoute) {
      return breadcrumbs;
    }

    // Build breadcrumb chain by walking up the hierarchy
    this.buildBreadcrumbChain(currentRoute, hierarchy, breadcrumbs);
    
    return breadcrumbs.reverse();
  }

  private buildBreadcrumbChain(
    targetRoute: NavigationRoute, 
    hierarchy: NavigationHierarchy[], 
    breadcrumbs: Array<{ label: string; path?: string }>
  ): boolean {
    for (const node of hierarchy) {
      if (node.route.path === targetRoute.path) {
        breadcrumbs.push({ label: node.route.title, path: node.route.path });
        return true;
      }

      if (this.buildBreadcrumbChain(targetRoute, node.children, breadcrumbs)) {
        breadcrumbs.push({ label: node.route.title, path: node.route.path });
        return true;
      }
    }

    return false;
  }
}

// Export singleton instance
export const navigationService = NavigationService.getInstance();