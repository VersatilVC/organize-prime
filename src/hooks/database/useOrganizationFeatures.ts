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

      // Get organization features with their system feature details
      const { data, error } = await supabase
        .from('organization_feature_configs')
        .select(`
          *,
          system_feature_configs!inner(
            feature_slug,
            is_enabled_globally,
            is_marketplace_visible
          )
        `)
        .eq('organization_id', orgId)
        .eq('is_enabled', true)
        .eq('system_feature_configs.is_enabled_globally', true);

      if (error) {
        console.error('Error fetching organization features:', error);
        throw new Error('Failed to fetch organization features');
      }

      // Transform the data to match expected interface
      return (data || []).map(item => ({
        id: item.id,
        organization_id: item.organization_id,
        feature_id: item.feature_slug, // Use feature_slug as feature_id
        is_enabled: item.is_enabled,
        feature_settings: {},
        setup_status: 'completed',
        setup_error: null,
        enabled_by: item.created_by,
        enabled_at: item.created_at,
        created_at: item.created_at,
        updated_at: item.updated_at,
        system_feature: {
          id: item.feature_slug,
          name: item.feature_slug,
          slug: item.feature_slug,
          display_name: getFeatureDisplayName(item.feature_slug),
          description: getFeatureDescription(item.feature_slug),
          category: 'business',
          icon_name: getFeatureIcon(item.feature_slug),
          color_hex: getFeatureColor(item.feature_slug),
          navigation_config: getFeatureNavigation(item.feature_slug),
          is_active: true
        }
      }));
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

      if (isEnabled) {
        // Enable feature for organization
        const { error } = await supabase
          .from('organization_feature_configs')
          .upsert({
            organization_id: currentOrganization.id,
            feature_slug: featureId,
            is_enabled: true,
            is_user_accessible: true,
          });

        if (error) throw error;
      } else {
        // Disable feature for organization
        const { error } = await supabase
          .from('organization_feature_configs')
          .update({ is_enabled: false })
          .eq('organization_id', currentOrganization.id)
          .eq('feature_slug', featureId);

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: `Feature ${variables.isEnabled ? 'enabled' : 'disabled'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['organization-features'] });
      queryClient.invalidateQueries({ queryKey: ['organization-feature-configs'] });
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
      // Get globally enabled features that are visible in marketplace
      const { data, error } = await supabase
        .from('system_feature_configs')
        .select('*')
        .eq('is_enabled_globally', true)
        .eq('is_marketplace_visible', true)
        .order('system_menu_order');

      if (error) {
        console.error('Error fetching system features:', error);
        throw new Error('Failed to fetch system features');
      }

      // Transform to SystemFeature interface
      return (data || []).map(item => ({
        id: item.id,
        name: item.feature_slug,
        display_name: getFeatureDisplayName(item.feature_slug),
        slug: item.feature_slug,
        description: getFeatureDescription(item.feature_slug),
        category: 'business',
        icon_name: getFeatureIcon(item.feature_slug),
        color_hex: getFeatureColor(item.feature_slug),
        is_active: item.is_enabled_globally,
        is_system_feature: true,
        sort_order: item.system_menu_order,
        navigation_config: {},
        required_tables: [],
        webhook_endpoints: {},
        setup_sql: null,
        cleanup_sql: null,
        created_by: null,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper functions to get feature metadata
function getFeatureDisplayName(slug: string): string {
  const names: Record<string, string> = {
    'knowledge-base': 'Knowledge Base',
    'content-creation': 'Content Creation',
  };
  return names[slug] || slug.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function getFeatureDescription(slug: string): string {
  const descriptions: Record<string, string> = {
    'knowledge-base': 'AI-powered document search and knowledge management',
    'content-creation': 'AI-powered content generation and editing tools',
  };
  return descriptions[slug] || 'Advanced business feature';
}

function getFeatureIcon(slug: string): string {
  const icons: Record<string, string> = {
    'knowledge-base': 'bookOpen',
    'content-creation': 'edit',
  };
  return icons[slug] || 'package';
}

function getFeatureColor(slug: string): string {
  const colors: Record<string, string> = {
    'knowledge-base': '#3b82f6',
    'content-creation': '#10b981',
  };
  return colors[slug] || '#6366f1';
}

function getFeatureNavigation(slug: string): any {
  const navigations: Record<string, any> = {
    'knowledge-base': {
      items: [
        { name: 'Dashboard', href: '/features/knowledge-base', icon: 'home' },
        { name: 'Documents', href: '/features/knowledge-base/documents', icon: 'fileText' },
        { name: 'Search', href: '/features/knowledge-base/search', icon: 'search' },
        { name: 'Settings', href: '/features/knowledge-base/settings', icon: 'settings' }
      ]
    }
  };
  return navigations[slug] || {};
}