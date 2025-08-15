import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { cacheConfig } from '@/lib/query-client';
import { trackUserAction, trackFeatureUsage, performHealthCheck } from '@/lib/monitoring';
import { useEffect } from 'react';

// ===== SYSTEM HEALTH MONITORING =====

export function useSystemHealth() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_system_health_overview');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    ...cacheConfig.realtime,
    refetchInterval: 60 * 1000, // Check every minute
  });
}

// ===== PERFORMANCE INSIGHTS =====

interface UsePerformanceInsightsOptions {
  organizationId?: string;
  hours?: number;
}

export function usePerformanceInsights(options: UsePerformanceInsightsOptions = {}) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { organizationId = currentOrganization?.id, hours = 24 } = options;

  return useQuery({
    queryKey: ['performance-insights', organizationId, hours],
    queryFn: async () => {
      if (!organizationId) return null;

      const { data, error } = await supabase.rpc('get_performance_insights', {
        p_organization_id: organizationId,
        p_hours: hours,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!(user && organizationId),
    ...cacheConfig.computation,
  });
}

// ===== ERROR MONITORING =====

export function useErrorLogs(organizationId?: string) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = organizationId || currentOrganization?.id;

  return useQuery({
    queryKey: ['error-logs', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .eq('organization_id', orgId)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!(user && orgId),
    ...cacheConfig.dynamic,
  });
}

// ===== USER ACTION TRACKING =====

export function useActionTracker() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const trackAction = async (
    action: string,
    additionalData?: Record<string, any>
  ) => {
    await trackUserAction(
      action,
      currentOrganization?.id,
      user?.id,
      additionalData
    );
  };

  return { trackAction };
}

// ===== FEATURE USAGE TRACKING =====

export function useFeatureTracker() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const trackFeature = async (
    featureSlug: string,
    eventType: 'page_view' | 'action' | 'error' = 'page_view',
    additionalData?: Record<string, any>
  ) => {
    await trackFeatureUsage(
      featureSlug,
      currentOrganization?.id,
      user?.id,
      eventType,
      additionalData
    );
  };

  // Auto-track page views
  const trackPageView = (featureSlug: string) => {
    useEffect(() => {
      trackFeature(featureSlug, 'page_view', {
        page_url: window.location.pathname,
        timestamp: new Date().toISOString(),
      });
    }, [featureSlug]);
  };

  return { trackFeature, trackPageView };
}

// ===== HEALTH CHECK MUTATIONS =====

export function useHealthCheck() {
  return useMutation({
    mutationFn: async ({ checkName, checkType }: { checkName: string; checkType: string }) => {
      return await performHealthCheck(checkName, checkType);
    },
  });
}

// ===== MONITORING DASHBOARD DATA =====

export function useMonitoringDashboard(organizationId?: string) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = organizationId || currentOrganization?.id;

  // System health
  const systemHealth = useSystemHealth();
  
  // Performance insights
  const performanceInsights = usePerformanceInsights({ organizationId: orgId });
  
  // Recent errors
  const errorLogs = useErrorLogs(orgId);

  // Application metrics (last 24 hours)
  const metrics = useQuery({
    queryKey: ['monitoring-metrics', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('application_metrics')
        .select('*')
        .eq('organization_id', orgId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!(user && orgId),
    ...cacheConfig.dynamic,
  });

  // Query performance logs
  const queryPerformance = useQuery({
    queryKey: ['query-performance', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('query_performance_logs')
        .select('*')
        .eq('organization_id', orgId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('execution_time_ms', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!(user && orgId),
    ...cacheConfig.dynamic,
  });

  return {
    systemHealth: systemHealth.data,
    performanceInsights: performanceInsights.data,
    errorLogs: errorLogs.data || [],
    metrics: metrics.data || [],
    queryPerformance: queryPerformance.data || [],
    isLoading: systemHealth.isLoading || performanceInsights.isLoading || errorLogs.isLoading,
    error: systemHealth.error || performanceInsights.error || errorLogs.error,
  };
}

// ===== REAL-TIME MONITORING =====

export function useRealTimeMonitoring(organizationId?: string) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = organizationId || currentOrganization?.id;

  useEffect(() => {
    if (!user || !orgId) return;

    // Subscribe to real-time error logs
    const errorLogsSubscription = supabase
      .channel(`error-logs-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'error_logs',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          console.warn('New error logged:', payload.new);
          // Could trigger notifications or alerts here
        }
      )
      .subscribe();

    // Subscribe to health check updates
    const healthCheckSubscription = supabase
      .channel('health-checks')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_checks',
        },
        (payload) => {
          const healthCheck = payload.new as any;
          if (healthCheck.status === 'unhealthy') {
            console.error('System health check failed:', healthCheck);
          }
        }
      )
      .subscribe();

    return () => {
      errorLogsSubscription.unsubscribe();
      healthCheckSubscription.unsubscribe();
    };
  }, [user, orgId]);
}

// ===== MONITORING ALERTS =====

export function useMonitoringAlerts() {
  const { user } = useAuth();

  // Check for critical errors
  const criticalErrors = useQuery({
    queryKey: ['critical-errors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .eq('severity', 'critical')
        .eq('resolved', false)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30 * 1000, // Check every 30 seconds
  });

  // Check for performance degradation
  const performanceDegradation = useQuery({
    queryKey: ['performance-degradation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('query_performance_logs')
        .select('query_type, execution_time_ms')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
        .gt('execution_time_ms', 5000); // Queries taking more than 5 seconds

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 60 * 1000, // Check every minute
  });

  return {
    criticalErrors: criticalErrors.data || [],
    slowQueries: performanceDegradation.data || [],
    hasAlerts: (criticalErrors.data?.length || 0) > 0 || (performanceDegradation.data?.length || 0) > 0,
  };
}

// ===== MONITORING CONFIGURATION =====

export function useMonitoringConfig() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // Initialize monitoring when component mounts
  useEffect(() => {
    if (user && currentOrganization) {
      // Initialize monitoring utilities
      import('@/lib/monitoring').then(({ initializeMonitoring }) => {
        initializeMonitoring(currentOrganization.id, user.id);
      });
    }
  }, [user, currentOrganization]);

  return {
    isMonitoringEnabled: !!(user && currentOrganization),
    organizationId: currentOrganization?.id,
    userId: user?.id,
  };
}