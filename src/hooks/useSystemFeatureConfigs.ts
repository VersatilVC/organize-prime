import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemFeatureConfig {
  id: string;
  feature_slug: string;
  is_enabled_globally: boolean;
  is_marketplace_visible: boolean;
  system_menu_order: number;
  created_at: string;
  updated_at: string;
}

async function fetchSystemFeatureConfigs(): Promise<SystemFeatureConfig[]> {
  const { data, error } = await supabase
    .from('system_feature_configs')
    .select('id, feature_slug, is_enabled_globally, is_marketplace_visible, system_menu_order, created_at, updated_at')
    .order('system_menu_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch system feature configs: ${error.message}`);
  }

  return data || [];
}

async function updateSystemFeatureConfig(
  id: string,
  updates: Partial<Omit<SystemFeatureConfig, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from('system_feature_configs')
    .update({
      ...updates,
      updated_by: user?.id,
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update system feature config: ${error.message}`);
  }
}

async function bulkUpdateSystemFeatureConfigs(
  configs: Array<{ id: string; system_menu_order: number }>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const updates = configs.map(config => ({
    id: config.id,
    system_menu_order: config.system_menu_order,
    updated_by: user?.id,
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('system_feature_configs')
      .update(update)
      .eq('id', update.id);

    if (error) {
      throw new Error(`Failed to update menu order: ${error.message}`);
    }
  }
}

export function useSystemFeatureConfigs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ['system-feature-configs'];

  const { data: configs, isLoading, error } = useQuery({
    queryKey,
    queryFn: fetchSystemFeatureConfigs,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SystemFeatureConfig> }) =>
      updateSystemFeatureConfig(id, updates),
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
    mutationFn: bulkUpdateSystemFeatureConfigs,
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

  return {
    configs: configs || [],
    isLoading,
    error,
    updateConfig: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateMenuOrder: bulkUpdateMutation.mutate,
    isUpdatingOrder: bulkUpdateMutation.isPending,
  };
}