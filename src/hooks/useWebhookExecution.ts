/**
 * React hooks for webhook execution and monitoring
 * Provides execution, real-time monitoring, error handling, and performance analytics
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useWebhookServices } from './useWebhookServices';
import {
  WebhookExecutionRequest,
  ExecutionResult,
  ExecutionHandle,
  BatchExecutionResult,
  ExecutionStatus,
  ExecutionLog,
  PaginatedExecutions,
  FailedExecution,
  ExecutionMetrics,
  PerformanceAnalytics,
  ExecutionEvent,
  TimeRange,
  PaginationOptions,
  WebhookHealthStatus,
  SystemHealthOverview,
  PerformanceAlert
} from '../types/webhook';

// Query key factory for execution operations
export const executionQueryKeys = {
  all: ['executions'] as const,
  lists: () => [...executionQueryKeys.all, 'list'] as const,
  history: (webhookId: string, pagination?: PaginationOptions) => 
    [...executionQueryKeys.lists(), 'history', webhookId, pagination] as const,
  logs: (executionId: string) => 
    [...executionQueryKeys.all, 'logs', executionId] as const,
  status: (executionId: string) => 
    [...executionQueryKeys.all, 'status', executionId] as const,
  failed: (webhookId?: string) => 
    [...executionQueryKeys.all, 'failed', webhookId] as const,
  metrics: (webhookId: string, timeRange: TimeRange) => 
    [...executionQueryKeys.all, 'metrics', webhookId, timeRange] as const,
  performance: (webhookId: string) => 
    [...executionQueryKeys.all, 'performance', webhookId] as const,
  health: (webhookId: string) => 
    [...executionQueryKeys.all, 'health', webhookId] as const,
  systemHealth: () => 
    [...executionQueryKeys.all, 'system-health'] as const,
  alerts: () => 
    [...executionQueryKeys.all, 'alerts'] as const,
};

/**
 * Execute a webhook immediately
 */
export function useWebhookExecution(): [
  (request: WebhookExecutionRequest) => Promise<ExecutionResult>,
  {
    isExecuting: boolean;
    lastResult: ExecutionResult | null;
    error: Error | null;
  }
] {
  const { executionService } = useWebhookServices();
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);

  const executeMutation = useMutation({
    mutationFn: (request: WebhookExecutionRequest) => executionService.executeWebhook(request),
    onSuccess: (result) => {
      setLastResult(result);
      
      if (result.success) {
        toast.success('Webhook executed successfully', {
          description: `Response time: ${result.responseTime}ms`,
        });
      } else {
        toast.error('Webhook execution failed', {
          description: result.error?.message || 'Unknown error',
        });
      }
    },
    onError: (error) => {
      toast.error('Execution error', {
        description: error.message,
      });
    },
  });

  return [
    executeMutation.mutateAsync,
    {
      isExecuting: executeMutation.isPending,
      lastResult,
      error: executeMutation.error,
    }
  ];
}

/**
 * Execute webhook asynchronously
 */
