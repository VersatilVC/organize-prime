import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface OrganizationFeatureConfig {
  id: string;
  organization_id: string;
  feature_slug: string;
  is_enabled: boolean;
  is_user_accessible: boolean;
  org_menu_order: number;
  created_at: string;
  updated_at: string;
}

async function fetchOrganizationFeatureConfigs(organizationId: string): Promise<OrganizationFeatureConfig[]> {
  const { data, error } = await supabase
    .from('organization_feature_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('org_menu_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch organization feature configs: ${error.message}`);
  }

  return data || [];
}

async function createOrUpdateOrganizationFeatureConfig(
  organizationId: string,
  featureSlug: string,
  config: Partial<Omit<OrganizationFeatureConfig, 'id' | 'organization_id' | 'feature_slug' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from('organization_feature_configs')
    .upsert({
      organization_id: organizationId,
      feature_slug: featureSlug,
      ...config,
      created_by: user?.id,
      updated_by: user?.id,
    }, {
      onConflict: 'organization_id,feature_slug'
    });

  if (error) {
    throw new Error(`Failed to update organization feature config: ${error.message}`);
  }
}

async function bulkUpdateOrganizationFeatureConfigs(
  configs: Array<{ id: string; org_menu_order: number }>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  for (const config of configs) {
    const { error } = await supabase
      .from('organization_feature_configs')
      .update({
        org_menu_order: config.org_menu_order,
        updated_by: user?.id,
      })
      .eq('id', config.id);

    if (error) {
      throw new Error(`Failed to update menu order: ${error.message}`);
    }
  }
}

async function getUserFeatureAccess(organizationId: string, userId: string): Promise<Array<{
  user_id: string;
  feature_slug: string;
  is_enabled: boolean;
}>> {
  const { data, error } = await supabase
    .from('user_feature_access')
    .select('user_id, feature_slug, is_enabled')
    .eq('organization_id', organizationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to fetch user feature access: ${error.message}`);
  }

  return data || [];
}

async function updateUserFeatureAccess(
  userId: string,
  organizationId: string,
  featureSlug: string,
  isEnabled: boolean
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from('user_feature_access')
    .upsert({
      user_id: userId,
      organization_id: organizationId,
      feature_slug: featureSlug,
      is_enabled: isEnabled,
      created_by: user?.id,
    }, {
      onConflict: 'user_id,organization_id,feature_slug'
    });

  if (error) {
    throw new Error(`Failed to update user feature access: ${error.message}`);
  }
}

export function useOrganizationFeatureConfigs() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const queryKey = ['organization-feature-configs', currentOrganization?.id];

  const { data: configs, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchOrganizationFeatureConfigs(currentOrganization?.id || ''),
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: ({ featureSlug, config }: { 
      featureSlug: string; 
      config: Partial<OrganizationFeatureConfig> 
    }) =>
      createOrUpdateOrganizationFeatureConfig(currentOrganization?.id || '', featureSlug, config),
    onSuccess: () => {
      toast({ title: 'Feature configuration updated successfully' });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update feature configuration',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: bulkUpdateOrganizationFeatureConfigs,
    onSuccess: () => {
      toast({ title: 'Menu order updated successfully' });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update menu order',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  const userAccessMutation = useMutation({
    mutationFn: ({ userId, featureSlug, isEnabled }: {
      userId: string;
      featureSlug: string;
      isEnabled: boolean;
    }) =>
      updateUserFeatureAccess(userId, currentOrganization?.id || '', featureSlug, isEnabled),
    onSuccess: () => {
      toast({ title: 'User feature access updated successfully' });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['user-feature-access'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update user feature access',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  return {
    configs: configs || [],
    isLoading,
    error,
    updateConfig: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateMenuOrder: bulkUpdateMutation.mutate,
    isUpdatingOrder: bulkUpdateMutation.isPending,
    updateUserAccess: userAccessMutation.mutate,
    isUpdatingUserAccess: userAccessMutation.isPending,
  };
}