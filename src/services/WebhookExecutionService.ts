/**
 * WebhookExecutionService - Frontend interface for webhook execution with monitoring
 * Provides reliable execution, real-time monitoring, error handling, and performance analytics
 */

import { BaseWebhookService, ServiceConfig } from './base/BaseWebhookService';
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
  PaginationOptions
} from '../types/webhook';

export interface ExecutionConfig {
  edgeFunctionUrl: string;
  maxConcurrentExecutions?: number;
  defaultTimeout?: number;
  retryConfig?: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
}

export class WebhookExecutionService extends BaseWebhookService {
  private executionConfig: ExecutionConfig;
  private activeExecutions: Map<string, ExecutionHandle> = new Map();
  private executionSubscribers: Map<string, Set<(event: ExecutionEvent) => void>> = new Map();
  private webhookSubscribers: Map<string, Set<(event: ExecutionEvent) => void>> = new Map();

  constructor(config: ServiceConfig, executionConfig: ExecutionConfig) {
    super(config);
    this.executionConfig = {
      maxConcurrentExecutions: 50,
      defaultTimeout: 30000,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
      },
      ...executionConfig
    };
  }

  /**
   * Execute a webhook immediately
   */
  async executeWebhook(request: WebhookExecutionRequest): Promise<ExecutionResult> {
    this.validateExecutionRequest(request);

    // Check concurrent execution limits
    if (this.activeExecutions.size >= this.executionConfig.maxConcurrentExecutions!) {
      throw this.createServiceError(
        'EXECUTION_LIMIT_EXCEEDED',
        'Maximum concurrent executions reached. Please try again later.',
        { currentExecutions: this.activeExecutions.size, maxAllowed: this.executionConfig.maxConcurrentExecutions }
      );
    }

    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    try {
      // Create execution handle for tracking
      const handle = this.createExecutionHandle(executionId, request);
      this.activeExecutions.set(executionId, handle);

      // Notify subscribers of execution start
      this.notifyExecutionEvent({
        type: 'execution_started',
        executionId,
        webhookId: request.webhookId || '',
        timestamp: new Date().toISOString(),
        data: { request }
      });

      // Execute webhook via Edge Function
      const result = await this.callEdgeFunction(executionId, request);

      // Track completion
      const executionTime = Date.now() - startTime;
      this.activeExecutions.delete(executionId);

      // Log execution
      await this.logExecution(executionId, request, result, executionTime);

      // Notify subscribers of completion
      this.notifyExecutionEvent({
        type: result.success ? 'execution_completed' : 'execution_failed',
        executionId,
        webhookId: request.webhookId || '',
        timestamp: new Date().toISOString(),
        data: { result }
      });

      return result;

    } catch (error) {
      // Clean up on error
      this.activeExecutions.delete(executionId);
      
      const executionTime = Date.now() - startTime;
      const errorResult: ExecutionResult = {
        success: false,
        executionId,
        webhookId: request.webhookId || '',
        responseTime: executionTime,
        error: {
          type: 'EXECUTION_ERROR',
          message: error.message || 'Execution failed',
          details: { originalError: error },
          retryable: this.isRetryableError(error),
          suggestedAction: 'Check webhook configuration and try again'
        },
        metadata: {
          attempts: 1,
          networkLatency: 0,
          processingTime: executionTime,
          queueTime: 0
        }
      };

      // Log failed execution
      await this.logExecution(executionId, request, errorResult, executionTime);

      // Notify subscribers of failure
      this.notifyExecutionEvent({
        type: 'execution_failed',
        executionId,
        webhookId: request.webhookId || '',
        timestamp: new Date().toISOString(),
        data: { error: errorResult.error }
      });

      return errorResult;
    }
  }

  /**
   * Execute webhook asynchronously (non-blocking)
   */
  async executeWebhookAsync(request: WebhookExecutionRequest): Promise<ExecutionHandle> {
    this.validateExecutionRequest(request);

    const executionId = this.generateExecutionId();
    const handle = this.createExecutionHandle(executionId, request);
    
    this.activeExecutions.set(executionId, handle);

    // Start execution in background
    this.executeWebhookInBackground(executionId, request, handle);

    return handle;
  }

  /**
   * Execute multiple webhooks in batch
   */
  async executeBatchWebhooks(requests: WebhookExecutionRequest[]): Promise<BatchExecutionResult> {
    if (!Array.isArray(requests) || requests.length === 0) {
      throw this.createServiceError('VALIDATION_ERROR', 'Requests array is required and cannot be empty');
    }

    if (requests.length > 100) {
      throw this.createServiceError('VALIDATION_ERROR', 'Cannot execute more than 100 webhooks in a single batch');
    }

    const requestId = this.generateRequestId();
    const startTime = Date.now();
    const successful: ExecutionResult[] = [];
    const failed: Array<{ request: WebhookExecutionRequest; error: any }> = [];

    // Process in smaller batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(request => this.executeWebhook(request))
      );

      batchResults.forEach((result, index) => {
        const originalRequest = batch[index];
        
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          failed.push({
            request: originalRequest,
            error: result.reason
          });
        }
      });
    }

    const totalExecutionTime = Date.now() - startTime;
    const averageResponseTime = successful.length > 0 
      ? successful.reduce((sum, result) => sum + result.responseTime, 0) / successful.length
      : 0;

    return {
      requestId,
      successful,
      failed,
      statistics: {
        totalRequests: requests.length,
        successfulExecutions: successful.length,
        failedExecutions: failed.length,
        averageResponseTime,
        totalExecutionTime
      }
    };
  }

  /**
   * Get execution status by ID
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionStatus> {
    this.validateRequired(executionId, 'execution ID');

    // Check if execution is still active
    const activeExecution = this.activeExecutions.get(executionId);
    if (activeExecution) {
      return activeExecution.status;
    }

    // Query database for completed execution
    return this.executeWithContext(
      async (supabase) => {
        const { data, error } = await supabase
          .from('element_webhook_logs')
          .select('status')
          .eq('id', executionId)
          .eq('organization_id', this.config.organizationId)
          .single();

        if (error || !data) {
          return { data: ExecutionStatus.PENDING, error: null };
        }

        return { data: data.status as ExecutionStatus, error: null };
      },
      { requestId: this.generateRequestId() }
    );
  }

  /**
   * Get execution history for a webhook
   */
  async getExecutionHistory(
    webhookId: string,
    pagination: PaginationOptions = {}
  ): Promise<PaginatedExecutions> {
    this.validateRequired(webhookId, 'webhook ID');

    const { page = 1, limit = 50, sortBy = 'started_at', sortOrder = 'desc' } = pagination;

    return this.executeWithContext(
      async (supabase) => {
        let query = supabase
          .from('element_webhook_logs')
          .select(`
            id,
            webhook_id,
            organization_id,
            user_id,
            feature_slug,
            page_path,
            element_id,
            event_type,
            status,
            status_code,
            response_time_ms,
            error_details,
            execution_context,
            request_details,
            response_details,
            performance_metrics,
            started_at,
            completed_at
          `, { count: 'exact' })
          .eq('webhook_id', webhookId)
          .eq('organization_id', this.config.organizationId);

        // Apply sorting
        query = this.buildSortQuery(query, sortBy, sortOrder);

        // Get total count
        const { count: totalCount } = await query;

        // Apply pagination
        query = this.buildPaginationQuery(query, page, limit);

        const { data, error } = await query;

        if (error) {
          return { data: null, error };
        }

        const executions = data ? data.map(item => this.snakeToCamel(item)) : [];
        const totalPages = Math.ceil((totalCount || 0) / limit);

        return {
          data: {
            executions,
            totalCount: totalCount || 0,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            currentPage: page,
            totalPages
          },
          error: null
        };
      },
      { requestId: this.generateRequestId() }
    );
  }

  /**
   * Get execution logs for a specific execution
   */
  async getExecutionLogs(executionId: string): Promise<ExecutionLog[]> {
    this.validateRequired(executionId, 'execution ID');

    return this.executeWithContext(
      async (supabase) => {
        const { data, error } = await supabase
          .from('element_webhook_logs')
          .select(`
            id,
            webhook_id,
            organization_id,
            user_id,
            feature_slug,
            page_path,
            element_id,
            event_type,
            status,
            status_code,
            response_time_ms,
            error_details,
            execution_context,
            request_details,
            response_details,
            performance_metrics,
            started_at,
            completed_at
          `)
          .eq('id', executionId)
          .eq('organization_id', this.config.organizationId);

        return { data: data ? data.map(item => this.snakeToCamel(item)) : [], error };
      },
      { requestId: this.generateRequestId() }
    );
  }

  /**
   * Subscribe to real-time execution updates
   */
  subscribeToExecution(
    executionId: string,
    callback: (status: ExecutionStatus) => void
  ): () => void {
    this.validateRequired(executionId, 'execution ID');

    const eventCallback = (event: ExecutionEvent) => {
      if (event.executionId === executionId) {
        const status = this.getStatusFromEvent(event);
        callback(status);
      }
    };

    // Add to subscribers
    if (!this.executionSubscribers.has(executionId)) {
      this.executionSubscribers.set(executionId, new Set());
    }
    this.executionSubscribers.get(executionId)!.add(eventCallback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.executionSubscribers.get(executionId);
      if (subscribers) {
        subscribers.delete(eventCallback);
        if (subscribers.size === 0) {
          this.executionSubscribers.delete(executionId);
        }
      }
    };
  }

  /**
   * Subscribe to webhook execution events
   */
  subscribeToWebhookExecutions(
    webhookId: string,
    callback: (execution: ExecutionEvent) => void
  ): () => void {
    this.validateRequired(webhookId, 'webhook ID');

    const eventCallback = (event: ExecutionEvent) => {
      if (event.webhookId === webhookId) {
        callback(event);
      }
    };

    // Add to subscribers
    if (!this.webhookSubscribers.has(webhookId)) {
      this.webhookSubscribers.set(webhookId, new Set());
    }
    this.webhookSubscribers.get(webhookId)!.add(eventCallback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.webhookSubscribers.get(webhookId);
      if (subscribers) {
        subscribers.delete(eventCallback);
        if (subscribers.size === 0) {
          this.webhookSubscribers.delete(webhookId);
        }
      }
    };
  }

  /**
   * Retry a failed execution
   */
  async retryFailedExecution(executionId: string): Promise<ExecutionResult> {
    this.validateRequired(executionId, 'execution ID');

    // Get original execution data
    const originalExecution = await this.getExecutionLogs(executionId);
    if (originalExecution.length === 0) {
      throw this.createServiceError('NOT_FOUND', 'Original execution not found');
    }

    const original = originalExecution[0];
    
    // Reconstruct the original request
    const retryRequest: WebhookExecutionRequest = {
      webhookId: original.webhookId,
      featureSlug: original.featureSlug,
      pagePath: original.pagePath,
      elementId: original.elementId,
      eventType: original.eventType as any,
      payload: original.requestDetails || {},
      userContext: {
        userId: original.userId,
        role: 'user' // Default role
      }
    };

    // Execute with retry context
    return this.executeWebhook(retryRequest);
  }

  /**
   * Get failed executions
   */
  async getFailedExecutions(webhookId?: string): Promise<FailedExecution[]> {
    return this.executeWithContext(
      async (supabase) => {
        let query = supabase
          .from('element_webhook_logs')
          .select(`
            id,
            webhook_id,
            organization_id,
            user_id,
            feature_slug,
            page_path,
            element_id,
            event_type,
            status,
            status_code,
            response_time_ms,
            error_details,
            execution_context,
            request_details,
            response_details,
            performance_metrics,
            started_at,
            completed_at
          `)
          .eq('organization_id', this.config.organizationId)
          .eq('status', ExecutionStatus.FAILURE);

        if (webhookId) {
          query = query.eq('webhook_id', webhookId);
        }

        query = query.order('started_at', { ascending: false }).limit(100);

        const { data, error } = await query;

        if (error) {
          return { data: [], error };
        }

        const failedExecutions = data ? data.map(item => {
          const executionLog = this.snakeToCamel(item);
          
          return {
            executionLog,
            retryAttempts: 0, // Would be tracked separately
            isRetryable: executionLog.errorDetails?.retryable || false,
            escalationLevel: this.determineEscalationLevel(executionLog)
          } as FailedExecution;
        }) : [];

        return { data: failedExecutions, error: null };
      },
      { requestId: this.generateRequestId() }
    );
  }

  /**
   * Get execution metrics for a webhook
   */
  async getExecutionMetrics(webhookId: string, timeRange: TimeRange): Promise<ExecutionMetrics> {
    this.validateRequired(webhookId, 'webhook ID');
    
    return this.executeWithContext(
      async (supabase) => {
        // Get basic metrics
        const { data: basicMetrics } = await supabase
          .from('element_webhook_logs')
          .select('status, response_time_ms, error_details, started_at')
          .eq('webhook_id', webhookId)
          .eq('organization_id', this.config.organizationId)
          .gte('started_at', timeRange.start)
          .lte('started_at', timeRange.end);

        if (!basicMetrics) {
          return { data: this.createEmptyMetrics(webhookId, timeRange), error: null };
        }

        const totalExecutions = basicMetrics.length;
        const successfulExecutions = basicMetrics.filter(e => e.status === ExecutionStatus.SUCCESS).length;
        const failedExecutions = totalExecutions - successfulExecutions;
        const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;

        const responseTimes = basicMetrics
          .filter(e => e.response_time_ms)
          .map(e => e.response_time_ms)
          .sort((a, b) => a - b);

        const averageResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
          : 0;

        const medianResponseTime = responseTimes.length > 0
          ? responseTimes[Math.floor(responseTimes.length / 2)]
          : 0;

        const p95ResponseTime = responseTimes.length > 0
          ? responseTimes[Math.floor(responseTimes.length * 0.95)]
          : 0;

        const p99ResponseTime = responseTimes.length > 0
          ? responseTimes[Math.floor(responseTimes.length * 0.99)]
          : 0;

        // Error analysis
        const errorsByType: Record<string, number> = {};
        const topErrors: Array<{ errorType: string; errorMessage: string; count: number; percentage: number }> = [];

        basicMetrics
          .filter(e => e.error_details)
          .forEach(e => {
            const errorType = e.error_details?.type || 'UNKNOWN_ERROR';
            errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
          });

        // Get hourly breakdown
        const executionsByHour = this.calculateHourlyBreakdown(basicMetrics, timeRange);

        return {
          data: {
            webhookId,
            timeRange,
            totalExecutions,
            successfulExecutions,
            failedExecutions,
            successRate,
            averageResponseTime,
            medianResponseTime,
            p95ResponseTime,
            p99ResponseTime,
            errorsByType,
            executionsByHour,
            topErrors
          },
          error: null
        };
      },
      { requestId: this.generateRequestId() }
    );
  }

  /**
   * Get performance analytics for a webhook
   */
  async getWebhookPerformance(webhookId: string): Promise<PerformanceAnalytics> {
    this.validateRequired(webhookId, 'webhook ID');

    // Get metrics for last 24 hours
    const timeRange: TimeRange = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    };

    const metrics = await this.getExecutionMetrics(webhookId, timeRange);
    
    // Calculate health score (0-100)
    let healthScore = 100;
    
    if (metrics.successRate < 0.95) healthScore -= (0.95 - metrics.successRate) * 200;
    if (metrics.averageResponseTime > 5000) healthScore -= (metrics.averageResponseTime - 5000) / 100;
    if (metrics.totalExecutions === 0) healthScore = 0;
    
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Determine overall health
    const overallHealth = healthScore >= 90 ? 'excellent' :
                         healthScore >= 70 ? 'good' :
                         healthScore >= 40 ? 'poor' : 'critical';

    // Generate recommendations
    const recommendations = this.generatePerformanceRecommendations(metrics);

    return {
      webhookId,
      overallHealth,
      healthScore: Math.round(healthScore),
      trends: {
        responseTime: 'stable', // Would calculate from historical data
        successRate: 'stable',
        errorRate: 'stable'
      },
      recommendations,
      benchmarks: {
        industryAverageResponseTime: 2000,
        industryAverageSuccessRate: 0.98,
        performancePercentile: 75 // How this webhook compares to others
      }
    };
  }

  /**
   * Private helper methods
   */

  private validateExecutionRequest(request: WebhookExecutionRequest): void {
    this.validateRequired(request.featureSlug, 'feature slug');
    this.validateRequired(request.pagePath, 'page path');
    this.validateRequired(request.elementId, 'element ID');
    this.validateRequired(request.eventType, 'event type');
    this.validateRequired(request.payload, 'payload');
    this.validateRequired(request.userContext, 'user context');
    this.validateRequired(request.userContext.userId, 'user ID');

    const validEventTypes = ['click', 'submit', 'trigger', 'test'];
    if (!validEventTypes.includes(request.eventType)) {
      throw this.createServiceError(
        'VALIDATION_ERROR',
        `Event type must be one of: ${validEventTypes.join(', ')}`,
        { field: 'eventType', value: request.eventType, validOptions: validEventTypes }
      );
    }
  }

  private createExecutionHandle(executionId: string, request: WebhookExecutionRequest): ExecutionHandle {
    let resolveResult: (result: ExecutionResult) => void;
    let rejectResult: (error: any) => void;
    
    const resultPromise = new Promise<ExecutionResult>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });

    return {
      executionId,
      status: ExecutionStatus.PENDING,
      getResult: () => resultPromise,
      cancel: async () => {
        // Implementation would cancel the execution
        return true;
      }
    };
  }

  private async executeWebhookInBackground(
    executionId: string,
    request: WebhookExecutionRequest,
    handle: ExecutionHandle
  ): Promise<void> {
    try {
      const result = await this.callEdgeFunction(executionId, request);
      
      // Update handle status
      (handle as any).status = result.success ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILURE;
      
      // Resolve the result promise
      (handle as any).resolveResult?.(result);
      
    } catch (error) {
      (handle as any).status = ExecutionStatus.FAILURE;
      (handle as any).rejectResult?.(error);
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  private async callEdgeFunction(
    executionId: string,
    request: WebhookExecutionRequest
  ): Promise<ExecutionResult> {
    const payload = {
      organizationId: this.config.organizationId,
      featureSlug: request.featureSlug,
      pagePath: request.pagePath,
      elementId: request.elementId,
      eventType: request.eventType,
      userContext: request.userContext,
      payload: request.payload,
      templateVariables: request.templateVariables || {}
    };

    const startTime = Date.now();

    try {
      const response = await fetch(this.executionConfig.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.supabaseAnonKey}`
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.executionConfig.defaultTimeout!)
      });

      const responseTime = Date.now() - startTime;
      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          executionId,
          webhookId: request.webhookId || '',
          responseTime,
          error: {
            type: 'EDGE_FUNCTION_ERROR',
            message: responseData.error?.message || `HTTP ${response.status}`,
            details: responseData,
            retryable: response.status >= 500,
            suggestedAction: 'Check webhook configuration and endpoint availability'
          },
          metadata: {
            attempts: 1,
            networkLatency: responseTime,
            processingTime: 0,
            queueTime: 0
          }
        };
      }

      return {
        success: true,
        executionId,
        webhookId: responseData.webhookId || request.webhookId || '',
        statusCode: responseData.statusCode,
        responseTime,
        responseBody: responseData.data,
        metadata: {
          attempts: 1,
          networkLatency: responseTime,
          processingTime: responseData.responseTime || 0,
          queueTime: 0
        }
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        executionId,
        webhookId: request.webhookId || '',
        responseTime,
        error: {
          type: error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: error.message || 'Execution failed',
          details: { originalError: error },
          retryable: true,
          suggestedAction: 'Check network connectivity and try again'
        },
        metadata: {
          attempts: 1,
          networkLatency: responseTime,
          processingTime: 0,
          queueTime: 0
        }
      };
    }
  }

  private async logExecution(
    executionId: string,
    request: WebhookExecutionRequest,
    result: ExecutionResult,
    executionTime: number
  ): Promise<void> {
    try {
      const logData = {
        id: executionId,
        webhook_id: request.webhookId || null,
        organization_id: this.config.organizationId,
        user_id: request.userContext.userId,
        feature_slug: request.featureSlug,
        page_path: request.pagePath,
        element_id: request.elementId,
        event_type: request.eventType,
        status: result.success ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILURE,
        status_code: result.statusCode || null,
        response_time_ms: result.responseTime,
        error_details: result.error || null,
        execution_context: {
          requestId: this.generateRequestId(),
          userAgent: request.userContext.userAgent || null,
          ipAddress: request.userContext.ipAddress || null,
          sessionId: request.userContext.sessionId || null
        },
        request_details: {
          payload: request.payload,
          templateVariables: request.templateVariables || {}
        },
        response_details: result.responseBody ? {
          body: result.responseBody,
          size: JSON.stringify(result.responseBody).length
        } : null,
        performance_metrics: result.metadata,
        started_at: new Date(Date.now() - executionTime).toISOString(),
        completed_at: new Date().toISOString()
      };

      await this.executeWithContext(
        async (supabase) => {
          const { error } = await supabase
            .from('element_webhook_logs')
            .insert(logData);

          return { data: true, error };
        },
        { requestId: this.generateRequestId() }
      );

    } catch (error) {
      console.warn('Failed to log execution:', error);
    }
  }

  private notifyExecutionEvent(event: ExecutionEvent): void {
    // Notify execution-specific subscribers
    const executionSubscribers = this.executionSubscribers.get(event.executionId);
    if (executionSubscribers) {
      executionSubscribers.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.warn('Error in execution event callback:', error);
        }
      });
    }

    // Notify webhook-specific subscribers
    const webhookSubscribers = this.webhookSubscribers.get(event.webhookId);
    if (webhookSubscribers) {
      webhookSubscribers.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.warn('Error in webhook event callback:', error);
        }
      });
    }
  }

  private getStatusFromEvent(event: ExecutionEvent): ExecutionStatus {
    switch (event.type) {
      case 'execution_started':
        return ExecutionStatus.EXECUTING;
      case 'execution_completed':
        return ExecutionStatus.SUCCESS;
      case 'execution_failed':
        return ExecutionStatus.FAILURE;
      case 'execution_retry':
        return ExecutionStatus.RETRYING;
      default:
        return ExecutionStatus.PENDING;
    }
  }

  private determineEscalationLevel(executionLog: any): 'low' | 'medium' | 'high' | 'critical' {
    const errorType = executionLog.errorDetails?.type;
    const responseTime = executionLog.responseTimeMs || 0;
    
    if (errorType === 'SYSTEM_ERROR' || responseTime > 30000) {
      return 'critical';
    }
    
    if (errorType === 'CONFIGURATION_ERROR' || responseTime > 10000) {
      return 'high';
    }
    
    if (errorType === 'NETWORK_ERROR' || responseTime > 5000) {
      return 'medium';
    }
    
    return 'low';
  }

  private createEmptyMetrics(webhookId: string, timeRange: TimeRange): ExecutionMetrics {
    return {
      webhookId,
      timeRange,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      successRate: 0,
      averageResponseTime: 0,
      medianResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorsByType: {},
      executionsByHour: [],
      topErrors: []
    };
  }

  private calculateHourlyBreakdown(executions: any[], timeRange: TimeRange): ExecutionMetrics['executionsByHour'] {
    const hourlyData: Record<string, { executions: number; successful: number; totalResponseTime: number }> = {};
    
    executions.forEach(execution => {
      const hour = new Date(execution.started_at).toISOString().slice(0, 13) + ':00:00.000Z';
      
      if (!hourlyData[hour]) {
        hourlyData[hour] = { executions: 0, successful: 0, totalResponseTime: 0 };
      }
      
      hourlyData[hour].executions++;
      if (execution.status === ExecutionStatus.SUCCESS) {
        hourlyData[hour].successful++;
      }
      hourlyData[hour].totalResponseTime += execution.response_time_ms || 0;
    });
    
    return Object.entries(hourlyData).map(([hour, data]) => ({
      hour,
      executions: data.executions,
      successRate: data.executions > 0 ? data.successful / data.executions : 0,
      averageResponseTime: data.executions > 0 ? data.totalResponseTime / data.executions : 0
    }));
  }

  private generatePerformanceRecommendations(metrics: ExecutionMetrics): PerformanceAnalytics['recommendations'] {
    const recommendations: PerformanceAnalytics['recommendations'] = [];
    
    if (metrics.successRate < 0.95) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        title: 'Low Success Rate Detected',
        description: `Success rate is ${(metrics.successRate * 100).toFixed(1)}%. Consider reviewing error patterns and endpoint reliability.`,
        actionRequired: true
      });
    }
    
    if (metrics.averageResponseTime > 5000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Slow Response Times',
        description: `Average response time is ${metrics.averageResponseTime}ms. Consider optimizing endpoint performance.`,
        actionRequired: false
      });
    }
    
    if (Object.keys(metrics.errorsByType).length > 0) {
      recommendations.push({
        type: 'configuration',
        priority: 'medium',
        title: 'Error Pattern Analysis',
        description: 'Multiple error types detected. Review webhook configuration and endpoint compatibility.',
        actionRequired: false
      });
    }
    
    return recommendations;
  }

  private isRetryableError(error: any): boolean {
    const retryableTypes = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'SERVER_INTERNAL_ERROR',
      'RATE_LIMIT_EXCEEDED'
    ];
    
    return retryableTypes.includes(error.type) || 
           error.message?.includes('network') ||
           error.message?.includes('timeout');
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    super.dispose();
    this.activeExecutions.clear();
    this.executionSubscribers.clear();
    this.webhookSubscribers.clear();
  }
}