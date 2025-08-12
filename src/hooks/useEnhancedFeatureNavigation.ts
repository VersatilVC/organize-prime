import { useMemo } from 'react';
import { useFeatureNavigationSections } from '@/hooks/database/useOrganizationFeatures';
import { navigationService, NavigationRoute } from '@/lib/navigation-service';

/**
 * Enhanced hook that provides hierarchical feature navigation with proper active state detection
 */
export function useEnhancedFeatureNavigationSections() {
  const rawSections = useFeatureNavigationSections();

  const enhancedSections = useMemo(() => {
    if (!rawSections || rawSections.length === 0) return [];
    
    return rawSections.map(section => {
      // Convert section items to NavigationRoute format for consistent processing
      const routes: NavigationRoute[] = section.items.map(item => ({
        path: item.href,
        title: item.name,
        component: 'Custom',
        permissions: [],
        menuOrder: 0,
        icon: typeof item.icon === 'string' ? item.icon : undefined,
        featureSlug: navigationService.extractFeatureSlug(item.href) || undefined
      }));

      // Validate and normalize all routes in this section
      const normalizedRoutes = routes.map(route => ({
        ...route,
        path: navigationService.normalizeRoute(route.path, route.featureSlug)
      }));

      // Validate route consistency
      const validation = navigationService.validateRoutes(normalizedRoutes);
      if (!validation.isValid) {
        console.warn(`Route validation errors in section ${section.title}:`, validation.errors);
      }

      // Convert back to section item format with normalized paths
      const enhancedItems = normalizedRoutes.map((route, index) => ({
        ...section.items[index],
        href: route.path
      }));

      return {
        ...section,
        items: enhancedItems,
        _routes: normalizedRoutes // Include routes for hierarchical checking
      };
    });
  }, [rawSections]);

  return {
    sections: enhancedSections,
    isLoading: false, // Hook provides direct data
    getAllRoutes: () => {
      return enhancedSections.flatMap(section => section._routes || []);
    }
  };
}