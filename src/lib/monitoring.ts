import { supabase } from '@/integrations/supabase/client';

// ===== PERFORMANCE MONITORING =====

interface QueryPerformanceData {
  organizationId?: string;
  userId?: string;
  queryType: string;
  queryName?: string;
  executionTimeMs: number;
  rowCount?: number;
  cacheHit?: boolean;
  errorMessage?: string;
}

export const logQueryPerformance = async (data: QueryPerformanceData) => {
  try {
    await supabase.rpc('log_query_performance', {
      p_organization_id: data.organizationId || null,
      p_user_id: data.userId || null,
      p_query_type: data.queryType,
      p_query_name: data.queryName || null,
      p_execution_time_ms: data.executionTimeMs,
      p_row_count: data.rowCount || null,
      p_cache_hit: data.cacheHit || false,
      p_error_message: data.errorMessage || null,
    });
  } catch (error) {
    // Silently fail monitoring to not affect user experience
    console.warn('Failed to log query performance:', error);
  }
};

// ===== METRIC LOGGING =====

interface MetricData {
  organizationId?: string;
  metricName: string;
  metricValue: number;
  metricUnit?: string;
  metricType?: 'counter' | 'gauge' | 'histogram';
  tags?: Record<string, any>;
}

export const logMetric = async (data: MetricData) => {
  try {
    await supabase.rpc('log_metric', {
      p_organization_id: data.organizationId || null,
      p_metric_name: data.metricName,
      p_metric_value: data.metricValue,
      p_metric_unit: data.metricUnit || null,
      p_metric_type: data.metricType || 'gauge',
      p_tags: data.tags || {},
    });
  } catch (error) {
    console.warn('Failed to log metric:', error);
  }
};

// ===== ERROR LOGGING =====

interface ErrorData {
  organizationId?: string;
  userId?: string;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  requestPath?: string;
  requestMethod?: string;
  contextData?: Record<string, any>;
  severity?: 'info' | 'warn' | 'error' | 'critical';
}

export const logError = async (data: ErrorData) => {
  try {
    await supabase.rpc('log_error', {
      p_organization_id: data.organizationId || null,
      p_user_id: data.userId || null,
      p_error_type: data.errorType,
      p_error_message: data.errorMessage,
      p_error_stack: data.errorStack || null,
      p_request_path: data.requestPath || window.location.pathname,
      p_request_method: data.requestMethod || 'GET',
      p_context_data: data.contextData || {},
      p_severity: data.severity || 'error',
    });
  } catch (error) {
    console.warn('Failed to log error:', error);
  }
};

// ===== PERFORMANCE MEASUREMENT UTILITIES =====

class PerformanceTimer {
  private startTime: number;
  private queryType: string;
  private queryName?: string;
  private additionalData: Partial<QueryPerformanceData>;

  constructor(
    queryType: string, 
    queryName?: string, 
    additionalData: Partial<QueryPerformanceData> = {}
  ) {
    this.startTime = performance.now();
    this.queryType = queryType;
    this.queryName = queryName;
    this.additionalData = additionalData;
  }

  async end(rowCount?: number, cacheHit?: boolean, error?: Error) {
    const executionTime = Math.round(performance.now() - this.startTime);
    
    await logQueryPerformance({
      queryType: this.queryType,
      queryName: this.queryName,
      executionTimeMs: executionTime,
      rowCount,
      cacheHit,
      errorMessage: error?.message,
      ...this.additionalData,
    });

    return executionTime;
  }
}

export const createPerformanceTimer = (
  queryType: string,
  queryName?: string,
  additionalData?: Partial<QueryPerformanceData>
) => new PerformanceTimer(queryType, queryName, additionalData);

// ===== REACT QUERY INTEGRATION =====

export const withPerformanceMonitoring = <T>(
  queryFn: () => Promise<T>,
  queryType: string,
  queryName?: string,
  additionalData?: Partial<QueryPerformanceData>
) => {
  return async (): Promise<T> => {
    const timer = createPerformanceTimer(queryType, queryName, additionalData);
    let result: T;
    let error: Error | undefined;
    let rowCount: number | undefined;

    try {
      result = await queryFn();
      
      // Try to extract row count if result is an array or has data property
      if (Array.isArray(result)) {
        rowCount = result.length;
      } else if (result && typeof result === 'object' && 'data' in result) {
        const data = (result as any).data;
        if (Array.isArray(data)) {
          rowCount = data.length;
        }
      }

      return result;
    } catch (err) {
      error = err as Error;
      throw err;
    } finally {
      await timer.end(rowCount, false, error);
    }
  };
};

