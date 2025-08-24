import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';
import type { Webhook, WebhookInput, WebhookTestResult } from '@/types/webhook';

const WEBHOOKS_QUERY_KEY = 'webhooks';

/**
 * Simple, unified webhook management hook
 * Provides CRUD operations and testing functionality
 */
export function useWebhooks() {
  const { currentOrganization } = useOrganizationData();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const organizationId = currentOrganization?.id;

  // Query for fetching webhooks
  const {
    data: webhooks = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [WEBHOOKS_QUERY_KEY, organizationId],
    queryFn: async (): Promise<Webhook[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch webhooks: ${error.message}`);
      }

      return data as Webhook[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: async (input: WebhookInput): Promise<Webhook> => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const { data, error } = await supabase
        .from('webhooks')
        .insert({
          organization_id: organizationId,
          ...input,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create webhook: ${error.message}`);
      }

      return data as Webhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WEBHOOKS_QUERY_KEY, organizationId] });
      toast({
        title: 'Webhook Created',
        description: 'Your webhook has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create webhook: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update webhook mutation
  const updateWebhookMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<WebhookInput> }): Promise<Webhook> => {
      const { data, error } = await supabase
        .from('webhooks')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update webhook: ${error.message}`);
      }

      return data as Webhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WEBHOOKS_QUERY_KEY, organizationId] });
      toast({
        title: 'Webhook Updated',
        description: 'Your webhook has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update webhook: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete webhook mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete webhook: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WEBHOOKS_QUERY_KEY, organizationId] });
      toast({
        title: 'Webhook Deleted',
        description: 'Your webhook has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete webhook: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Test webhook mutation
  const testWebhookMutation = useMutation({
    mutationFn: async ({ id, payload = {} }: { id: string; payload?: Record<string, any> }): Promise<WebhookTestResult> => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      // Get webhook details
      const webhook = webhooks.find(w => w.id === id);
      if (!webhook) {
        throw new Error('Webhook not found');
      }

      console.log('🧪 Testing webhook:', webhook.webhook_url);

      let testResult: WebhookTestResult;
      
      try {
        // Test via secure Edge Function
        const { data, error } = await supabase.functions.invoke('exec-n8n-webhook', {
          body: {
            webhookUrl: webhook.webhook_url,
            method: webhook.http_method,
            payload: { 
              test: true,
              timestamp: new Date().toISOString(),
              ...webhook.payload_template, 
              ...payload 
            },
            organizationId: organizationId,
            webhookId: id,
          },
        });

        console.log('🔍 Edge Function response:', { data, error });

        if (error) {
          console.error('❌ Edge Function error:', error);
          testResult = {
            success: false,
            error_message: error.message || 'Edge Function error',
          };
        } else if (data && data.success) {
          console.log('✅ Webhook succeeded');
          testResult = {
            success: true,
            status_code: data.status,
            response_data: data.data,
          };
        } else {
          console.error('❌ Webhook failed:', data);
          testResult = {
            success: false,
            status_code: data?.status,
            error_message: data?.error || 'Webhook failed',
          };
        }
      } catch (fetchError: any) {
        console.error('❌ Webhook test error:', fetchError);
        testResult = {
          success: false,
          error_message: fetchError.message || 'Network error',
        };
      }

      // Update webhook test status in database
      try {
        await supabase
          .from('webhooks')
          .update({
            last_tested_at: new Date().toISOString(),
            last_test_status: testResult.success ? 'success' : 'failure',
            last_error_message: testResult.success ? null : testResult.error_message,
          })
          .eq('id', id);
      } catch (dbError) {
        console.warn('⚠️ Failed to update webhook test status:', dbError);
      }

      return testResult;
    },
    onSuccess: (result, { id }) => {
      queryClient.invalidateQueries({ queryKey: [WEBHOOKS_QUERY_KEY, organizationId] });
      
      if (result.success) {
        toast({
          title: 'Webhook Test Successful',
          description: `Webhook responded with status ${result.status_code}`,
        });
      } else {
        toast({
          title: 'Webhook Test Failed',
          description: result.error_message || 'Unknown error occurred',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Test Failed',
        description: `Failed to test webhook: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Convenience methods
  const createWebhook = useCallback(
    (input: WebhookInput) => createWebhookMutation.mutate(input),
    [createWebhookMutation]
  );

  const updateWebhook = useCallback(
    (id: string, input: Partial<WebhookInput>) => updateWebhookMutation.mutate({ id, input }),
    [updateWebhookMutation]
  );

  const deleteWebhook = useCallback(
    (id: string) => deleteWebhookMutation.mutate(id),
    [deleteWebhookMutation]
  );

  const testWebhook = useCallback(
    (id: string, payload?: Record<string, any>) => testWebhookMutation.mutate({ id, payload }),
    [testWebhookMutation]
  );

  return {
    // Data
    webhooks,
    
    // State
    isLoading,
    error,
    
    // Mutation states
    isCreating: createWebhookMutation.isPending,
    isUpdating: updateWebhookMutation.isPending,
    isDeleting: deleteWebhookMutation.isPending,
    isTesting: testWebhookMutation.isPending,
    
    // Actions
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    
    // Raw mutations for advanced usage
    createWebhookMutation,
    updateWebhookMutation,
    deleteWebhookMutation,
    testWebhookMutation,
  };
}