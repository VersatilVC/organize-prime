import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
        .select(`
          id, name, slug, description, long_description, category, subcategory,
          icon_name, icon_url, banner_url, screenshots, version, pricing_model,
          base_price, currency, rating_average, rating_count, install_count,
          is_featured, is_active, created_at, updated_at, required_permissions,
          compatibility_version, demo_url, documentation_url
        `)
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
      if (!currentOrganization?.id) {
        console.log('🔍 useAppInstallations: No current organization');
        return [];
      }

      console.log('🔍 useAppInstallations: Fetching for organization:', currentOrganization.id);

      const { data, error } = await supabase
        .from('marketplace_app_installations')
        .select(`
          *,
          marketplace_apps!inner(name, slug, icon_name, version)
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active');

      if (error) {
        console.error('❌ useAppInstallations: Error fetching app installations:', error);
        throw error;
      }

      console.log('✅ useAppInstallations: Found app installations:', data);
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
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationData();

  return useMutation({
    mutationFn: async ({ appId, appSettings = {} }: { appId: string; appSettings?: any }) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not found');
      }

      try {
        // First check if already installed and active
        const { data: existing } = await supabase
          .from('marketplace_app_installations')
          .select('id, status')
          .eq('app_id', appId)
          .eq('organization_id', currentOrganization.id)
          .maybeSingle();

        // If exists and active, throw error
        if (existing?.status === 'active') {
          throw new Error('App is already installed and active');
        }

        // Get app details first for better error reporting
        const { data: app, error: appError } = await supabase
          .from('marketplace_apps')
          .select('slug, name, navigation_config')
          .eq('id', appId)
          .maybeSingle();

        if (appError || !app) {
          throw new Error(`App not found or invalid: ${appError?.message || 'Unknown error'}`);
        }

        let installation;

        // If exists but inactive, reactivate it
        if (existing?.status === 'inactive') {
          const { data: reactivated, error: reactivateError } = await supabase
            .from('marketplace_app_installations')
            .update({
              status: 'active',
              app_settings: appSettings,
              installed_by: user.id,
              installed_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .maybeSingle();

          if (reactivateError) {
            throw new Error(`Failed to reactivate app: ${reactivateError.message}`);
          }
          if (!reactivated) {
            throw new Error('No data returned after reactivating app');
          }
          installation = reactivated;
        } else {
          // Create new installation
          const { data: newInstallation, error: installError } = await supabase
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
            .maybeSingle();

          if (installError) {
            throw new Error(`Failed to install app: ${installError.message}`);
          }
          if (!newInstallation) {
            throw new Error('No data returned after installing app');
          }
          installation = newInstallation;
        }

        // Upsert organization feature config (handles both new and existing configs)
        const { error: configError } = await supabase
          .from('organization_feature_configs')
          .upsert({
            organization_id: currentOrganization.id,
            feature_slug: app.slug,
            is_enabled: true,
            is_user_accessible: true,
            org_menu_order: 99, // Add to end by default
            created_by: user.id,
          }, {
            onConflict: 'organization_id,feature_slug'
          });

        if (configError) {
          // Log but don't fail - the app is still installed
          console.warn(`Failed to update feature config for ${app.slug}:`, configError);
        }

        // Track analytics (non-blocking)
        supabase
          .from('marketplace_app_analytics')
          .insert({
            app_id: appId,
            organization_id: currentOrganization.id,
            user_id: user.id,
            event_type: existing ? 'reactivate' : 'install',
            event_category: 'app_lifecycle',
            event_data: {
              installation_id: installation.id,
              app_settings: appSettings,
              app_name: app.name,
            },
          })
          .then(({ error }) => {
            if (error) console.warn('Analytics tracking failed:', error);
          });

        return installation;
      } catch (error) {
        console.error('App installation failed:', error);
        throw error;
      }
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
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationData();

  return useMutation({
    mutationFn: async (appId: string) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('User or organization not found');
      }

      try {
        // First verify the app exists and is installed
        const { data: installation, error: checkError } = await supabase
          .from('marketplace_app_installations')
          .select('id, status')
          .eq('app_id', appId)
          .eq('organization_id', currentOrganization.id)
          .maybeSingle();

        if (checkError || !installation) {
          throw new Error('App installation not found');
        }

        if (installation.status !== 'active') {
          throw new Error('App is not currently installed');
        }

        // Get app details for better error reporting and cleanup
        const { data: app, error: appError } = await supabase
          .from('marketplace_apps')
          .select('slug, name')
          .eq('id', appId)
          .maybeSingle();

        if (appError || !app) {
          throw new Error(`App details not found: ${appError?.message || 'Unknown error'}`);
        }

        // Update installation status first
        const { error: updateError } = await supabase
          .from('marketplace_app_installations')
          .update({
            status: 'inactive',
            uninstalled_at: new Date().toISOString(),
            uninstalled_by: user.id,
          })
          .eq('id', installation.id);

        if (updateError) {
          throw new Error(`Failed to update installation status: ${updateError.message}`);
        }

        // Remove from organization feature configs
        const { error: configError } = await supabase
          .from('organization_feature_configs')
          .delete()
          .eq('organization_id', currentOrganization.id)
          .eq('feature_slug', app.slug);

        if (configError) {
          // Log but don't fail the uninstall
          console.warn(`Failed to remove feature config for ${app.slug}:`, configError);
        }

        // Track analytics (non-blocking)
        supabase
          .from('marketplace_app_analytics')
          .insert({
            app_id: appId,
            organization_id: currentOrganization.id,
            user_id: user.id,
            event_type: 'uninstall',
            event_category: 'app_lifecycle',
            event_data: {
              installation_id: installation.id,
              app_name: app.name,
            },
          })
          .then(({ error }) => {
            if (error) console.warn('Analytics tracking failed:', error);
          });

        return { appId, appName: app.name };
      } catch (error) {
        console.error('App uninstallation failed:', error);
        throw error;
      }
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
  const { user } = useAuth();
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