// ===== ERROR BOUNDARY INTEGRATION =====

export const logReactError = async (
  error: Error,
  errorInfo: { componentStack: string },
  additionalContext?: Record<string, any>
) => {
  await logError({
    errorType: 'react_error',
    errorMessage: error.message,
    errorStack: error.stack,
    contextData: {
      componentStack: errorInfo.componentStack,
      ...additionalContext,
    },
    severity: 'error',
  });
};

// ===== USER ANALYTICS =====

export const trackUserAction = async (
  action: string,
  organizationId?: string,
  userId?: string,
  additionalData?: Record<string, any>
) => {
  await logMetric({
    organizationId,
    metricName: 'user_action',
    metricValue: 1,
    metricType: 'counter',
    tags: {
      action,
      user_id: userId,
      timestamp: new Date().toISOString(),
      ...additionalData,
    },
  });
};

// ===== FEATURE USAGE TRACKING =====

export const trackFeatureUsage = async (
  featureSlug: string,
  organizationId?: string,
  userId?: string,
  eventType: 'page_view' | 'action' | 'error' = 'page_view',
  additionalData?: Record<string, any>
) => {
  await logMetric({
    organizationId,
    metricName: 'feature_usage',
    metricValue: 1,
    metricType: 'counter',
    tags: {
      feature_slug: featureSlug,
      event_type: eventType,
      user_id: userId,
      ...additionalData,
    },
  });
};

// ===== SYSTEM HEALTH MONITORING =====

export const performHealthCheck = async (checkName: string, checkType: string) => {
  try {
    const { data, error } = await supabase.rpc('perform_health_check', {
      p_check_name: checkName,
      p_check_type: checkType,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      check_name: checkName,
      check_type: checkType,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// ===== BROWSER PERFORMANCE API INTEGRATION =====

export const collectBrowserMetrics = async (organizationId?: string) => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      // Log page load metrics
      await logMetric({
        organizationId,
        metricName: 'page_load_time',
        metricValue: Math.round(navigation.loadEventEnd - navigation.fetchStart),
        metricUnit: 'ms',
        metricType: 'histogram',
        tags: {
          page_url: window.location.pathname,
          dns_time: Math.round(navigation.domainLookupEnd - navigation.domainLookupStart),
          tcp_time: Math.round(navigation.connectEnd - navigation.connectStart),
          request_time: Math.round(navigation.responseEnd - navigation.requestStart),
          dom_processing_time: Math.round(navigation.domContentLoadedEventEnd - navigation.responseEnd),
        },
      });
    }

    // Log memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      await logMetric({
        organizationId,
        metricName: 'browser_memory_usage',
        metricValue: memory.usedJSHeapSize,
        metricUnit: 'bytes',
        metricType: 'gauge',
        tags: {
          total_heap_size: memory.totalJSHeapSize,
          heap_size_limit: memory.jsHeapSizeLimit,
        },
      });
    }
  }
};

// ===== AUTOMATED MONITORING SETUP =====

export const initializeMonitoring = (organizationId?: string, userId?: string) => {
  // Collect initial browser metrics
  if (typeof window !== 'undefined') {
    // Wait for page load to complete
    window.addEventListener('load', () => {
      setTimeout(() => collectBrowserMetrics(organizationId), 1000);
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      trackUserAction(
        document.hidden ? 'page_hidden' : 'page_visible',
        organizationId,
        userId
      );
    });

    // Global error handler
    window.addEventListener('error', (event) => {
      logError({
        organizationId,
        userId,
        errorType: 'javascript_error',
        errorMessage: event.message,
        errorStack: event.error?.stack,
        requestPath: window.location.pathname,
        contextData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        severity: 'error',
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logError({
        organizationId,
        userId,
        errorType: 'unhandled_promise_rejection',
        errorMessage: event.reason?.message || 'Unhandled promise rejection',
        errorStack: event.reason?.stack,
        requestPath: window.location.pathname,
        severity: 'error',
      });
    });
  }
};

// ===== MONITORING HOOKS UTILITIES =====

export const monitoringUtils = {
  logQueryPerformance,
  logMetric,
  logError,
  createPerformanceTimer,
  withPerformanceMonitoring,
  logReactError,
  trackUserAction,
  trackFeatureUsage,
  performHealthCheck,
  collectBrowserMetrics,
  initializeMonitoring,
};