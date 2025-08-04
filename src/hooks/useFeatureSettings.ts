import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureSettingsData {
  [key: string]: any;
}

async function fetchFeatureSettings(featureSlug: string, organizationId?: string): Promise<FeatureSettingsData> {
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  const { data, error } = await supabase
    .from('organization_settings')
    .select('key, value')
    .eq('organization_id', organizationId)
    .like('key', `feature_${featureSlug}_%`);

  if (error) {
    throw new Error(`Failed to fetch feature settings: ${error.message}`);
  }

  // Transform the data into a flat object
  const settings: FeatureSettingsData = {};
  data?.forEach(({ key, value }) => {
    // Remove the feature prefix to get the setting key
    const settingKey = key.replace(`feature_${featureSlug}_`, '');
    // Handle the JSON structure - value might be wrapped in a value property
    const settingValue = value && typeof value === 'object' && 'value' in value 
      ? (value as any).value 
      : value;
    settings[settingKey] = settingValue;
  });

  return settings;
}

async function updateFeatureSettings(
  featureSlug: string, 
  organizationId: string, 
  newSettings: FeatureSettingsData
): Promise<void> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  const settingsArray = Object.entries(newSettings).map(([key, value]) => ({
    organization_id: organizationId,
    key: `feature_${featureSlug}_${key}`,
    value: { value },
    category: `feature_${featureSlug}`,
    updated_by: user?.id
  }));

  // Use upsert to insert or update settings
  const { error } = await supabase
    .from('organization_settings')
    .upsert(settingsArray, {
      onConflict: 'organization_id,key',
      ignoreDuplicates: false
    });

  if (error) {
    throw new Error(`Failed to update feature settings: ${error.message}`);
  }
}

async function resetFeatureSettings(featureSlug: string, organizationId: string): Promise<void> {
  const { error } = await supabase
    .from('organization_settings')
    .delete()
    .eq('organization_id', organizationId)
    .like('key', `feature_${featureSlug}_%`);

  if (error) {
    throw new Error(`Failed to reset feature settings: ${error.message}`);
  }
}

export function useFeatureSettings(featureSlug: string) {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['feature-settings', featureSlug, currentOrganization?.id];

  const { data: settings, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchFeatureSettings(featureSlug, currentOrganization?.id),
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const updateMutation = useMutation({
    mutationFn: (newSettings: FeatureSettingsData) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return updateFeatureSettings(featureSlug, currentOrganization.id, newSettings);
    },
    onMutate: async (newSettings) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old: FeatureSettingsData | undefined) => ({
        ...old,
        ...newSettings,
      }));

      // Return a context object with the snapshotted value
      return { previousSettings };
    },
    onError: (error, newSettings, context) => {
      // Rollback to the previous value
      if (context?.previousSettings) {
        queryClient.setQueryData(queryKey, context.previousSettings);
      }
      
      toast({
        title: 'Failed to save settings',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Settings saved successfully',
        description: 'Your feature settings have been updated.',
      });
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return resetFeatureSettings(featureSlug, currentOrganization.id);
    },
    onSuccess: () => {
      toast({
        title: 'Settings reset successfully',
        description: 'Your feature settings have been reset to defaults.',
      });
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast({
        title: 'Failed to reset settings',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  return {
    settings: settings || {},
    isLoading,
    error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    resetSettings: resetMutation.mutate,
    isResetting: resetMutation.isPending,
  };
}