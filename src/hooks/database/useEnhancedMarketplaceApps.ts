import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { cacheConfig } from '@/lib/query-client';

// Enhanced TypeScript interfaces
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
  settings_schema: Record<string, any>;
  navigation_config: Record<string, any>;
  app_config: Record<string, any>;
  compatibility_version: string;
  demo_url: string | null;
  documentation_url: string | null;
  // Joined data
  app_category?: {
    name: string;
    description: string;
    icon_name: string;
  };
}

export interface AppInstallation {
  id: string;
  app_id: string;
  organization_id: string;
  status: 'active' | 'inactive' | 'pending';
  installed_at: string;
  installed_by: string;
  uninstalled_at?: string;
  uninstalled_by?: string;
  app_settings: Record<string, any>;
  custom_navigation: Record<string, any>;
  last_used_at: string | null;
  feature_flags: Record<string, boolean>;
  // Joined data
  marketplace_apps?: Pick<MarketplaceApp, 'name' | 'slug' | 'icon_name' | 'version' | 'description'>;
}

export interface AppReviewWithProfile {
  id: string;
  app_id: string;
  organization_id: string;
  user_id: string;
  rating: number;
  review_title: string | null;
  review_text: string | null;
  pros: string[] | null;
  cons: string[] | null;
  is_verified: boolean;
  is_featured: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
  organizations?: {
    name: string;
  };
}

export interface MarketplaceSettings {
  featured_apps_limit: number;
  allow_external_apps: boolean;
  require_admin_approval: boolean;
  auto_update_apps: boolean;
  marketplace_enabled: boolean;
}

// Query key factory
const marketplaceKeys = {
  all: ['marketplace'] as const,
  apps: () => [...marketplaceKeys.all, 'apps'] as const,
  app: (id: string) => [...marketplaceKeys.apps(), id] as const,
  installations: (orgId?: string) => [...marketplaceKeys.all, 'installations', orgId] as const,
  reviews: (appId: string) => [...marketplaceKeys.all, 'reviews', appId] as const,
  userReview: (appId: string, orgId?: string) => [...marketplaceKeys.reviews(appId), 'user', orgId] as const,
  settings: () => [...marketplaceKeys.all, 'settings'] as const,
  analytics: (appId: string) => [...marketplaceKeys.all, 'analytics', appId] as const,
};

/**
 * Enhanced hook for fetching marketplace apps with advanced filtering and performance optimization
 */
