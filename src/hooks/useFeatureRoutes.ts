import { useMemo } from 'react';
import { useOrganizationFeatures } from '@/hooks/database/useOrganizationFeatures';

export interface FeatureRoute {
  path: string;
  component: string;
  title: string;
  permissions: string[];
  icon?: string;
  isDefault?: boolean;
  menuOrder: number;
}

export function useFeatureRoutes(featureSlug: string) {
  const { data: features } = useOrganizationFeatures();
  
  const routes = useMemo(() => {
    const feature = features?.find(f => f.system_feature.slug === featureSlug);
    if (!feature) return [];
    
    const pages = feature.system_feature.navigation_config?.pages || [];
    console.log('🔍 useFeatureRoutes: Processing pages for feature:', featureSlug, pages);
    
    return pages
      .map((page: any) => ({
        path: page.route || page.href || '',
        component: page.component || 'Custom',
        title: page.title || page.name || 'Untitled Page',
        permissions: page.permissions || [],
        icon: page.icon,
        isDefault: page.isDefault || false,
        menuOrder: page.menuOrder || 0
      }))
      .sort((a: FeatureRoute, b: FeatureRoute) => a.menuOrder - b.menuOrder);
  }, [features, featureSlug]);

  return {
    routes,
    isLoading: !features,
    feature: features?.find(f => f.system_feature.slug === featureSlug)
  };
}