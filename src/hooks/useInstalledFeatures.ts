import { useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';

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

const mockInstalledFeatures: InstalledFeature[] = [
  {
    slug: 'knowledge-base',
    displayName: 'Knowledge Base',
    iconName: 'database',
    isActive: true,
    installedAt: '2024-01-15T10:00:00Z',
    navigation: [
      { name: 'Dashboard', href: '/features/knowledge-base/dashboard', icon: 'home' },
      { name: 'Documents', href: '/features/knowledge-base/documents', icon: 'file' },
      { name: 'Search', href: '/features/knowledge-base/search', icon: 'search' },
      { name: 'Collections', href: '/features/knowledge-base/collections', icon: 'folder' },
      { name: 'Settings', href: '/features/knowledge-base/settings', icon: 'settings' }
    ]
  },
  {
    slug: 'content-creation',
    displayName: 'Content Engine',
    iconName: 'edit',
    isActive: true,
    installedAt: '2024-01-20T14:30:00Z',
    navigation: [
      { name: 'Dashboard', href: '/features/content-creation/dashboard', icon: 'home' },
      { name: 'Projects', href: '/features/content-creation/projects', icon: 'briefcase' },
      { name: 'Library', href: '/features/content-creation/library', icon: 'library' },
      { name: 'Templates', href: '/features/content-creation/templates', icon: 'layout' },
      { name: 'Settings', href: '/features/content-creation/settings', icon: 'settings' }
    ]
  },
  {
    slug: 'market-intel',
    displayName: 'Market Intelligence',
    iconName: 'trendingUp',
    isActive: true,
    installedAt: '2024-02-01T09:15:00Z',
    navigation: [
      { name: 'Dashboard', href: '/features/market-intel/dashboard', icon: 'home' },
      { name: 'Funding', href: '/features/market-intel/funding', icon: 'dollarSign', badge: 5 },
      { name: 'Competitors', href: '/features/market-intel/competitors', icon: 'users' },
      { name: 'Signals', href: '/features/market-intel/signals', icon: 'radar', badge: 12 },
      { name: 'Reports', href: '/features/market-intel/reports', icon: 'fileText' },
      { name: 'Settings', href: '/features/market-intel/settings', icon: 'settings' }
    ]
  }
];

export function useInstalledFeatures() {
  const { currentOrganization } = useOrganization();
  
  // In real implementation, this would fetch from database
  // For now, return mock data based on organization
  return useMemo(() => {
    if (!currentOrganization) return [];
    
    // Return different features based on organization
    return mockInstalledFeatures
      .filter(feature => feature.isActive)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [currentOrganization]);
}