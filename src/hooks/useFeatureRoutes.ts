import { useMemo } from 'react';
import { useOrganizationFeatures } from '@/hooks/database/useOrganizationFeatures';
import { navigationService, NavigationRoute } from '@/lib/navigation-service';

export interface FeatureRoute extends NavigationRoute {
  featureSlug: string;
}

export function useFeatureRoutes(featureSlug: string) {
  const { data: features } = useOrganizationFeatures();
  
  const routes = useMemo(() => {
    const feature = features?.find(f => f.system_feature.slug === featureSlug);
    if (!feature) return [];
    
    const pages = feature.system_feature.navigation_config?.pages || [];
    // Reduced logging to prevent UI flashing
    // console.log('🔍 useFeatureRoutes: Processing pages for feature:', featureSlug, pages);
    
    const processedRoutes = pages
      .map((page: any) => {
        // Normalize route to standard format
        const rawPath = page.route || page.href || '';
        const normalizedPath = navigationService.normalizeRoute(rawPath, featureSlug);
        
        return {
          path: normalizedPath,
          component: page.component || 'Custom',
          title: page.title || page.name || 'Untitled Page',
          permissions: page.permissions || [],
          icon: page.icon,
          isDefault: page.isDefault || false,
          menuOrder: page.menuOrder || 0,
          featureSlug
        } as FeatureRoute;
      })
      .sort((a: FeatureRoute, b: FeatureRoute) => a.menuOrder - b.menuOrder);

    // Validate routes for consistency
    const validation = navigationService.validateRoutes(processedRoutes);
    if (!validation.isValid) {
      console.warn('🚨 Route validation errors for feature:', featureSlug, validation.errors);
    }

    // console.log('✅ useFeatureRoutes: Processed routes for:', featureSlug, processedRoutes);
    return processedRoutes;
  }, [features, featureSlug]);

  return {
    routes,
    isLoading: !features,
    feature: features?.find(f => f.system_feature.slug === featureSlug)
  };
}