import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { NavigationItem } from '../types/AppTypes';
import { useAppConfig } from './useAppConfig';
import { useOrganizationFeatureConfigs } from '@/hooks/useOrganizationFeatureConfigs';

export interface UseAppNavigationOptions {
  appId: string;
  defaultNavigation?: NavigationItem[];
}

export interface UseAppNavigationReturn {
  navigationItems: NavigationItem[];
  currentPath: string;
  activeItem: NavigationItem | null;
  breadcrumbs: { label: string; path?: string }[];
  isNavigationLoading: boolean;
}

export function useAppNavigation({ 
  appId, 
  defaultNavigation = [] 
}: UseAppNavigationOptions): UseAppNavigationReturn {
  const location = useLocation();
  const params = useParams();
  const { configuration, isLoading: configLoading } = useAppConfig({ appId });
  const { configs: featureConfigs, isLoading: featureConfigsLoading } = useOrganizationFeatureConfigs();

  // Get app slug from URL params
  const appSlug = params.slug;
  const currentPath = location.pathname;

  // Determine if app navigation should be shown
  const isAppEnabled = useMemo(() => {
    if (!featureConfigs || !appSlug) return false;
    
    const appFeatureConfig = featureConfigs.find(config => 
      config.feature_slug === appSlug && config.is_enabled && config.is_user_accessible
    );
    
    return !!appFeatureConfig;
  }, [featureConfigs, appSlug]);

  // Build navigation items
  const navigationItems = useMemo(() => {
    if (!isAppEnabled || !configuration) {
      return [];
    }

    // Start with custom navigation from configuration
    let navItems = configuration.customNavigation || [];
    
    // Fall back to default navigation if no custom navigation
    if (navItems.length === 0) {
      navItems = defaultNavigation;
    }

    // Filter navigation items based on permissions and feature flags
    return navItems.filter(item => {
      // Check feature flags
      if (item.id && configuration.featureFlags) {
        const featureFlag = configuration.featureFlags[`nav_${item.id}`];
        if (featureFlag === false) {
          return false;
        }
      }

      // TODO: Add permission checking when user permissions are available
      // if (item.permissions && !hasPermissions(item.permissions)) {
      //   return false;
      // }

      return true;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [isAppEnabled, configuration, defaultNavigation]);

  // Find active navigation item
  const activeItem = useMemo(() => {
    const findActiveItem = (items: NavigationItem[]): NavigationItem | null => {
      for (const item of items) {
        // Check if current path matches item path
        if (item.path && currentPath.startsWith(item.path)) {
          // If item has children, check them first
          if (item.children) {
            const activeChild = findActiveItem(item.children);
            if (activeChild) return activeChild;
          }
          return item;
        }
        
        // Check children
        if (item.children) {
          const activeChild = findActiveItem(item.children);
          if (activeChild) return activeChild;
        }
      }
      return null;
    };

    return findActiveItem(navigationItems);
  }, [navigationItems, currentPath]);

  // Build breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; path?: string }[] = [];
    
    // Add app root
    if (appSlug) {
      crumbs.push({ 
        label: configuration?.appId || 'App', 
        path: `/features/${appSlug}` 
      });
    }

    // Build breadcrumb trail for active item
    if (activeItem) {
      const buildBreadcrumbTrail = (
        items: NavigationItem[], 
        targetItem: NavigationItem,
        trail: NavigationItem[] = []
      ): NavigationItem[] | null => {
        for (const item of items) {
          const currentTrail = [...trail, item];
          
          if (item.id === targetItem.id) {
            return currentTrail;
          }
          
          if (item.children) {
            const childTrail = buildBreadcrumbTrail(item.children, targetItem, currentTrail);
            if (childTrail) {
              return childTrail;
            }
          }
        }
        return null;
      };

      const trail = buildBreadcrumbTrail(navigationItems, activeItem);
      if (trail) {
        // Skip the first item if it's the same as app root
        const startIndex = trail[0]?.path === `/features/${appSlug}` ? 1 : 0;
        
        for (let i = startIndex; i < trail.length; i++) {
          const item = trail[i];
          crumbs.push({
            label: item.label,
            path: i === trail.length - 1 ? undefined : item.path // No link for current page
          });
        }
      }
    }

    return crumbs;
  }, [activeItem, navigationItems, appSlug, configuration]);

  return {
    navigationItems,
    currentPath,
    activeItem,
    breadcrumbs,
    isNavigationLoading: configLoading || featureConfigsLoading,
  };
}

// Hook for getting specific navigation item by ID
export function useNavigationItem(appId: string, itemId: string) {
  const { navigationItems } = useAppNavigation({ appId });

  return useMemo(() => {
    const findItem = (items: NavigationItem[]): NavigationItem | null => {
      for (const item of items) {
        if (item.id === itemId) {
          return item;
        }
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findItem(navigationItems);
  }, [navigationItems, itemId]);
}

// Hook for checking if a navigation item is active
export function useIsNavigationItemActive(path: string) {
  const location = useLocation();
  
  return useMemo(() => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }, [location.pathname, path]);
}