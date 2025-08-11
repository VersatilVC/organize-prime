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
      // Mock data since table doesn't exist yet
      return [
        {
          id: '1',
          name: 'knowledge-base',
          display_name: 'Knowledge Base',
          slug: 'knowledge-base',
          description: 'AI-powered document search and knowledge management',
          category: 'business',
          icon_name: 'Package',
          color_hex: '#3b82f6',
          is_active: true,
          is_system_feature: true,
          sort_order: 0,
          navigation_config: {},
          required_tables: [],
          webhook_endpoints: {},
          setup_sql: null,
          cleanup_sql: null,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
    },
  });

  const createFeatureMutation = useMutation({
    mutationFn: async (featureData: Partial<SystemFeature>) => {
      // Mock implementation - simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newFeature: SystemFeature = {
        id: Math.random().toString(36).substr(2, 9),
        name: featureData.name || '',
        display_name: featureData.display_name || '',
        slug: featureData.slug || '',
        description: featureData.description || null,
        category: featureData.category || 'business',
        icon_name: featureData.icon_name || 'Package',
        color_hex: featureData.color_hex || '#3b82f6',
        is_active: true,
        is_system_feature: true,
        sort_order: 0,
        navigation_config: {},
        required_tables: [],
        webhook_endpoints: {},
        setup_sql: null,
        cleanup_sql: null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      return newFeature;
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
      // Mock implementation - simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-features'] });
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
      // Mock implementation - simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
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