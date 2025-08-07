import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useOrganizationData } from '@/contexts/OrganizationContext';

export interface MarketplaceApp {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description: string | null;
  category: string;
  subcategory: string | null;
  icon_name: string;
  icon_url: string | null;
  banner_url: string | null;
  screenshots: string[] | null;
  version: string;
  pricing_model: 'free' | 'paid' | 'freemium';
  base_price: number | null;
  currency: string;
  rating_average: number;
  rating_count: number;
  install_count: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  required_permissions: string[];
  settings_schema: any;
  navigation_config: any;
  app_config: any;
  compatibility_version: string;
  demo_url: string | null;
  documentation_url: string | null;
}

export interface AppInstallation {
  id: string;
  app_id: string;
  organization_id: string;
  status: 'active' | 'inactive' | 'pending';
  installed_at: string;
  installed_by: string;
  app_settings: any;
  custom_navigation: any;
  last_used_at: string | null;
  feature_flags: any;
}

export const useMarketplaceApps = () => {
  return useQuery({
    queryKey: ['marketplace-apps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_apps')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('install_count', { ascending: false });

      if (error) throw error;
      return data as MarketplaceApp[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useAppInstallations = () => {
  const { currentOrganization } = useOrganizationData();

  return useQuery({
    queryKey: ['app-installations', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from('marketplace_app_installations')
        .select(`
          *,
          marketplace_apps!inner(name, slug, icon_name, version)
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active');

      if (error) throw error;
      return data as (AppInstallation & {
        marketplace_apps: Pick<MarketplaceApp, 'name' | 'slug' | 'icon_name' | 'version'>;
      })[];
    },
    enabled: !!currentOrganization?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useInstallApp = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useEnhancedAuth();
  const { currentOrganization } = useOrganizationData();

  return useMutation({
    mutationFn: async ({ appId, appSettings = {} }: { appId: string; appSettings?: any }) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not found');
      }

      // First check if already installed
      const { data: existing } = await supabase
        .from('marketplace_app_installations')
        .select('id')
        .eq('app_id', appId)
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active')
        .single();

      if (existing) {
        throw new Error('App is already installed');
      }

      // Install the app
      const { data: installation, error: installError } = await supabase
        .from('marketplace_app_installations')
        .insert({
          app_id: appId,
          organization_id: currentOrganization.id,
          installed_by: user.id,
          status: 'active',
          app_settings: appSettings,
          custom_navigation: {},
          feature_flags: {},
        })
        .select()
        .single();

      if (installError) throw installError;

      // Get app details for navigation setup
      const { data: app, error: appError } = await supabase
        .from('marketplace_apps')
        .select('slug, navigation_config')
        .eq('id', appId)
        .single();

      if (appError) throw appError;

      // Add to organization feature configs if navigation config exists
      if (app.navigation_config && Object.keys(app.navigation_config).length > 0) {
        await supabase
          .from('organization_feature_configs')
          .insert({
            organization_id: currentOrganization.id,
            feature_slug: app.slug,
            is_enabled: true,
            is_user_accessible: true,
            org_menu_order: 99, // Add to end by default
            created_by: user.id,
          });
      }

      // Track analytics
      await supabase
        .from('marketplace_app_analytics')
        .insert({
          app_id: appId,
          organization_id: currentOrganization.id,
          user_id: user.id,
          event_type: 'install',
          event_category: 'app_lifecycle',
          event_data: {
            installation_id: installation.id,
            app_settings: appSettings,
          },
        });

      return installation;
    },
    onSuccess: (_, { appId }) => {
      queryClient.invalidateQueries({ queryKey: ['app-installations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-feature-configs'] });
      
      // Track app view
      if (currentOrganization?.id && user?.id) {
        supabase
          .from('marketplace_app_analytics')
          .insert({
            app_id: appId,
            organization_id: currentOrganization.id,
            user_id: user.id,
            event_type: 'install_complete',
            event_category: 'app_lifecycle',
          });
      }

      toast({
        title: 'App Installed Successfully',
        description: 'The app is now available in your organization.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Installation Failed',
        description: error.message || 'Failed to install the app. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useUninstallApp = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useEnhancedAuth();
  const { currentOrganization } = useOrganizationData();

  return useMutation({
    mutationFn: async (appId: string) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not found');
      }

      // Update installation status
      const { error: updateError } = await supabase
        .from('marketplace_app_installations')
        .update({
          status: 'inactive',
          uninstalled_at: new Date().toISOString(),
          uninstalled_by: user.id,
        })
        .eq('app_id', appId)
        .eq('organization_id', currentOrganization.id);

      if (updateError) throw updateError;

      // Get app slug for feature config removal
      const { data: app } = await supabase
        .from('marketplace_apps')
        .select('slug')
        .eq('id', appId)
        .single();

      // Remove from organization feature configs
      if (app?.slug) {
        await supabase
          .from('organization_feature_configs')
          .delete()
          .eq('organization_id', currentOrganization.id)
          .eq('feature_slug', app.slug);
      }

      // Track analytics
      await supabase
        .from('marketplace_app_analytics')
        .insert({
          app_id: appId,
          organization_id: currentOrganization.id,
          user_id: user.id,
          event_type: 'uninstall',
          event_category: 'app_lifecycle',
        });

      return { appId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-installations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-feature-configs'] });
      
      toast({
        title: 'App Uninstalled',
        description: 'The app has been removed from your organization.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Uninstall Failed',
        description: error.message || 'Failed to uninstall the app. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useTrackAppView = () => {
  const { user } = useEnhancedAuth();
  const { currentOrganization } = useOrganizationData();

  return useMutation({
    mutationFn: async ({ appId, pageData }: { appId: string; pageData?: any }) => {
      if (!user?.id || !currentOrganization?.id) return;

      await supabase
        .from('marketplace_app_analytics')
        .insert({
          app_id: appId,
          organization_id: currentOrganization.id,
          user_id: user.id,
          event_type: 'view',
          event_category: 'engagement',
          event_data: pageData || {},
        });
    },
  });
};