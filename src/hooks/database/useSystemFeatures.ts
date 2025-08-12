import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SystemFeature } from '@/types/features';

export function useSystemFeatures() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: features = [], isLoading, error } = useQuery({
    queryKey: ['system-features'],
    queryFn: async (): Promise<SystemFeature[]> => {
      const { data, error } = await supabase
        .from('system_feature_configs')
        .select('*')
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
  });

  const createFeatureMutation = useMutation({
    mutationFn: async (featureData: Partial<SystemFeature>) => {
      const { data, error } = await supabase
        .from('system_feature_configs')
        .insert({
          feature_slug: featureData.slug || featureData.name || '',
          is_enabled_globally: featureData.is_active ?? true,
          is_marketplace_visible: true,
          system_menu_order: featureData.sort_order ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-features'] });
      toast({
        title: 'Success',
        description: 'Feature created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create feature',
        variant: 'destructive',
      });
      console.error('Create feature error:', error);
    },
  });

  const updateFeatureMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SystemFeature> }) => {
      const { error } = await supabase
        .from('system_feature_configs')
        .update({
          is_enabled_globally: updates.is_active,
          system_menu_order: updates.sort_order,
        })
        .eq('id', id);

      if (error) throw error;
      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-features'] });
      queryClient.invalidateQueries({ queryKey: ['organization-features'] });
      toast({
        title: 'Success',
        description: 'Feature updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update feature',
        variant: 'destructive',
      });
      console.error('Update feature error:', error);
    },
  });

  const deleteFeatureMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('system_feature_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-features'] });
      toast({
        title: 'Success',
        description: 'Feature deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete feature',
        variant: 'destructive',
      });
      console.error('Delete feature error:', error);
    },
  });

  return {
    features,
    isLoading,
    error,
    createFeature: createFeatureMutation.mutate,
    updateFeature: updateFeatureMutation.mutate,
    deleteFeature: deleteFeatureMutation.mutate,
    isCreating: createFeatureMutation.isPending,
    isUpdating: updateFeatureMutation.isPending,
    isDeleting: deleteFeatureMutation.isPending,
  };
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