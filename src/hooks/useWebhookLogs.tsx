import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';

export interface WebhookLog {
  id: string;
  webhook_id: string;
  webhook_name?: string;
  feature_name?: string;
  event_type: string;
  status: 'success' | 'failed' | 'timeout';
  status_code?: number;
  response_time_ms: number;
  error_message?: string;
  payload_size: number;
  triggered_at: string;
  retry_count: number;
  is_test?: boolean;
  organization_id?: string;
  user_id?: string;
}

export interface WebhookLogFilters {
  webhook_id?: string;
  status?: 'success' | 'failed' | 'timeout' | 'all';
  event_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export function useWebhookLogs(filters: WebhookLogFilters = {}, enabled = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Build the query based on filters
  const buildQuery = () => {
    let query = supabase
      .from('webhook_logs')
      .select(`
        *,
        feature_webhooks!webhook_logs_webhook_id_fkey(
          name,
          features!feature_webhooks_feature_id_fkey(
            name
          )
        )
      `);

    // Apply filters
    if (filters.webhook_id) {
      query = query.eq('webhook_id', filters.webhook_id);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type);
    }

    if (filters.date_from) {
      query = query.gte('triggered_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('triggered_at', filters.date_to);
    }

    // Apply pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    return query
      .order('triggered_at', { ascending: false })
      .range(offset, offset + limit - 1);
  };

  // Fetch webhook logs with filters
  const logsQuery = useQuery({
    queryKey: ['webhook-logs', filters],
    queryFn: async (): Promise<WebhookLog[]> => {
      const { data, error } = await buildQuery();

      if (error) throw error;

      return data?.map(log => ({
        ...log,
        webhook_name: log.feature_webhooks?.name || 'Unknown Webhook',
        feature_name: log.feature_webhooks?.features?.name || 'Unknown Feature'
      })) || [];
    },
    enabled: enabled && !!user,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Fetch logs for a specific webhook
  const useLogsByWebhook = (webhookId: string) => {
    return useQuery({
      queryKey: ['webhook-logs', 'webhook', webhookId],
      queryFn: async (): Promise<WebhookLog[]> => {
        const { data, error } = await supabase
          .from('webhook_logs')
          .select(`
            *,
            feature_webhooks!webhook_logs_webhook_id_fkey(
              name,
              features!feature_webhooks_feature_id_fkey(
                name
              )
            )
          `)
          .eq('webhook_id', webhookId)
          .order('triggered_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        return data?.map(log => ({
          ...log,
          webhook_name: log.feature_webhooks?.name || 'Unknown Webhook',
          feature_name: log.feature_webhooks?.features?.name || 'Unknown Feature'
        })) || [];
      },
      enabled: enabled && !!user && !!webhookId,
      refetchInterval: 15000, // More frequent updates for specific webhook
    });
  };

  // Get recent error logs
  const useRecentErrors = (limit = 10) => {
    return useQuery({
      queryKey: ['webhook-logs', 'recent-errors', limit],
      queryFn: async (): Promise<WebhookLog[]> => {
        const { data, error } = await supabase
          .from('webhook_logs')
          .select(`
            *,
            feature_webhooks!webhook_logs_webhook_id_fkey(
              name,
              features!feature_webhooks_feature_id_fkey(
                name
              )
            )
          `)
          .in('status', ['failed', 'timeout'])
          .order('triggered_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        return data?.map(log => ({
          ...log,
          webhook_name: log.feature_webhooks?.name || 'Unknown Webhook',
          feature_name: log.feature_webhooks?.features?.name || 'Unknown Feature'
        })) || [];
      },
      enabled: enabled && !!user,
      refetchInterval: 60000, // Refetch every minute
    });
  };

  // Get log summary statistics
  const useLogsSummary = (timeRange: '24h' | '7d' | '30d' = '24h') => {
    return useQuery({
      queryKey: ['webhook-logs', 'summary', timeRange],
      queryFn: async () => {
        const now = new Date();
        let startTime: Date;

        switch (timeRange) {
          case '24h':
            startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }

        // Get total logs
        const { count: totalLogs, error: totalError } = await supabase
          .from('webhook_logs')
          .select('*', { count: 'exact', head: true })
          .gte('triggered_at', startTime.toISOString());

        if (totalError) throw totalError;

        // Get successful logs
        const { count: successfulLogs, error: successError } = await supabase
          .from('webhook_logs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'success')
          .gte('triggered_at', startTime.toISOString());

        if (successError) throw successError;

        // Get average response time
        const { data: avgData, error: avgError } = await supabase
          .from('webhook_logs')
          .select('response_time_ms')
          .eq('status', 'success')
          .gte('triggered_at', startTime.toISOString());

        if (avgError) throw avgError;

        const avgResponseTime = avgData?.length > 0 
          ? Math.round(avgData.reduce((sum, log) => sum + log.response_time_ms, 0) / avgData.length)
          : 0;

        // Get top event types
        const { data: eventData, error: eventError } = await supabase
          .from('webhook_logs')
          .select('event_type')
          .gte('triggered_at', startTime.toISOString());

        if (eventError) throw eventError;

        const eventCounts = eventData?.reduce((acc, log) => {
          acc[log.event_type] = (acc[log.event_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const topEvents = Object.entries(eventCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([event, count]) => ({ event_type: event, count }));

        return {
          total_triggers: totalLogs || 0,
          successful_triggers: successfulLogs || 0,
          failed_triggers: (totalLogs || 0) - (successfulLogs || 0),
          success_rate: totalLogs ? Math.round(((successfulLogs || 0) / totalLogs) * 100) : 0,
          avg_response_time: avgResponseTime,
          top_events: topEvents,
          time_range: timeRange
        };
      },
      enabled: enabled && !!user,
      refetchInterval: 300000, // Refetch every 5 minutes
    });
  };

  // Export logs function
  const exportLogs = async (format: 'csv' | 'json' = 'csv', filters: WebhookLogFilters = {}) => {
    try {
      const { data, error } = await buildQuery();
      
      if (error) throw error;

      const logs = data?.map(log => ({
        ...log,
        webhook_name: log.feature_webhooks?.name || 'Unknown Webhook',
        feature_name: log.feature_webhooks?.features?.name || 'Unknown Feature'
      })) || [];

      if (format === 'csv') {
        // Convert to CSV
        const headers = [
          'Timestamp',
          'Webhook Name',
          'Feature',
          'Event Type',
          'Status',
          'Status Code',
          'Response Time (ms)',
          'Retry Count',
          'Error Message'
        ];

        const csvRows = [
          headers.join(','),
          ...logs.map(log => [
            log.triggered_at,
            log.webhook_name || '',
            log.feature_name || '',
            log.event_type,
            log.status,
            log.status_code || '',
            log.response_time_ms,
            log.retry_count,
            (log.error_message || '').replace(/,/g, ';')
          ].join(','))
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `webhook-logs-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        URL.revokeObjectURL(url);
      } else {
        // Export as JSON
        const jsonContent = JSON.stringify(logs, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `webhook-logs-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
      }

      return true;
    } catch (error) {
      console.error('Export failed:', error);
      return false;
    }
  };

  return {
    // Queries
    logs: logsQuery.data || [],
    isLoading: logsQuery.isLoading,
    error: logsQuery.error,
    refetch: logsQuery.refetch,

    // Specific queries
    useLogsByWebhook,
    useRecentErrors,
    useLogsSummary,

    // Utility functions
    exportLogs,
    
    // Query client for manual invalidation
    invalidateLogs: () => queryClient.invalidateQueries({ queryKey: ['webhook-logs'] })
  };
}