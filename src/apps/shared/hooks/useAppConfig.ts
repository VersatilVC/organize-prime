import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppConfiguration, AppConfigurationError } from '../types/AppTypes';
import { AppConfigService } from '../services/AppConfigService';
import { AppAnalyticsService } from '../services/AppAnalyticsService';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { useAuth } from '@/lib/auth-migration';
import { useToast } from '@/hooks/use-toast';

export interface UseAppConfigOptions {
  appId: string;
  autoTrackUsage?: boolean;
}

export interface UseAppConfigReturn {
  configuration: AppConfiguration | null;
  isLoading: boolean;
  error: AppConfigurationError | null;
  updateConfiguration: (updates: Partial<AppConfiguration>) => Promise<void>;
  reloadConfiguration: () => void;
  isInstalled: boolean;
  validateSettings: (settings: Record<string, any>, schema: any) => { valid: boolean; errors: string[] };
}

export function useAppConfig({ appId, autoTrackUsage = true }: UseAppConfigOptions): UseAppConfigReturn {
  const { currentOrganization } = useOrganizationData();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastUsageTracked, setLastUsageTracked] = useState<number>(0);

  const organizationId = currentOrganization?.id;

  // Query for app configuration
  const {
    data: configuration,
    isLoading,
    error,
    refetch: reloadConfiguration
  } = useQuery({
    queryKey: ['app-config', appId, organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      return AppConfigService.getAppConfiguration(appId, organizationId);
    },
    enabled: !!appId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry if app is not installed
      if (error instanceof AppConfigurationError) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Mutation for updating configuration
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<AppConfiguration>) => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      return AppConfigService.updateAppConfiguration(appId, organizationId, updates);
    },
    onSuccess: (updatedConfig) => {
      // Update query cache
      queryClient.setQueryData(['app-config', appId, organizationId], updatedConfig);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['app-installations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-feature-configs'] });

      toast({
        title: 'Configuration Updated',
        description: 'App configuration has been saved successfully.',
      });
    },
    onError: (error: AppConfigurationError) => {
      toast({
        title: 'Configuration Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Track app usage periodically
  useEffect(() => {
    if (!autoTrackUsage || !configuration || !user || !organizationId) {
      return;
    }

    const now = Date.now();
    const oneMinute = 60 * 1000;

    // Track usage every minute (throttled)
    if (now - lastUsageTracked > oneMinute) {
      AppAnalyticsService.trackEvent(
        appId,
        organizationId,
        user.id,
        'app_usage',
        'engagement'
      );
      
      // Update last used timestamp
      AppConfigService.updateLastUsed(appId, organizationId);
      
      setLastUsageTracked(now);
    }
  }, [appId, organizationId, user, configuration, autoTrackUsage, lastUsageTracked]);

  // Update configuration function
  const updateConfiguration = useCallback(async (updates: Partial<AppConfiguration>) => {
    await updateMutation.mutateAsync(updates);
  }, [updateMutation]);

  // Validate settings function
  const validateSettings = useCallback((settings: Record<string, any>, schema: any) => {
    return AppConfigService.validateSettings(settings, schema);
  }, []);

  return {
    configuration,
    isLoading,
    error: error as AppConfigurationError | null,
    updateConfiguration,
    reloadConfiguration,
    isInstalled: !!configuration && configuration.status === 'active',
    validateSettings,
  };
}

// Hook for checking if multiple apps are installed
export function useInstalledApps() {
  const { currentOrganization } = useOrganizationData();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['installed-apps', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      return AppConfigService.getInstalledApps(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook for checking if a specific app is installed
export function useAppInstallationStatus(appId: string) {
  const { currentOrganization } = useOrganizationData();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['app-installation-status', appId, organizationId],
    queryFn: async () => {
      if (!organizationId || !appId) {
        return false;
      }
      return AppConfigService.isAppInstalled(appId, organizationId);
    },
    enabled: !!appId && !!organizationId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}