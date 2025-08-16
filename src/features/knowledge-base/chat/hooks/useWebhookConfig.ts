import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatWebhookService } from '../services/ChatWebhookService';
import { useToast } from '@/hooks/use-toast';

export const webhookConfigKeys = {
  all: ['webhook-config'] as const,
  chat: () => [...webhookConfigKeys.all, 'kb-chat-processing'] as const,
};

/**
 * Hook for managing webhook configuration
 */
export function useWebhookConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get webhook configuration
  const configQuery = useQuery({
    queryKey: webhookConfigKeys.chat(),
    queryFn: () => ChatWebhookService.getWebhookConfig(),
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });

  // Test webhook connection
  const testWebhookMutation = useMutation({
    mutationFn: () => ChatWebhookService.testWebhookConnection(),
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Webhook Test Successful',
          description: `Connection established in ${result.responseTime}ms`,
        });
      } else {
        toast({
          title: 'Webhook Test Failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Test Error',
        description: error instanceof Error ? error.message : 'Test failed',
        variant: 'destructive',
      });
    },
  });

  // Update webhook configuration
  const updateConfigMutation = useMutation({
    mutationFn: (updates: any) => ChatWebhookService.updateWebhookConfig(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookConfigKeys.chat() });
      toast({
        title: 'Configuration Updated',
        description: 'Webhook settings have been saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update configuration',
        variant: 'destructive',
      });
    },
  });

  // Get webhook status
  const getWebhookStatus = () => {
    if (!configQuery.data) return 'unknown';
    if (!configQuery.data.is_active) return 'disabled';
    return 'active';
  };

  // Check if webhook is properly configured
  const isWebhookConfigured = () => {
    return !!(configQuery.data?.endpoint_url || configQuery.data?.id);
  };

  return {
    // Data
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    error: configQuery.error,
    
    // Status helpers
    status: getWebhookStatus(),
    isConfigured: isWebhookConfigured(),
    
    // Actions
    testWebhook: testWebhookMutation.mutateAsync,
    updateConfig: updateConfigMutation.mutateAsync,
    
    // Loading states
    isTesting: testWebhookMutation.isPending,
    isUpdating: updateConfigMutation.isPending,
    
    // Refetch
    refetch: configQuery.refetch,
  };
}

/**
 * Hook for webhook monitoring and logs (future enhancement)
 */
export function useWebhookLogs(webhookId?: string) {
  // This could be expanded to fetch webhook execution logs
  // for monitoring and debugging purposes
  
  return {
    logs: [],
    isLoading: false,
    error: null,
  };
}

/**
 * Hook for webhook metrics (future enhancement)
 */
export function useWebhookMetrics() {
  // This could be expanded to provide webhook performance metrics
  // like success rate, average response time, error rates, etc.
  
  return {
    successRate: 0,
    averageResponseTime: 0,
    totalRequests: 0,
    errorRate: 0,
    isLoading: false,
  };
}