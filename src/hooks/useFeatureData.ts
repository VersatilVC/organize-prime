import { useMemo } from 'react';
import { useInstalledFeatures } from './useInstalledFeatures';
import { useUserRole } from './useUserRole';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface FeatureData {
  slug: string;
  displayName: string;
  description: string;
  iconName: string;
  isInstalled: boolean;
  hasAccess: boolean;
  navigation: {
    label: string;
    path: string;
    icon: string;
    requiresRole?: string;
  }[];
  settings: Record<string, any>;
  dashboardConfig: {
    widgets: string[];
    quickActions: string[];
  };
}

const mockFeatureData: Record<string, FeatureData> = {
  'knowledge-base': {
    slug: 'knowledge-base',
    displayName: 'Knowledge Base',
    description: 'AI-powered document search and knowledge management',
    iconName: 'database',
    isInstalled: true,
    hasAccess: true,
    navigation: [
      { label: 'Dashboard', path: '/dashboard', icon: 'home' },
      { label: 'Documents', path: '/documents', icon: 'file' },
      { label: 'Search', path: '/search', icon: 'search' },
      { label: 'Collections', path: '/collections', icon: 'folder' },
      { label: 'Settings', path: '/settings', icon: 'settings', requiresRole: 'admin' }
    ],
    settings: {
      searchEnabled: true,
      autoIndex: true,
      maxFileSize: 10,
      allowedFileTypes: ['pdf', 'doc', 'txt']
    },
    dashboardConfig: {
      widgets: ['document-count', 'recent-searches', 'popular-docs'],
      quickActions: ['upload-document', 'create-collection', 'advanced-search']
    }
  },
  'content-creation': {
    slug: 'content-creation',
    displayName: 'Content Engine',
    description: 'Advanced content creation and management platform',
    iconName: 'edit',
    isInstalled: true,
    hasAccess: true,
    navigation: [
      { label: 'Dashboard', path: '/dashboard', icon: 'home' },
      { label: 'Projects', path: '/projects', icon: 'briefcase' },
      { label: 'Library', path: '/library', icon: 'library' },
      { label: 'Templates', path: '/templates', icon: 'layout' },
      { label: 'Settings', path: '/settings', icon: 'settings', requiresRole: 'admin' }
    ],
    settings: {
      autoSave: true,
      templateSharing: true,
      aiAssistance: true,
      collaborationMode: 'real-time'
    },
    dashboardConfig: {
      widgets: ['active-projects', 'recent-content', 'team-activity'],
      quickActions: ['new-project', 'import-template', 'collaborate']
    }
  },
  'market-intel': {
    slug: 'market-intel',
    displayName: 'Market Intelligence',
    description: 'Real-time market analysis and competitive intelligence',
    iconName: 'trendingUp',
    isInstalled: true,
    hasAccess: true,
    navigation: [
      { label: 'Dashboard', path: '/dashboard', icon: 'home' },
      { label: 'Funding', path: '/funding', icon: 'dollarSign' },
      { label: 'Competitors', path: '/competitors', icon: 'users' },
      { label: 'Signals', path: '/signals', icon: 'radar' },
      { label: 'Reports', path: '/reports', icon: 'fileText' },
      { label: 'Settings', path: '/settings', icon: 'settings', requiresRole: 'admin' }
    ],
    settings: {
      realTimeAlerts: true,
      competitorTracking: true,
      fundingAlerts: true,
      reportFrequency: 'weekly'
    },
    dashboardConfig: {
      widgets: ['market-trends', 'funding-activity', 'competitor-alerts'],
      quickActions: ['track-competitor', 'set-alert', 'generate-report']
    }
  }
};

export interface FeatureContext {
  feature: FeatureData | null;
  isLoading: boolean;
  error: string | null;
  hasAccess: boolean;
  userRole: string;
}

export function useFeatureData(slug?: string): FeatureContext {
  const installedFeatures = useInstalledFeatures();
  const { role, loading: roleLoading } = useUserRole();
  const { currentOrganization } = useOrganization();

  const featureData = useMemo(() => {
    console.log('🔍 useFeatureData Debug:', {
      slug,
      installedFeatures: installedFeatures.map(f => f.slug),
      currentOrganization: currentOrganization?.id,
      roleLoading,
      role
    });

    if (!slug) {
      console.log('❌ useFeatureData: No slug provided');
      return null;
    }
    
    const mockData = mockFeatureData[slug];
    if (!mockData) {
      console.log('❌ useFeatureData: No mock data found for slug:', slug);
      return null;
    }

    // Check if feature is actually installed
    const isInstalled = installedFeatures.some(f => f.slug === slug);
    console.log('🔍 useFeatureData: Feature check:', {
      slug,
      isInstalled,
      availableFeatures: installedFeatures.map(f => f.slug)
    });
    
    const result = {
      ...mockData,
      isInstalled,
      hasAccess: isInstalled && Boolean(currentOrganization)
    };

    console.log('✅ useFeatureData: Final result:', result);
    return result;
  }, [slug, installedFeatures, currentOrganization]);

  const hasAccess = useMemo(() => {
    if (!featureData || !role) {
      console.log('🔍 useFeatureData hasAccess: Missing data', {
        hasFeatureData: !!featureData,
        hasRole: !!role,
        role
      });
      return false;
    }
    const access = featureData.hasAccess && featureData.isInstalled;
    console.log('🔍 useFeatureData hasAccess:', {
      featureHasAccess: featureData.hasAccess,
      featureIsInstalled: featureData.isInstalled,
      finalAccess: access
    });
    return access;
  }, [featureData, role]);

  const result = {
    feature: featureData,
    isLoading: roleLoading || !currentOrganization,
    error: null,
    hasAccess,
    userRole: role
  };

  console.log('🔍 useFeatureData: Final hook result:', result);
  return result;
}