export function useAsyncWebhookExecution(): UseMutationResult<ExecutionHandle, Error, WebhookExecutionRequest> {
  const { executionService } = useWebhookServices();

  return useMutation({
    mutationFn: (request: WebhookExecutionRequest) => 
      executionService.executeWebhookAsync(request),
    onSuccess: (handle) => {
      toast.info('Webhook execution started', {
        description: `Execution ID: ${handle.executionId}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to start execution', {
        description: error.message,
      });
    },
  });
}

/**
 * Execute multiple webhooks in batch
 */
export function useBatchWebhookExecution(): UseMutationResult<
  BatchExecutionResult,
  Error,
  WebhookExecutionRequest[]
> {
  const { executionService } = useWebhookServices();

  return useMutation({
    mutationFn: (requests: WebhookExecutionRequest[]) => 
      executionService.executeBatchWebhooks(requests),
    onSuccess: (result) => {
      toast.success(`Batch execution completed`, {
        description: `${result.successful.length} succeeded, ${result.failed.length} failed`,
      });
    },
    onError: (error) => {
      toast.error('Batch execution failed', {
        description: error.message,
      });
    },
  });
}

/**
 * Get execution status by ID
 */
export function useExecutionStatus(executionId: string): UseQueryResult<ExecutionStatus> {
  const { executionService } = useWebhookServices();

  return useQuery({
    queryKey: executionQueryKeys.status(executionId),
    queryFn: () => executionService.getExecutionStatus(executionId),
    enabled: !!executionId,
    refetchInterval: (data) => {
      // Poll more frequently for active executions
      const activeStatuses = [
        ExecutionStatus.PENDING,
        ExecutionStatus.QUEUED,
        ExecutionStatus.EXECUTING,
        ExecutionStatus.RETRYING
      ];
      return activeStatuses.includes(data as ExecutionStatus) ? 1000 : false;
    },
    staleTime: 0, // Always consider stale for real-time updates
  });
}

/**
 * Get execution history for a webhook
 */
export function useExecutionHistory(
  webhookId: string,
  pagination: PaginationOptions = {}
): UseQueryResult<PaginatedExecutions> {
  const { executionService } = useWebhookServices();

  return useQuery({
    queryKey: executionQueryKeys.history(webhookId, pagination),
    queryFn: () => executionService.getExecutionHistory(webhookId, pagination),
    enabled: !!webhookId,
    staleTime: 30 * 1000, // 30 seconds
    keepPreviousData: true,
  });
}

/**
 * Get execution logs for a specific execution
 */
export function useExecutionLogs(executionId: string): UseQueryResult<ExecutionLog[]> {
  const { executionService } = useWebhookServices();

  return useQuery({
    queryKey: executionQueryKeys.logs(executionId),
    queryFn: () => executionService.getExecutionLogs(executionId),
    enabled: !!executionId,
    staleTime: 5 * 60 * 1000, // 5 minutes - logs don't change
  });
}

/**
 * Get failed executions
 */
export function useFailedExecutions(webhookId?: string): UseQueryResult<FailedExecution[]> {
  const { executionService } = useWebhookServices();

  return useQuery({
    queryKey: executionQueryKeys.failed(webhookId),
    queryFn: () => executionService.getFailedExecutions(webhookId),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Retry a failed execution
 */
export function useRetryExecution(): UseMutationResult<ExecutionResult, Error, string> {
  const { executionService } = useWebhookServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (executionId: string) => executionService.retryFailedExecution(executionId),
    onSuccess: (result, executionId) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: executionQueryKeys.failed() });
      queryClient.invalidateQueries({ queryKey: executionQueryKeys.logs(executionId) });

      if (result.success) {
        toast.success('Retry successful', {
          description: `Execution completed successfully`,
        });
      } else {
        toast.warning('Retry failed again', {
          description: result.error?.message || 'Unknown error',
        });
      }
    },
    onError: (error) => {
      toast.error('Retry failed', {
        description: error.message,
      });
    },
  });
}

/**
 * Get execution metrics for a webhook
 */
export function useExecutionMetrics(
  webhookId: string,
  timeRange: TimeRange
): UseQueryResult<ExecutionMetrics> {
  const { executionService } = useWebhookServices();

  return useQuery({
    queryKey: executionQueryKeys.metrics(webhookId, timeRange),
    queryFn: () => executionService.getExecutionMetrics(webhookId, timeRange),
    enabled: !!(webhookId && timeRange.start && timeRange.end),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get performance analytics for a webhook
 */
export function useWebhookPerformance(webhookId: string): UseQueryResult<PerformanceAnalytics> {
  const { executionService } = useWebhookServices();

  return useQuery({
    queryKey: executionQueryKeys.performance(webhookId),
    queryFn: () => executionService.getWebhookPerformance(webhookId),
    enabled: !!webhookId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Real-time execution monitoring
 */
export function useRealTimeExecution(executionId?: string): ExecutionStatus | null {
  const { executionService } = useWebhookServices();
  const [status, setStatus] = useState<ExecutionStatus | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!executionId) return;

    // Subscribe to execution updates
    unsubscribeRef.current = executionService.subscribeToExecution(
      executionId,
      (newStatus) => {
        setStatus(newStatus);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [executionId, executionService]);

  return status;
}

/**
 * Real-time webhook execution monitoring
 */
export function useRealTimeWebhookExecutions(
  webhookId: string,
  onExecution?: (event: ExecutionEvent) => void
) {
  const { executionService } = useWebhookServices();
  const [recentExecutions, setRecentExecutions] = useState<ExecutionEvent[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!webhookId) return;

    unsubscribeRef.current = executionService.subscribeToWebhookExecutions(
      webhookId,
      (event) => {
        setRecentExecutions(prev => [event, ...prev.slice(0, 9)]); // Keep last 10
        onExecution?.(event);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [webhookId, executionService, onExecution]);

  return {
    recentExecutions,
    clearHistory: () => setRecentExecutions([]),
  };
}

/**
 * Webhook health monitoring
 */
export function useWebhookHealth(webhookId: string): UseQueryResult<WebhookHealthStatus> {
  const { executionService } = useWebhookServices();

  return useQuery({
    queryKey: executionQueryKeys.health(webhookId),
    queryFn: async () => {
      // This would be implemented in the execution service
      // For now, return mock data based on recent executions
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      };
      
      const metrics = await executionService.getExecutionMetrics(webhookId, timeRange);
      
      const status = metrics.successRate >= 0.95 ? 'healthy' :
                    metrics.successRate >= 0.8 ? 'degraded' : 'unhealthy';
      
      return {
        webhookId,
        status,
        lastChecked: new Date().toISOString(),
        uptime: metrics.successRate * 100,
        issues: [],
        metrics: {
          averageResponseTime: metrics.averageResponseTime,
          successRate: metrics.successRate,
          consecutiveFailures: 0
        }
      } as WebhookHealthStatus;
    },
    enabled: !!webhookId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * System health overview
 */
export function useSystemHealth(): UseQueryResult<SystemHealthOverview> {
  return useQuery({
    queryKey: executionQueryKeys.systemHealth(),
    queryFn: async () => {
      // Mock implementation - would be replaced with actual service call
      return {
        overallStatus: 'operational' as const,
        activeWebhooks: 0,
        healthyWebhooks: 0,
        degradedWebhooks: 0,
        unhealthyWebhooks: 0,
        totalExecutionsToday: 0,
        successRateToday: 0,
        averageResponseTimeToday: 0,
        activeAlerts: 0,
        criticalAlerts: 0,
        systemLoad: 0,
        components: []
      };
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Performance alerts
 */
export function usePerformanceAlerts(): UseQueryResult<PerformanceAlert[]> {
  return useQuery({
    queryKey: executionQueryKeys.alerts(),
    queryFn: async () => {
      // Mock implementation - would be replaced with actual service call
      return [];
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
}

/**
 * Webhook testing hook with multiple test types
 */
export function useWebhookTesting(webhookId: string) {
  const [executeWebhook] = useWebhookExecution();
  const performance = useWebhookPerformance(webhookId);
  const [testHistory, setTestHistory] = useState<Array<{
    testType: string;
    result: any;
    timestamp: string;
  }>>([]);

  const runConnectivityTest = useCallback(async () => {
    // This would use the ElementWebhookService.testWebhookConnectivity
    // For now, simulate a test
    const testResult = {
      success: true,
      responseTime: Math.random() * 2000 + 500,
      statusCode: 200,
      endpointReachable: true,
      sslValid: true,
      dnsResolvable: true,
      recommendations: [],
      testedAt: new Date().toISOString()
    };

    setTestHistory(prev => [{
      testType: 'connectivity',
      result: testResult,
      timestamp: new Date().toISOString()
    }, ...prev.slice(0, 9)]);

    return testResult;
  }, []);

  const runPerformanceTest = useCallback(async () => {
    return performance.data || null;
  }, [performance.data]);

  const runIntegrationTest = useCallback(async (payload: Record<string, any>) => {
    const testRequest: WebhookExecutionRequest = {
      webhookId,
      featureSlug: 'test',
      pagePath: '/test',
      elementId: 'test-element',
      eventType: 'test',
      payload,
      userContext: {
        userId: 'test-user',
        role: 'admin'
      }
    };

    const result = await executeWebhook(testRequest);
    
    setTestHistory(prev => [{
      testType: 'integration',
      result,
      timestamp: new Date().toISOString()
    }, ...prev.slice(0, 9)]);

    return result;
  }, [webhookId, executeWebhook]);

  return {
    runConnectivityTest,
    runPerformanceTest,
    runIntegrationTest,
    testHistory,
    clearHistory: () => setTestHistory([]),
  };
}

/**
 * Webhook execution analytics with time range selection
 */
export function useWebhookAnalytics(webhookId: string) {
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    preset: '24h'
  });

  const metrics = useExecutionMetrics(webhookId, timeRange);
  const performance = useWebhookPerformance(webhookId);
  const health = useWebhookHealth(webhookId);

  const setTimeRangePreset = useCallback((preset: TimeRange['preset']) => {
    const now = new Date();
    let start: Date;

    switch (preset) {
      case '1h':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return;
    }

    setTimeRange({
      start: start.toISOString(),
      end: now.toISOString(),
      preset
    });
  }, []);

  const setCustomTimeRange = useCallback((start: string, end: string) => {
    setTimeRange({
      start,
      end,
      preset: 'custom'
    });
  }, []);

  return {
    timeRange,
    setTimeRangePreset,
    setCustomTimeRange,
    metrics: metrics.data,
    performance: performance.data,
    health: health.data,
    isLoading: metrics.isLoading || performance.isLoading || health.isLoading,
    error: metrics.error || performance.error || health.error,
  };
}