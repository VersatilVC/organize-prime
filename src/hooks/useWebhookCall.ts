import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { N8NWebhookService, WebhookCall } from '@/services/N8NWebhookService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUserData } from '@/contexts/AuthContext';
import { useOptimizedUserRole } from '@/hooks/database/useOptimizedUserRole';

/**
 * Hook for calling webhooks with automatic context injection
 */
export const useWebhookCall = (featureSlug: string, webhookName: string) => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useUserData();
  const { data: userRole } = useOptimizedUserRole();

  const callWebhook = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('User must be logged in with an organization');
      }

      const webhookCall: WebhookCall = {
        featureSlug,
        webhookName,
        payload,
        organizationContext: {
          organizationId: currentOrganization.id,
          userId: user.id,
          userRole: typeof userRole === 'string' ? userRole : userRole?.role || 'user'
        }
      };

      return N8NWebhookService.callWebhook(webhookCall);
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries based on the webhook
      queryClient.invalidateQueries({ 
        queryKey: [featureSlug, webhookName] 
      });

      // Show success notification
      toast.success('Operation completed successfully');
      
      console.log('Webhook execution successful:', {
        featureSlug,
        webhookName,
        payload: variables,
        response: data
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed';
      toast.error(`Operation failed: ${errorMessage}`);
      
      console.error('Webhook execution failed:', {
        featureSlug,
        webhookName,
        error: errorMessage
      });
    }
  });

  return { 
    callWebhook: callWebhook.mutate,
    callWebhookAsync: callWebhook.mutateAsync,
    isLoading: callWebhook.isPending,
    error: callWebhook.error,
    data: callWebhook.data,
    reset: callWebhook.reset
  };
};

/**
 * Hook for testing webhook connections
 */
export const useWebhookTest = () => {
  const testWebhook = useMutation({
    mutationFn: async (webhookId: string) => {
      return N8NWebhookService.testWebhook(webhookId);
    },
    onSuccess: () => {
      toast.success('Webhook test successful');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Webhook test failed';
      toast.error(`Webhook test failed: ${errorMessage}`);
    }
  });

  return {
    testWebhook: testWebhook.mutate,
    testWebhookAsync: testWebhook.mutateAsync,
    isTesting: testWebhook.isPending,
    error: testWebhook.error,
    reset: testWebhook.reset
  };
};

/**
 * Hook for batch webhook operations
 */
export const useBatchWebhookCall = (featureSlug: string) => {
  const { currentOrganization } = useOrganization();
  const { user } = useUserData();
  const { data: userRole } = useOptimizedUserRole();

  const batchCall = useMutation({
    mutationFn: async (calls: Array<{ webhookName: string; payload: Record<string, any> }>) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('User must be logged in with an organization');
      }

      const results = [];
      const errors = [];

      for (const call of calls) {
        try {
          const webhookCall: WebhookCall = {
            featureSlug,
            webhookName: call.webhookName,
            payload: call.payload,
            organizationContext: {
              organizationId: currentOrganization.id,
              userId: user.id,
              userRole: typeof userRole === 'string' ? userRole : userRole?.role || 'user'
            }
          };

          const result = await N8NWebhookService.callWebhook(webhookCall);
          results.push({ webhookName: call.webhookName, success: true, data: result });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ webhookName: call.webhookName, error: errorMessage });
          results.push({ webhookName: call.webhookName, success: false, error: errorMessage });
        }
      }

      if (errors.length > 0) {
        console.warn('Some webhook calls failed:', errors);
      }

      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (failed === 0) {
        toast.success(`All ${successful} webhook operations completed successfully`);
      } else {
        toast.warning(`${successful} operations succeeded, ${failed} failed`);
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Batch operation failed';
      toast.error(`Batch operation failed: ${errorMessage}`);
    }
  });

  return {
    batchCall: batchCall.mutate,
    batchCallAsync: batchCall.mutateAsync,
    isLoading: batchCall.isPending,
    error: batchCall.error,
    data: batchCall.data,
    reset: batchCall.reset
  };
};