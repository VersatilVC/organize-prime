import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface WebhookAssignment {
  id: string;
  organization_id: string;
  feature_slug: string;
  feature_page: string;
  button_position: string;
  webhook_id: string;
  button_data?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  webhook?: {
    id: string;
    name: string;
    webhook_url: string;
    is_active: boolean;
  };
}

/**
 * Hook for managing webhook assignments for a specific feature
 * Uses the actual webhook_button_assignments table in the database
 */
export function useFeatureWebhookAssignments(featureSlug: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  // Query for webhook assignments for this feature
  const {
    data: assignments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['feature-webhook-assignments', featureSlug, currentOrganization?.id],
    queryFn: async (): Promise<WebhookAssignment[]> => {
      if (!currentOrganization?.id || !featureSlug) return [];

      const { data, error } = await supabase
        .from('webhook_button_assignments')
        .select(`
          *,
          webhook:webhooks(
            id,
            name,
            webhook_url,
            is_active
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('feature_slug', featureSlug)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching webhook assignments:', error);
        throw new Error(`Failed to fetch webhook assignments: ${error.message}`);
      }

      return data as WebhookAssignment[];
    },
    enabled: !!currentOrganization?.id && !!featureSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create webhook assignment
  const createAssignmentMutation = useMutation({
    mutationFn: async (input: {
      feature_page: string;
      button_position: string;
      webhook_id: string;
      button_data?: any;
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('Organization ID is required');
      }

      const { data, error } = await supabase
        .from('webhook_button_assignments')
        .insert({
          organization_id: currentOrganization.id,
          feature_slug: featureSlug,
          feature_page: input.feature_page,
          button_position: input.button_position,
          webhook_id: input.webhook_id,
          button_data: input.button_data,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create webhook assignment: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['feature-webhook-assignments', featureSlug, currentOrganization?.id] 
      });
      toast({
        title: 'Webhook Assignment Created',
        description: 'Your webhook assignment has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create webhook assignment: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update webhook assignment
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, input }: { 
      id: string; 
      input: Partial<{
        feature_page: string;
        button_position: string;
        webhook_id: string;
        button_data: any;
        is_active: boolean;
      }>;
    }) => {
      const { data, error } = await supabase
        .from('webhook_button_assignments')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update webhook assignment: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['feature-webhook-assignments', featureSlug, currentOrganization?.id] 
      });
      toast({
        title: 'Webhook Assignment Updated',
        description: 'Your webhook assignment has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update webhook assignment: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete webhook assignment
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhook_button_assignments')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete webhook assignment: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['feature-webhook-assignments', featureSlug, currentOrganization?.id] 
      });
      toast({
        title: 'Webhook Assignment Deleted',
        description: 'Your webhook assignment has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete webhook assignment: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    assignments,
    
    // State
    isLoading,
    error,
    
    // Mutation states
    isCreating: createAssignmentMutation.isPending,
    isUpdating: updateAssignmentMutation.isPending,
    isDeleting: deleteAssignmentMutation.isPending,
    
    // Actions
    createAssignment: (input: {
      feature_page: string;
      button_position: string;
      webhook_id: string;
      button_data?: any;
    }) => createAssignmentMutation.mutate(input),
    
    updateAssignment: (id: string, input: Partial<{
      feature_page: string;
      button_position: string;
      webhook_id: string;
      button_data: any;
      is_active: boolean;
    }>) => updateAssignmentMutation.mutate({ id, input }),
    
    deleteAssignment: (id: string) => deleteAssignmentMutation.mutate(id),
  };
}