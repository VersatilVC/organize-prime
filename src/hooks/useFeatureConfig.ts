import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FeaturePageConfig {
  path: string;
  component: string;
  title?: string;
  requiresRole?: string;
  layout?: 'default' | 'fullscreen' | 'minimal';
}

export interface FeatureNavigationConfig {
  label: string;
  path: string;
  icon: string;
  requiresRole?: string;
}

export interface FeatureConfig {
  id: string;
  feature_slug: string;
  display_name: string;
  description?: string;
  icon_name?: string;
  color_hex?: string;
  is_enabled_globally: boolean;
  feature_pages: FeaturePageConfig[];
  navigation_config: {
    menu_items?: FeatureNavigationConfig[];
    [key: string]: any;
  };
  webhook_endpoints?: Record<string, any>;
}

export function useFeatureConfig(slug: string) {
  return useQuery({
    queryKey: ['feature-config', slug],
    queryFn: async (): Promise<FeatureConfig | null> => {

      const { data, error } = await supabase
        .from('system_feature_configs')
        .select('*')
        .eq('feature_slug', slug)
        .eq('is_enabled_globally', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - feature not found or not enabled
          return null;
        }
        throw new Error(`Failed to load feature config: ${error.message}`);
      }

      return {
        id: data.id,
        feature_slug: data.feature_slug,
        display_name: data.display_name || data.feature_slug.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: data.description,
        icon_name: data.icon_name || 'package',
        color_hex: data.color_hex,
        is_enabled_globally: data.is_enabled_globally,
        feature_pages: Array.isArray(data.feature_pages) ? data.feature_pages : [],
        navigation_config: data.navigation_config || {},
        webhook_endpoints: data.webhook_endpoints || {},
      };
    },
    staleTime: 15 * 60 * 1000, // ✅ 15 minutes - feature configs rarely change
    gcTime: 60 * 60 * 1000, // ✅ Keep in cache for 1 hour
    refetchOnWindowFocus: false, // ✅ Don't refetch when window gets focus
    refetchOnMount: false, // ✅ Don't refetch on every mount
    refetchOnReconnect: false, // ✅ Don't refetch on network reconnect
    refetchInterval: false, // ✅ Don't poll
    retry: (failureCount, error: any) => {
      // Don't retry if feature not found
      if (error?.message?.includes('not found')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}