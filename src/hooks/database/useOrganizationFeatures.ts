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
  // System feature data from join
  system_feature: {
    id: string;
    name: string;
    slug: string;
    display_name: string;
    description: string;
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
      if (!orgId) {
        console.log('🔍 useOrganizationFeatures: No organization ID available');
        return [];
      }

      console.log('🔍 useOrganizationFeatures: Fetching features for org:', orgId);

      // Step 1: Get globally enabled system features
      const { data: systemConfigs, error: systemError } = await supabase
        .from('system_feature_configs')
        .select('feature_slug')
        .eq('is_enabled_globally', true);

      if (systemError) {
        console.error('❌ useOrganizationFeatures: Error fetching system configs:', systemError);
        throw new Error('Failed to fetch system feature configs');
      }

      const enabledSystemFeatures = new Set(systemConfigs?.map(s => s.feature_slug) || []);
      console.log('🔍 useOrganizationFeatures: Globally enabled features:', enabledSystemFeatures);

      // Step 2: Get organization feature configs that are enabled at both levels
      const { data: orgConfigs, error: orgError } = await supabase
        .from('organization_feature_configs')
        .select('id, organization_id, feature_slug, is_enabled, is_user_accessible, org_menu_order, created_at, updated_at')
        .eq('organization_id', orgId)
        .eq('is_enabled', true)
        .eq('is_user_accessible', true);

      if (orgError) {
        console.error('❌ useOrganizationFeatures: Error fetching org configs:', orgError);
        throw new Error('Failed to fetch organization feature configs');
      }

      console.log('🔍 useOrganizationFeatures: Raw org configs:', orgConfigs);

      // Step 3: Filter to only include features enabled at system level
      const filteredFeatures = (orgConfigs || []).filter(config => 
        enabledSystemFeatures.has(config.feature_slug)
      );

      console.log('🔍 useOrganizationFeatures: Filtered features (system + org enabled):', filteredFeatures);

      // Step 4: Get system features with navigation config from system_feature_configs (single source of truth)
      const { data: systemFeatures, error: featuresError } = await supabase
        .from('system_feature_configs')
        .select('feature_slug, display_name, description, icon_name, color_hex, navigation_config')
        .in('feature_slug', filteredFeatures.map(f => f.feature_slug));

      if (featuresError) {
        console.error('❌ useOrganizationFeatures: Error fetching system features:', featuresError);
        throw new Error('Failed to fetch system features');
      }

      const systemFeaturesMap = new Map(systemFeatures?.map(f => [f.feature_slug, f]) || []);
      console.log('🔍 useOrganizationFeatures: System features with navigation:', systemFeaturesMap);
      console.log('🔍 useOrganizationFeatures: Raw systemFeatures:', systemFeatures);

      const finalFeatures = filteredFeatures.map((item: any) => {
        const slug = item.feature_slug as string;
        const systemFeature = systemFeaturesMap.get(slug);
        
        // Safely parse navigation_config if it's a JSON string
        const navigationConfig = typeof systemFeature?.navigation_config === 'string' 
          ? JSON.parse(systemFeature.navigation_config)
          : systemFeature?.navigation_config || { pages: [] };
        
        console.log(`🔍 Processing feature ${slug}:`, {
          systemFeature,
          navigation_config: navigationConfig,
          pages: navigationConfig?.pages
        });
        
        return {
          id: item.id,
          organization_id: item.organization_id,
          feature_id: slug,
          is_enabled: item.is_enabled,
          feature_settings: {},
          setup_status: 'completed',
          setup_error: null,
          enabled_by: null,
          enabled_at: item.created_at,
          created_at: item.created_at,
          updated_at: item.updated_at,
          system_feature: {
            id: slug,
            name: slug,
            slug,
            display_name: systemFeature?.display_name || getFeatureDisplayName(slug),
            description: systemFeature?.description || getFeatureDescription(slug),
            category: 'business',
            icon_name: systemFeature?.icon_name || getFeatureIcon(slug),
            color_hex: systemFeature?.color_hex || getFeatureColor(slug),
            navigation_config: navigationConfig,
            is_active: true,
          },
        };
      });

      console.log('🔍 useOrganizationFeatures: Final transformed features:', finalFeatures);
      return finalFeatures;
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
    staleTime: 0, // Force refresh to get latest navigation config
    gcTime: 0, // Disable cache completely to force fresh data
  });
}

export function useFeatureNavigationSections(organizationId?: string): FeatureNavigationSection[] {
  const { data: features = [] } = useOrganizationFeatures(organizationId);

  console.log('🔍 useFeatureNavigationSections: Processing features for navigation:', features);

  const sections = features
    .map(feature => {
      const slug = feature.system_feature?.slug;
      if (!slug) return null;
      const navConfig = feature.system_feature?.navigation_config;
      
      // Use pages from navigation_config if available
      const pages = Array.isArray(navConfig?.pages) ? navConfig.pages : [];
      const navigationItems = pages.map((page: any) => {
        let href = (page.route || page.href || '').startsWith('/') ? (page.route || page.href) : `/${page.route || page.href || ''}`;
        
        // Transform /apps/knowledge-base/* routes to /features/knowledge-base/* for sidebar navigation
        if (href.startsWith('/apps/knowledge-base/')) {
          href = href.replace('/apps/knowledge-base/', '/features/knowledge-base/');
        }
        
        return {
          name: page.title || page.name,
          href,
          icon: page.icon || 'package',
        };
      });
      
      if (navigationItems.length === 0) return null;
      const section = {
        key: `feature-${slug}`,
        title: feature.system_feature.display_name || getFeatureDisplayName(slug),
        icon: feature.system_feature.icon_name || getFeatureIcon(slug),
        color: feature.system_feature.color_hex || getFeatureColor(slug),
        items: navigationItems
      } as FeatureNavigationSection;

      console.log('🔍 useFeatureNavigationSections: Created section:', section);
      return section;
    })
    .filter(Boolean) as FeatureNavigationSection[];

  console.log('🔍 useFeatureNavigationSections: Final navigation sections:', sections);
  return sections;
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
  if (!slug) return 'Unknown Feature';
  const names: Record<string, string> = {
    'knowledge-base': 'Knowledge Base',
    'content-creation': 'Content Creation',
  };
  return names[slug] || slug.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function getFeatureDescription(slug: string): string {
  if (!slug) return 'Feature description not available';
  const descriptions: Record<string, string> = {
    'knowledge-base': 'AI-powered document search and knowledge management',
    'content-creation': 'AI-powered content generation and editing tools',
  };
  return descriptions[slug] || 'Advanced business feature';
}

function getFeatureIcon(slug: string): string {
  if (!slug) return 'package';
  const icons: Record<string, string> = {
    'knowledge-base': 'bookOpen',
    'content-creation': 'edit',
  };
  return icons[slug] || 'package';
}

function getFeatureColor(slug: string): string {
  if (!slug) return '#6366f1';
  const colors: Record<string, string> = {
    'knowledge-base': '#3b82f6',
    'content-creation': '#10b981',
  };
  return colors[slug] || '#6366f1';
}
