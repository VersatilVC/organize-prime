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
      // Mock implementation - simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newWebhook: FeatureWebhook = {
        id: Math.random().toString(36).substr(2, 9),
        feature_id: webhookData.feature_id || null,
        name: webhookData.name || '',
        description: webhookData.description || null,
        endpoint_url: webhookData.endpoint_url || '',
        method: webhookData.method || 'POST',
        headers: webhookData.headers || {},
        timeout_seconds: webhookData.timeout_seconds || 30,
        retry_attempts: webhookData.retry_attempts || 3,
        is_active: true,
        last_tested_at: null,
        test_status: null,
        test_response: null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      return newWebhook;
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
      // Mock implementation - simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { id, ...updates };
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
      // Mock implementation - simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
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
      // Mock implementation - simulate webhook test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random success/failure
      const success = Math.random() > 0.3;
      
      if (!success) {
        throw new Error('Webhook test failed');
      }
      
      return { 
        success: true, 
        response: JSON.stringify({ 
          status: 200, 
          message: 'OK',
          timestamp: new Date().toISOString()
        })
      };
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