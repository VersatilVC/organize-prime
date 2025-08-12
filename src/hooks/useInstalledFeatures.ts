import { useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSystemFeatureConfigs } from './useSystemFeatureConfigs';
import { useOrganizationFeatureConfigs } from './useOrganizationFeatureConfigs';

export interface InstalledFeature {
  slug: string;
  displayName: string;
  iconName: string; // from existing Icons component
  isActive: boolean;
  installedAt: string;
  navigation: {
    name: string;
    href: string;
    icon: string;
    badge?: number; // for unread counts
  }[];
}

// Note: Navigation data now comes from database system_features.navigation_config.pages
// This metadata only provides fallback display information
const featureMetadata: Record<string, Pick<InstalledFeature, 'displayName' | 'iconName'>> = {
  'knowledge-base': {
    displayName: 'Knowledge Base',
    iconName: 'database',
  },
  'content-creation': {
    displayName: 'Content Engine',
    iconName: 'edit',
  },
  'market-intel': {
    displayName: 'Market Intelligence',
    iconName: 'trendingUp',
  }
};

export function useInstalledFeatures() {
  const { currentOrganization } = useOrganization();
  const { configs: systemConfigs } = useSystemFeatureConfigs();
  const { configs: orgConfigs } = useOrganizationFeatureConfigs();
  
  return useMemo(() => {
    if (!currentOrganization || !systemConfigs.length) return [];
    
    // Get enabled features based on system and organization configs
    const enabledFeatures = systemConfigs
      .filter(systemConfig => {
        // Must be globally enabled
        if (!systemConfig.is_enabled_globally) return false;
        
        // Check organization-specific config
        const orgConfig = orgConfigs.find(org => org.feature_slug === systemConfig.feature_slug);
        return orgConfig?.is_enabled !== false; // Enabled by default if no org config
      })
      .map(systemConfig => {
        const orgConfig = orgConfigs.find(org => org.feature_slug === systemConfig.feature_slug);
        const metadata = featureMetadata[systemConfig.feature_slug];
        
        if (!metadata) return null; // Skip if no metadata available
        
        return {
          slug: systemConfig.feature_slug,
          displayName: metadata.displayName,
          iconName: metadata.iconName,
          isActive: true,
          installedAt: systemConfig.created_at,
          navigation: [], // Navigation now comes from database pages, handled by other hooks
          // Use org menu order if available, otherwise system order
          menuOrder: orgConfig?.org_menu_order ?? systemConfig.system_menu_order
        };
      })
      .filter((feature): feature is InstalledFeature & { menuOrder: number } => feature !== null)
      .sort((a, b) => a.menuOrder - b.menuOrder)
      .map(({ menuOrder, ...feature }) => feature); // Remove menuOrder from final result
    
    return enabledFeatures;
  }, [currentOrganization, systemConfigs, orgConfigs]);
}