export const useEnhancedMarketplaceApps = (options?: {
  featured?: boolean;
  category?: string;
  search?: string;
  limit?: number;
  includeCategories?: boolean;
}) => {
  return useQuery({
    queryKey: [...marketplaceKeys.apps(), options],
    queryFn: async () => {
      let query = supabase
        .from('marketplace_apps')
        .select(`
          *,
          ${options?.includeCategories ? 'app_categories!inner(name, description, icon_name)' : ''}
        `)
        .eq('is_active', true);

      // Apply filters
      if (options?.featured) {
        query = query.eq('is_featured', true);
      }
      
      if (options?.category) {
        query = query.eq('category', options.category);
      }

      if (options?.search) {
        query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }

      // Ordering
      query = query
        .order('is_featured', { ascending: false })
        .order('install_count', { ascending: false })
        .order('rating_average', { ascending: false });

      // Limit
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching marketplace apps:', error);
        throw new Error(`Failed to load marketplace apps: ${error.message}`);
      }

      return data as unknown as MarketplaceApp[];
    },
    staleTime: cacheConfig.static.staleTime,
    gcTime: cacheConfig.static.gcTime,
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Enhanced hook for fetching app installations with organization context
 */
export const useEnhancedAppInstallations = () => {
  const { currentOrganization } = useOrganizationData();

  return useQuery({
    queryKey: marketplaceKeys.installations(currentOrganization?.id),
    queryFn: async () => {
      if (!currentOrganization?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('marketplace_app_installations')
        .select(`
          *,
          marketplace_apps!inner(
            name,
            slug,
            icon_name,
            version,
            description,
            navigation_config
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active')
        .order('installed_at', { ascending: false });

      if (error) {
        console.error('Error fetching app installations:', error);
        throw new Error(`Failed to load installed apps: ${error.message}`);
      }

      return data as AppInstallation[];
    },
    enabled: !!currentOrganization?.id,
    staleTime: cacheConfig.dynamic.staleTime,
    gcTime: cacheConfig.dynamic.gcTime,
    refetchInterval: cacheConfig.realtime.refetchInterval,
  });
};

/**
 * Enhanced app installation mutation with comprehensive error handling
 */
export const useEnhancedInstallApp = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useEnhancedAuth();
  const { currentOrganization } = useOrganizationData();

  return useMutation({
    mutationFn: async ({ 
      appId, 
      appSettings = {},
      customNavigation = {}
    }: { 
      appId: string; 
      appSettings?: Record<string, any>;
      customNavigation?: Record<string, any>;
    }) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('Authentication required. Please log in and select an organization.');
      }

      // Check if already installed
      const { data: existing } = await supabase
        .from('marketplace_app_installations')
        .select('id, status')
        .eq('app_id', appId)
        .eq('organization_id', currentOrganization.id)
        .maybeSingle();

      if (existing?.status === 'active') {
        throw new Error('This app is already installed in your organization.');
      }

      // Get app details
      const { data: app, error: appError } = await supabase
        .from('marketplace_apps')
        .select('name, slug, navigation_config, required_permissions')
        .eq('id', appId)
        .eq('is_active', true)
        .maybeSingle();

      if (appError || !app) {
        throw new Error('App not found or no longer available.');
      }

      // Install or reactivate the app
      const installationData = {
        app_id: appId,
        organization_id: currentOrganization.id,
        installed_by: user.id,
        status: 'active' as const,
        app_settings: appSettings,
        custom_navigation: customNavigation,
        feature_flags: {},
        installed_at: new Date().toISOString(),
      };

      let installation;
      if (existing) {
        // Reactivate existing installation
        const { data, error } = await supabase
          .from('marketplace_app_installations')
          .update(installationData)
          .eq('id', existing.id)
          .select()
          .maybeSingle();
        
        if (error) throw error;
        if (!data) throw new Error('No data returned after reactivating installation');
        installation = data;
      } else {
        // Create new installation
        const { data, error } = await supabase
          .from('marketplace_app_installations')
          .insert(installationData)
          .select()
          .maybeSingle();
        
        if (error) throw error;
        if (!data) throw new Error('No data returned after creating installation');
        installation = data;
      }

      // Add to organization feature configs for navigation
      if (app.navigation_config && Object.keys(app.navigation_config).length > 0) {
        await supabase
          .from('organization_feature_configs')
          .upsert({
            organization_id: currentOrganization.id,
            feature_slug: app.slug,
            is_enabled: true,
            is_user_accessible: true,
            org_menu_order: 99,
            created_by: user.id,
            updated_at: new Date().toISOString(),
          });
      }

      return { installation, app };
    },
    onSuccess: ({ installation, app }, { appId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.installations() });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.apps() });
      queryClient.invalidateQueries({ queryKey: ['organization-feature-configs'] });

      // Track analytics in the background (without awaiting)
      void supabase
        .from('marketplace_app_analytics')
        .insert({
          app_id: appId,
          organization_id: currentOrganization!.id,
          user_id: user!.id,
          event_type: 'install',
          event_category: 'usage',
          event_data: {
            installation_id: installation.id,
            app_name: app.name,
            user_agent: navigator.userAgent,
            page_path: window.location.pathname,
            timestamp: new Date().toISOString(),
          },
        });

      toast({
        title: 'App Installed Successfully',
        description: `${app.name} is now available in your organization.`,
      });
    },
    onError: (error: Error) => {
      console.error('App installation failed:', error);
      toast({
        title: 'Installation Failed',
        description: error.message || 'Failed to install the app. Please try again.',
        variant: 'destructive',
      });
    },
    retry: 1,
  });
};

/**
 * Enhanced app uninstallation mutation
 */
export const useEnhancedUninstallApp = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useEnhancedAuth();
  const { currentOrganization } = useOrganizationData();

  return useMutation({
    mutationFn: async (appId: string) => {
      if (!user?.id || !currentOrganization?.id) {
        throw new Error('Authentication required');
      }

      // Get app details first
      const { data: app } = await supabase
        .from('marketplace_apps')
        .select('name, slug')
        .eq('id', appId)
        .maybeSingle();

      // Update installation status (don't delete for audit trail)
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

      // Remove from organization feature configs
      if (app?.slug) {
        await supabase
          .from('organization_feature_configs')
          .delete()
          .eq('organization_id', currentOrganization.id)
          .eq('feature_slug', app.slug);
      }

      return { appId, appName: app?.name || 'Unknown App' };
    },
    onSuccess: ({ appId, appName }) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.installations() });
      queryClient.invalidateQueries({ queryKey: ['organization-feature-configs'] });

      // Track analytics in the background (without awaiting)
      void supabase
        .from('marketplace_app_analytics')
        .insert({
          app_id: appId,
          organization_id: currentOrganization!.id,
          user_id: user!.id,
          event_type: 'uninstall',
          event_category: 'usage',
          event_data: {
            app_name: appName,
            user_agent: navigator.userAgent,
            page_path: window.location.pathname,
            timestamp: new Date().toISOString(),
          },
        });

      toast({
        title: 'App Uninstalled',
        description: `${appName} has been removed from your organization.`,
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

/**
 * Enhanced app usage tracking hook
 */
export const useTrackAppUsage = () => {
  const { user } = useEnhancedAuth();
  const { currentOrganization } = useOrganizationData();

  return useMutation({
    mutationFn: async ({ 
      appId, 
      eventType, 
      eventData = {} 
    }: { 
      appId: string; 
      eventType: 'page_view' | 'feature_use' | 'action' | 'error' | 'install' | 'uninstall';
      eventData?: Record<string, any>;
    }) => {
      if (!user?.id || !currentOrganization?.id) return;

      await supabase
        .from('marketplace_app_analytics')
        .insert({
          app_id: appId,
          organization_id: currentOrganization.id,
          user_id: user.id,
          event_type: eventType,
          event_category: 'usage',
          event_data: {
            ...eventData,
            user_agent: navigator.userAgent,
            page_path: window.location.pathname,
            timestamp: new Date().toISOString(),
          },
        });
    },
    onError: (error) => {
      // Silent failure for analytics - don't disrupt user experience
      console.warn('Failed to track app usage:', error);
    },
  });
};

/**
 * Enhanced app reviews hook with user profiles
 */
export const useEnhancedAppReviews = (appId: string) => {
  return useQuery({
    queryKey: marketplaceKeys.reviews(appId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_app_reviews')
        .select(`
          *,
          profiles!inner(full_name, avatar_url),
          organizations!inner(name)
        `)
        .eq('app_id', appId)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as AppReviewWithProfile[];
    },
    enabled: !!appId,
    staleTime: cacheConfig.semiStatic.staleTime,
    gcTime: cacheConfig.semiStatic.gcTime,
  });
};

/**
 * Marketplace settings hook
 */
export const useMarketplaceSettings = () => {
  return useQuery({
    queryKey: marketplaceKeys.settings(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .like('key', 'marketplace_%');

      if (error) throw error;

      // Convert array to key-value object
      const settings: Record<string, any> = {};
      data.forEach(({ key, value }) => {
        const settingKey = key.replace('marketplace_', '');
        settings[settingKey] = value;
      });

      return settings as MarketplaceSettings;
    },
    staleTime: cacheConfig.static.staleTime,
    gcTime: cacheConfig.static.gcTime,
  });
};

/**
 * Create marketplace app hook (Super Admin only)
 */
export const useCreateMarketplaceApp = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useEnhancedAuth();

  return useMutation({
    mutationFn: async (appData: Partial<MarketplaceApp>) => {
      // Check if user is super admin via profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profile?.is_super_admin) {
        throw new Error('Super admin access required');
      }

      // Remove non-database fields and ensure required fields
      const { app_category, ...cleanAppData } = appData;
      const insertData = {
        name: cleanAppData.name || 'New App',
        slug: cleanAppData.slug || 'new-app',
        description: cleanAppData.description || 'A new marketplace app',
        category: cleanAppData.category || 'other',
        icon_name: cleanAppData.icon_name || 'Package',
        version: cleanAppData.version || '1.0.0',
        pricing_model: cleanAppData.pricing_model || 'free' as const,
        currency: cleanAppData.currency || 'USD',
        compatibility_version: cleanAppData.compatibility_version || '1.0.0',
        ...cleanAppData,
      };

      const { data, error } = await supabase
        .from('marketplace_apps')
        .insert(insertData)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('No data returned after creating app');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.apps() });
      toast({
        title: 'App Created',
        description: 'The marketplace app has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create app. Please try again.',
        variant: 'destructive',
      });
    },
  });
};