import { useMutation } from '@tanstack/react-query';
import { useWebhooks } from './useWebhooks';
import { UnifiedWebhookService } from '@/services/UnifiedWebhookService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for triggering webhooks by name or checking webhook availability
 * Used by WebhookTriggerButton for legacy name-based webhook triggering
 */
export function useWebhookTrigger() {
  const { webhooks, isLoading } = useWebhooks();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if a webhook exists by name
  const hasWebhook = (webhookName: string): boolean => {
    return webhooks.some(webhook => 
      webhook.name === webhookName && 
      webhook.is_active
    );
  };

  // Get webhook by name
  const getWebhookByName = (webhookName: string) => {
    return webhooks.find(webhook => 
      webhook.name === webhookName && 
      webhook.is_active
    );
  };

  // Trigger webhook mutation
  const triggerMutation = useMutation({
    mutationFn: async ({ 
      webhookName, 
      payload, 
      context 
    }: { 
      webhookName: string; 
      payload: Record<string, any>; 
      context?: Record<string, any>;
    }) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('Missing organization or user context');
      }

      const webhook = getWebhookByName(webhookName);
      if (!webhook) {
        throw new Error(`Webhook '${webhookName}' not found or inactive`);
      }

      // Build trigger context
      const triggerContext = {
        event_type: 'manual_trigger',
        organization_id: currentOrganization.id,
        user_id: user.id,
        webhook_name: webhookName,
        triggered_at: new Date().toISOString(),
        user_triggered: true,
        ...payload,
        context: {
          ...context,
          trigger_method: 'name_based'
        }
      };

      // Use the unified service to trigger the webhook by ID
      const result = await UnifiedWebhookService.triggerWebhook(webhook.id, triggerContext);
      
      return {
        success: result.success,
        data: result.data,
        error: result.error,
        message: result.message || (result.success ? 'Webhook triggered successfully' : 'Webhook failed')
      };
    },
    onError: (error: Error) => {
      console.error('Webhook trigger failed:', error);
    },
  });

  // Convenience method for triggering webhooks
  const triggerWebhook = async (
    webhookName: string, 
    payload: Record<string, any> = {}, 
    context?: Record<string, any>
  ) => {
    return triggerMutation.mutateAsync({ webhookName, payload, context });
  };

  return {
    // Core methods needed by WebhookTriggerButton
    triggerWebhook,
    hasWebhook,
    isLoading,

    // Additional utilities
    getWebhookByName,
    
    // Mutation state
    isTriggering: triggerMutation.isPending,
    triggerError: triggerMutation.error,
    
    // Raw mutation for advanced usage
    triggerMutation,
  };
}