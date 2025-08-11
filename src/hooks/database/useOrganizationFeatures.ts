import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { SystemFeature } from '@/types/features';

export interface OrganizationFeatureWithSystem {
  id: string;
  organization_id: string;
  feature_id: string;
  is_enabled: boolean;
  feature_settings: any;
  setup_status: string;
  setup_error: string | null;
  enabled_by: string | null;
  enabled_at: string;
  created_at: string;
  updated_at: string;
  // System feature data
  system_feature: {
    id: string;
    name: string;
    slug: string;
    display_name: string;
    description: string | null;
    category: string;
    icon_name: string;
    color_hex: string;
    navigation_config: any;
    is_active: boolean;
  };
}

export interface FeatureNavigationSection {
  key: string;
  title: string;
  icon: string;
  color: string;
  items: Array<{
    name: string;
    href: string;
    icon: string;
  }>;
}

export function useOrganizationFeatures(organizationId?: string) {
  const { currentOrganization } = useOrganization();
  const orgId = organizationId || currentOrganization?.id;

  return useQuery({
    queryKey: ['organization-features', orgId],
    queryFn: async (): Promise<OrganizationFeatureWithSystem[]> => {
      if (!orgId) return [];

      // Mock data since tables don't exist yet
      return [
        {
          id: '1',
          organization_id: orgId,
          feature_id: '1',
          is_enabled: true,
          feature_settings: {},
          setup_status: 'completed',
          setup_error: null,
          enabled_by: null,
          enabled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          system_feature: {
            id: '1',
            name: 'knowledge-base',
            slug: 'knowledge-base',
            display_name: 'Knowledge Base',
            description: 'AI-powered document search and knowledge management',
            category: 'business',
            icon_name: 'bookOpen',
            color_hex: '#3b82f6',
            navigation_config: {
              items: [
                { name: 'Dashboard', href: '/features/knowledge-base', icon: 'home' },
                { name: 'Documents', href: '/features/knowledge-base/documents', icon: 'fileText' },
                { name: 'Search', href: '/features/knowledge-base/search', icon: 'search' },
                { name: 'Settings', href: '/features/knowledge-base/settings', icon: 'settings' }
              ]
            },
            is_active: true
          }
        }
      ];
    },
    enabled: !!orgId,
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors
      if (failureCount < 3 && error?.message?.includes('network')) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useFeatureNavigationSections(organizationId?: string): FeatureNavigationSection[] {
  const { data: features = [] } = useOrganizationFeatures(organizationId);

  return features.map(feature => {
    const systemFeature = feature.system_feature;
    const navigationConfig = systemFeature.navigation_config || {};
    
    // Default navigation items for all features
    const defaultItems = [
      { name: 'Dashboard', href: `/features/${systemFeature.slug}`, icon: 'home' },
      { name: 'Settings', href: `/features/${systemFeature.slug}/settings`, icon: 'settings' }
    ];

    // Use custom navigation items if they exist
    let navigationItems = defaultItems;
    if (navigationConfig.items && Array.isArray(navigationConfig.items) && navigationConfig.items.length > 0) {
      navigationItems = navigationConfig.items.map((navItem: any) => ({
        name: navItem.name || navItem.label,
        href: navItem.href || `/features/${systemFeature.slug}/${navItem.slug || navItem.name.toLowerCase()}`,
        icon: navItem.icon || 'package'
      }));
    }

    return {
      key: `feature-${systemFeature.slug}`,
      title: systemFeature.display_name,
      icon: systemFeature.icon_name || 'package',
      color: systemFeature.color_hex || '#6366f1',
      items: navigationItems
    };
  });
}

export function useToggleOrganizationFeature() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ featureId, isEnabled }: { featureId: string; isEnabled: boolean }) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      // Mock implementation - simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, this would update the database
      console.log(`${isEnabled ? 'Enabling' : 'Disabling'} feature ${featureId} for organization ${currentOrganization.id}`);
    },
    onSuccess: (_, variables) => {
      toast({
        title: `Feature ${variables.isEnabled ? 'enabled' : 'disabled'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['organization-features'] });
      queryClient.invalidateQueries({ queryKey: ['system-features'] });
    },
    onError: (error: any) => {
      console.error('Failed to toggle feature:', error);
      
      let errorMessage = "Failed to update feature status. Please try again.";
      
      if (error?.message?.includes('rate limit')) {
        errorMessage = "Too many requests. Please wait a moment before trying again.";
      } else if (error?.message?.includes('permission')) {
        errorMessage = "You do not have permission to perform this action.";
      } else if (error?.message?.includes('network')) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      
      toast({
        title: 'Failed to update feature',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}

export function useAvailableSystemFeatures() {
  return useQuery({
    queryKey: ['available-system-features'],
    queryFn: async (): Promise<SystemFeature[]> => {
      // Mock data since table doesn't exist yet
      return [
        {
          id: '1',
          name: 'knowledge-base',
          display_name: 'Knowledge Base',
          slug: 'knowledge-base',
          description: 'AI-powered document search and knowledge management',
          category: 'business',
          icon_name: 'bookOpen',
          color_hex: '#3b82f6',
          is_active: true,
          is_system_feature: true,
          sort_order: 0,
          navigation_config: {},
          required_tables: [],
          webhook_endpoints: {},
          setup_sql: null,
          cleanup_sql: null,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'content-creation',
          display_name: 'Content Creation',
          slug: 'content-creation',
          description: 'AI-powered content generation and editing tools',
          category: 'productivity',
          icon_name: 'edit',
          color_hex: '#10b981',
          is_active: true,
          is_system_feature: true,
          sort_order: 1,
          navigation_config: {},
          required_tables: [],
          webhook_endpoints: {},
          setup_sql: null,
          cleanup_sql: null,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}