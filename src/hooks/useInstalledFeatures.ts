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

const featureMetadata: Record<string, Omit<InstalledFeature, 'slug' | 'isActive' | 'installedAt'>> = {
  'knowledge-base': {
    displayName: 'Knowledge Base',
    iconName: 'database',
    navigation: [
      { name: 'Dashboard', href: '/features/knowledge-base/dashboard', icon: 'home' },
      { name: 'Documents', href: '/features/knowledge-base/documents', icon: 'file' },
      { name: 'Search', href: '/features/knowledge-base/search', icon: 'search' },
      { name: 'Collections', href: '/features/knowledge-base/collections', icon: 'folder' },
      { name: 'Settings', href: '/features/knowledge-base/settings', icon: 'settings' }
    ]
  },
  'content-creation': {
    displayName: 'Content Engine',
    iconName: 'edit',
    navigation: [
      { name: 'Dashboard', href: '/features/content-creation/dashboard', icon: 'home' },
      { name: 'Projects', href: '/features/content-creation/projects', icon: 'briefcase' },
      { name: 'Library', href: '/features/content-creation/library', icon: 'library' },
      { name: 'Templates', href: '/features/content-creation/templates', icon: 'layout' },
      { name: 'Settings', href: '/features/content-creation/settings', icon: 'settings' }
    ]
  },
  'market-intel': {
    displayName: 'Market Intelligence',
    iconName: 'trendingUp',
    navigation: [
      { name: 'Dashboard', href: '/features/market-intel/dashboard', icon: 'home' },
      { name: 'Funding', href: '/features/market-intel/funding', icon: 'dollarSign', badge: 5 },
      { name: 'Competitors', href: '/features/market-intel/competitors', icon: 'users' },
      { name: 'Signals', href: '/features/market-intel/signals', icon: 'radar', badge: 12 },
      { name: 'Reports', href: '/features/market-intel/reports', icon: 'fileText' },
      { name: 'Settings', href: '/features/market-intel/settings', icon: 'settings' }
    ]
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
          navigation: metadata.navigation,
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