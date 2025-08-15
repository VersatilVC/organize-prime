import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';

export interface WebhookStats {
  total_webhooks: number;
  active_webhooks: number;
  inactive_webhooks: number;
  total_triggers_24h: number;
  total_triggers_7d: number;
  total_triggers_30d: number;
  success_rate_24h: number;
  success_rate_7d: number;
  success_rate_30d: number;
  avg_response_time_24h: number;
  avg_response_time_7d: number;
  avg_response_time_30d: number;
  total_failures_24h: number;
  total_timeouts_24h: number;
  top_features: Array<{
    feature_name: string;
    feature_id: string;
    webhook_count: number;
    trigger_count_24h: number;
    success_rate: number;
  }>;
  top_events: Array<{
    event_type: string;
    trigger_count_24h: number;
    success_rate: number;
  }>;
  recent_errors: Array<{
    webhook_name: string;
    webhook_id: string;
    feature_name: string;
    error_message: string;
    timestamp: string;
    retry_count: number;
  }>;
  performance_trends: Array<{
    date: string;
    total_triggers: number;
    successful_triggers: number;
    avg_response_time: number;
  }>;
}

export interface WebhookHealthMetrics {
  webhook_id: string;
  webhook_name: string;
  feature_name: string;
  uptime_percentage: number;
  avg_response_time: number;
  error_rate: number;
  last_success: string | null;
  last_failure: string | null;
  total_triggers: number;
  health_score: number; // 0-100 score based on various factors
  status: 'healthy' | 'degraded' | 'unhealthy' | 'inactive';
  alerts: Array<{
    type: 'high_error_rate' | 'slow_response' | 'frequent_timeouts' | 'no_activity';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export function useWebhookStats(enabled = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Main stats query
  const statsQuery = useQuery({
    queryKey: ['webhook-stats'],
    queryFn: async (): Promise<WebhookStats> => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get webhook counts
      const { data: webhooksData, error: webhooksError } = await supabase
        .from('feature_webhooks')
        .select('id, is_active, feature_id, features!feature_webhooks_feature_id_fkey(name)');

      if (webhooksError) throw webhooksError;

      const totalWebhooks = webhooksData?.length || 0;
      const activeWebhooks = webhooksData?.filter(w => w.is_active).length || 0;
      const inactiveWebhooks = totalWebhooks - activeWebhooks;

      // Helper function to get stats for a time period
      const getStatsForPeriod = async (startTime: Date) => {
        // Total triggers
        const { count: totalTriggers, error: triggersError } = await supabase
          .from('webhook_logs')
          .select('*', { count: 'exact', head: true })
          .gte('triggered_at', startTime.toISOString());

        if (triggersError) throw triggersError;

        // Successful triggers
        const { count: successfulTriggers, error: successError } = await supabase
          .from('webhook_logs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'success')
          .gte('triggered_at', startTime.toISOString());

        if (successError) throw successError;

        // Failed triggers
        const { count: failedTriggers, error: failedError } = await supabase
          .from('webhook_logs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'failed')
          .gte('triggered_at', startTime.toISOString());

        if (failedError) throw failedError;

        // Timeout triggers
        const { count: timeoutTriggers, error: timeoutError } = await supabase
          .from('webhook_logs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'timeout')
          .gte('triggered_at', startTime.toISOString());

        if (timeoutError) throw timeoutError;

        // Average response time for successful requests
        const { data: responseTimeData, error: responseTimeError } = await supabase
          .from('webhook_logs')
          .select('response_time_ms')
          .eq('status', 'success')
          .gte('triggered_at', startTime.toISOString());

        if (responseTimeError) throw responseTimeError;

        const avgResponseTime = responseTimeData?.length > 0
          ? Math.round(responseTimeData.reduce((sum, log) => sum + log.response_time_ms, 0) / responseTimeData.length)
          : 0;

        const successRate = totalTriggers > 0 ? Math.round(((successfulTriggers || 0) / totalTriggers) * 100) : 0;

        return {
          totalTriggers: totalTriggers || 0,
          successfulTriggers: successfulTriggers || 0,
          failedTriggers: failedTriggers || 0,
          timeoutTriggers: timeoutTriggers || 0,
          successRate,
          avgResponseTime
        };
      };

      // Get stats for different time periods
      const [stats24h, stats7d, stats30d] = await Promise.all([
        getStatsForPeriod(oneDayAgo),
        getStatsForPeriod(sevenDaysAgo),
        getStatsForPeriod(thirtyDaysAgo)
      ]);

      // Get top features by webhook count and activity
      const { data: featuresData, error: featuresError } = await supabase
        .from('features')
        .select(`
          id,
          name,
          feature_webhooks!feature_webhooks_feature_id_fkey(id),
          webhook_logs:feature_webhooks!feature_webhooks_feature_id_fkey(
            webhook_logs!webhook_logs_webhook_id_fkey(
              status,
              triggered_at
            )
          )
        `);

      if (featuresError) throw featuresError;

      const topFeatures = featuresData?.map(feature => {
        const webhookCount = feature.feature_webhooks?.length || 0;
        const recentLogs = feature.webhook_logs?.flatMap(w => w.webhook_logs || [])
          .filter(log => new Date(log.triggered_at) >= oneDayAgo) || [];
        const triggerCount24h = recentLogs.length;
        const successfulLogs = recentLogs.filter(log => log.status === 'success').length;
        const successRate = triggerCount24h > 0 ? Math.round((successfulLogs / triggerCount24h) * 100) : 0;

        return {
          feature_name: feature.name,
          feature_id: feature.id,
          webhook_count: webhookCount,
          trigger_count_24h: triggerCount24h,
          success_rate: successRate
        };
      }).sort((a, b) => b.trigger_count_24h - a.trigger_count_24h).slice(0, 10) || [];

      // Get top event types
      const { data: eventTypeData, error: eventTypeError } = await supabase
        .from('webhook_logs')
        .select('event_type, status')
        .gte('triggered_at', oneDayAgo.toISOString());

      if (eventTypeError) throw eventTypeError;

      const eventTypeCounts = eventTypeData?.reduce((acc, log) => {
        if (!acc[log.event_type]) {
          acc[log.event_type] = { total: 0, successful: 0 };
        }
        acc[log.event_type].total++;
        if (log.status === 'success') {
          acc[log.event_type].successful++;
        }
        return acc;
      }, {} as Record<string, { total: number; successful: number }>) || {};

      const topEvents = Object.entries(eventTypeCounts)
        .map(([eventType, counts]) => ({
          event_type: eventType,
          trigger_count_24h: counts.total,
          success_rate: counts.total > 0 ? Math.round((counts.successful / counts.total) * 100) : 0
        }))
        .sort((a, b) => b.trigger_count_24h - a.trigger_count_24h)
        .slice(0, 10);

      // Get recent errors
      const { data: recentErrorsData, error: errorsError } = await supabase
        .from('webhook_logs')
        .select(`
          webhook_id,
          error_message,
          triggered_at,
          retry_count,
          feature_webhooks!webhook_logs_webhook_id_fkey(
            name,
            features!feature_webhooks_feature_id_fkey(name)
          )
        `)
        .in('status', ['failed', 'timeout'])
        .order('triggered_at', { ascending: false })
        .limit(10);

      if (errorsError) throw errorsError;

      const recentErrors = recentErrorsData?.map(error => ({
        webhook_name: error.feature_webhooks?.name || 'Unknown Webhook',
        webhook_id: error.webhook_id,
        feature_name: error.feature_webhooks?.features?.name || 'Unknown Feature',
        error_message: error.error_message || 'Unknown error',
        timestamp: error.triggered_at,
        retry_count: error.retry_count
      })) || [];

      // Get performance trends (last 7 days)
      const performanceTrends = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const { count: dayTriggers } = await supabase
          .from('webhook_logs')
          .select('*', { count: 'exact', head: true })
          .gte('triggered_at', startOfDay.toISOString())
          .lt('triggered_at', endOfDay.toISOString());

        const { count: daySuccessful } = await supabase
          .from('webhook_logs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'success')
          .gte('triggered_at', startOfDay.toISOString())
          .lt('triggered_at', endOfDay.toISOString());

        const { data: dayResponseTimes } = await supabase
          .from('webhook_logs')
          .select('response_time_ms')
          .eq('status', 'success')
          .gte('triggered_at', startOfDay.toISOString())
          .lt('triggered_at', endOfDay.toISOString());

        const avgResponseTime = dayResponseTimes?.length > 0
          ? Math.round(dayResponseTimes.reduce((sum, log) => sum + log.response_time_ms, 0) / dayResponseTimes.length)
          : 0;

        performanceTrends.push({
          date: startOfDay.toISOString().split('T')[0],
          total_triggers: dayTriggers || 0,
          successful_triggers: daySuccessful || 0,
          avg_response_time: avgResponseTime
        });
      }

      return {
        total_webhooks: totalWebhooks,
        active_webhooks: activeWebhooks,
        inactive_webhooks: inactiveWebhooks,
        total_triggers_24h: stats24h.totalTriggers,
        total_triggers_7d: stats7d.totalTriggers,
        total_triggers_30d: stats30d.totalTriggers,
        success_rate_24h: stats24h.successRate,
        success_rate_7d: stats7d.successRate,
        success_rate_30d: stats30d.successRate,
        avg_response_time_24h: stats24h.avgResponseTime,
        avg_response_time_7d: stats7d.avgResponseTime,
        avg_response_time_30d: stats30d.avgResponseTime,
        total_failures_24h: stats24h.failedTriggers,
        total_timeouts_24h: stats24h.timeoutTriggers,
        top_features: topFeatures,
        top_events: topEvents,
        recent_errors: recentErrors,
        performance_trends: performanceTrends
      };
    },
    enabled: enabled && !!user,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // Webhook health metrics query
  const healthQuery = useQuery({
    queryKey: ['webhook-health'],
    queryFn: async (): Promise<WebhookHealthMetrics[]> => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get all webhooks with their logs
      const { data: webhooksData, error: webhooksError } = await supabase
        .from('feature_webhooks')
        .select(`
          id,
          name,
          is_active,
          features!feature_webhooks_feature_id_fkey(name),
          webhook_logs!webhook_logs_webhook_id_fkey(
            status,
            response_time_ms,
            triggered_at,
            error_message
          )
        `);

      if (webhooksError) throw webhooksError;

      return Promise.all(
        (webhooksData || []).map(async (webhook): Promise<WebhookHealthMetrics> => {
          const logs = webhook.webhook_logs || [];
          const recentLogs = logs.filter(log => new Date(log.triggered_at) >= sevenDaysAgo);
          const last24hLogs = logs.filter(log => new Date(log.triggered_at) >= oneDayAgo);

          // Calculate metrics
          const totalTriggers = recentLogs.length;
          const successfulTriggers = recentLogs.filter(log => log.status === 'success').length;
          const failedTriggers = recentLogs.filter(log => log.status === 'failed').length;
          const timeoutTriggers = recentLogs.filter(log => log.status === 'timeout').length;

          const uptimePercentage = totalTriggers > 0 ? Math.round((successfulTriggers / totalTriggers) * 100) : 100;
          const errorRate = totalTriggers > 0 ? Math.round(((failedTriggers + timeoutTriggers) / totalTriggers) * 100) : 0;

          // Calculate average response time
          const successfulResponseTimes = recentLogs
            .filter(log => log.status === 'success')
            .map(log => log.response_time_ms);
          const avgResponseTime = successfulResponseTimes.length > 0
            ? Math.round(successfulResponseTimes.reduce((sum, time) => sum + time, 0) / successfulResponseTimes.length)
            : 0;

          // Find last success and failure
          const lastSuccess = recentLogs
            .filter(log => log.status === 'success')
            .sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime())[0]?.triggered_at || null;

          const lastFailure = recentLogs
            .filter(log => log.status !== 'success')
            .sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime())[0]?.triggered_at || null;

          // Calculate health score (0-100)
          let healthScore = 100;
          if (!webhook.is_active) healthScore -= 50; // Inactive webhooks get major penalty
          if (errorRate > 20) healthScore -= 30; // High error rate
          else if (errorRate > 10) healthScore -= 15;
          else if (errorRate > 5) healthScore -= 5;
          
          if (avgResponseTime > 5000) healthScore -= 20; // Very slow response
          else if (avgResponseTime > 2000) healthScore -= 10;
          else if (avgResponseTime > 1000) healthScore -= 5;

          if (totalTriggers === 0) healthScore -= 20; // No activity

          healthScore = Math.max(0, healthScore);

          // Determine status
          let status: WebhookHealthMetrics['status'];
          if (!webhook.is_active) status = 'inactive';
          else if (healthScore >= 90) status = 'healthy';
          else if (healthScore >= 70) status = 'degraded';
          else status = 'unhealthy';

          // Generate alerts
          const alerts: WebhookHealthMetrics['alerts'] = [];
          
          if (errorRate > 20) {
            alerts.push({
              type: 'high_error_rate',
              message: `High error rate: ${errorRate}% of requests are failing`,
              severity: 'high'
            });
          } else if (errorRate > 10) {
            alerts.push({
              type: 'high_error_rate',
              message: `Elevated error rate: ${errorRate}% of requests are failing`,
              severity: 'medium'
            });
          }

          if (avgResponseTime > 5000) {
            alerts.push({
              type: 'slow_response',
              message: `Very slow response times: averaging ${avgResponseTime}ms`,
              severity: 'high'
            });
          } else if (avgResponseTime > 2000) {
            alerts.push({
              type: 'slow_response',
              message: `Slow response times: averaging ${avgResponseTime}ms`,
              severity: 'medium'
            });
          }

          const timeoutRate = totalTriggers > 0 ? (timeoutTriggers / totalTriggers) * 100 : 0;
          if (timeoutRate > 10) {
            alerts.push({
              type: 'frequent_timeouts',
              message: `Frequent timeouts: ${Math.round(timeoutRate)}% of requests are timing out`,
              severity: 'high'
            });
          }

          if (totalTriggers === 0 && webhook.is_active) {
            alerts.push({
              type: 'no_activity',
              message: 'No webhook activity in the past 7 days',
              severity: 'low'
            });
          }

          return {
            webhook_id: webhook.id,
            webhook_name: webhook.name,
            feature_name: webhook.features?.name || 'Unknown Feature',
            uptime_percentage: uptimePercentage,
            avg_response_time: avgResponseTime,
            error_rate: errorRate,
            last_success: lastSuccess,
            last_failure: lastFailure,
            total_triggers: totalTriggers,
            health_score: healthScore,
            status,
            alerts
          };
        })
      );
    },
    enabled: enabled && !!user,
    refetchInterval: 600000, // Refetch every 10 minutes
  });

  return {
    // Main stats
    stats: statsQuery.data,
    isStatsLoading: statsQuery.isLoading,
    statsError: statsQuery.error,
    refetchStats: statsQuery.refetch,

    // Health metrics
    healthMetrics: healthQuery.data || [],
    isHealthLoading: healthQuery.isLoading,
    healthError: healthQuery.error,
    refetchHealth: healthQuery.refetch,

    // Utility functions
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-stats'] });
      queryClient.invalidateQueries({ queryKey: ['webhook-health'] });
    }
  };
}