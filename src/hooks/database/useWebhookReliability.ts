import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WebhookConnectionHealth {
  organization_id: string;
  trigger_name: string;
  consecutive_failures: number;
  connection_status: 'healthy' | 'degraded' | 'down';
  last_successful_delivery: string | null;
  updated_at: string;
  organizations?: {
    name: string;
  };
}

export interface WebhookDeliveryStats {
  organization_id: string;
  organization_name: string;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  pending_deliveries: number;
  success_rate: number;
  avg_retry_count: number;
}

export interface WebhookHealthData {
  connectionHealth: WebhookConnectionHealth[];
  pendingDeliveries: number;
  deliveryStats: WebhookDeliveryStats[];
}

/**
 * Hook for fetching webhook reliability data
 */
export function useWebhookReliability() {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['webhook-reliability'],
    queryFn: async (): Promise<WebhookHealthData> => {
      const { data, error } = await supabase.functions.invoke('webhook-reliability-monitor', {
        method: 'GET'
      });

      if (error) {
        console.error('Failed to fetch webhook reliability data:', error);
        throw new Error('Failed to fetch webhook reliability data');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch webhook reliability data');
      }

      return data.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    onError: (error) => {
      console.error('Webhook reliability query error:', error);
    }
  });
}

/**
 * Hook for webhook management actions
 */
export function useWebhookActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      delivery_id, 
      status, 
      error_message 
    }: { 
      delivery_id: string; 
      status: string; 
      error_message?: string; 
    }) => {
      const { data, error } = await supabase.functions.invoke('webhook-reliability-monitor', {
        method: 'POST',
        body: {
          action: 'update_status',
          delivery_id,
          status,
          error_message
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to update webhook status');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-reliability'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update webhook status',
        variant: 'destructive'
      });
      console.error('Update webhook status error:', error);
    }
  });

  const retryFailedMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('webhook-reliability-monitor', {
        method: 'POST',
        body: {
          action: 'retry_failed'
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to retry webhooks');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhook-reliability'] });
      toast({
        title: 'Success',
        description: data.message || 'Webhook retry completed',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to retry webhooks',
        variant: 'destructive'
      });
      console.error('Retry webhooks error:', error);
    }
  });

  return {
    updateStatus: updateStatusMutation.mutate,
    retryFailed: retryFailedMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    isRetrying: retryFailedMutation.isPending
  };
}

/**
 * Hook for webhook delivery logs
 */
export function useWebhookDeliveryLogs(organizationId?: string) {
  return useQuery({
    queryKey: ['webhook-delivery-logs', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('webhook_delivery_log')
        .select(`
          id,
          trigger_name,
          table_name,
          record_id,
          delivery_status,
          retry_count,
          max_retries,
          error_message,
          created_at,
          delivered_at,
          last_retry_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch webhook delivery logs:', error);
        throw new Error('Failed to fetch webhook delivery logs');
      }

      return data;
    },
    enabled: true,
    staleTime: 30 * 1000 // 30 seconds
  });
}