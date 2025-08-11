import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import type { FeatureWebhook } from '@/types/features';

export function useFeatureWebhooks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: webhooks = [], isLoading, error } = useQuery({
    queryKey: ['feature-webhooks'],
    queryFn: async (): Promise<FeatureWebhook[]> => {
      // Mock data since table doesn't exist yet
      return [];
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (webhookData: Partial<FeatureWebhook>) => {
      const { data, error } = await supabase
        .from('feature_webhooks')
        .insert([webhookData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-webhooks'] });
      toast({
        title: 'Success',
        description: 'Webhook created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create webhook',
        variant: 'destructive',
      });
      console.error('Create webhook error:', error);
    },
  });

  const updateWebhookMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FeatureWebhook> }) => {
      const { data, error } = await supabase
        .from('feature_webhooks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-webhooks'] });
      toast({
        title: 'Success',
        description: 'Webhook updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update webhook',
        variant: 'destructive',
      });
      console.error('Update webhook error:', error);
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feature_webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-webhooks'] });
      toast({
        title: 'Success',
        description: 'Webhook deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete webhook',
        variant: 'destructive',
      });
      console.error('Delete webhook error:', error);
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      // Implementation for testing webhook
      const response = await fetch('/api/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId: id }),
      });

      if (!response.ok) throw new Error('Test failed');
      return response.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['feature-webhooks'] });
      toast({
        title: 'Test Successful',
        description: 'Webhook endpoint responded successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Test Failed',
        description: 'Webhook test failed',
        variant: 'destructive',
      });
      console.error('Test webhook error:', error);
    },
  });

  return {
    webhooks,
    isLoading,
    error,
    createWebhook: createWebhookMutation.mutate,
    updateWebhook: updateWebhookMutation.mutate,
    deleteWebhook: deleteWebhookMutation.mutate,
    testWebhook: testWebhookMutation.mutate,
    isCreating: createWebhookMutation.isPending,
    isUpdating: updateWebhookMutation.isPending,
    isDeleting: deleteWebhookMutation.isPending,
    isTesting: testWebhookMutation.isPending,
  };
}