/**
 * Comprehensive logging and monitoring service for webhook execution
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import {
  ElementWebhookRequest,
  WebhookConfiguration,
  WebhookExecutionResult,
  ExecutionLog,
  PerformanceMetrics,
  ErrorType,
  ExecutionStatus,
  ExecutionError
} from "./types.ts";

export class LoggingService {
  private supabase: any;
  private requestId: string;
  private startTime: number;

  constructor(supabaseUrl: string, supabaseKey: string, requestId: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.requestId = requestId;
    this.startTime = performance.now();
  }

  /**
   * Log the start of webhook execution
   */
  async logExecutionStart(
    request: ElementWebhookRequest,
    config: WebhookConfiguration,
    executionId: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('element_webhook_logs')
        .insert({
          id: executionId,
          webhook_id: config.id,
          organization_id: request.organizationId,
          user_id: request.userContext.userId,
          feature_slug: request.featureSlug,
          page_path: request.pagePath,
          element_id: request.elementId,
          event_type: request.eventType,
          status: ExecutionStatus.SUCCESS, // Will be updated on completion
          execution_context: {
            requestId: this.requestId,
            userAgent: request.userContext.userAgent,
            ipAddress: request.userContext.ipAddress,
            sessionId: request.userContext.sessionId
          },
          request_details: {
            method: config.httpMethod,
            url: config.endpointUrl,
            payloadSize: new TextEncoder().encode(JSON.stringify(request.payload)).length,
            templateVariables: request.templateVariables || {}
          },
          started_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log execution start:', error);
      }
    } catch (error) {
      console.error('Logging service error (start):', error);
    }
  }

  /**
   * Log the completion of webhook execution
   */
  async logExecutionComplete(
    executionId: string,
    result: WebhookExecutionResult,
    config: WebhookConfiguration,
    request: ElementWebhookRequest
  ): Promise<void> {
    try {
      const updateData: any = {
        status: result.success ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILURE,
        status_code: result.statusCode,
        response_time_ms: result.responseTime,
        completed_at: new Date().toISOString(),
        response_details: {
          statusCode: result.statusCode,
          bodySize: result.responseBody ? new TextEncoder().encode(JSON.stringify(result.responseBody)).length : 0,
          contentType: 'application/json' // Default assumption
        },
        performance_metrics: {
          responseTime: result.responseTime,
          networkLatency: result.metadata.networkLatency,
          processingTime: result.metadata.processingTime,
          queueTime: result.metadata.queueTime,
          memoryUsage: result.metadata.memoryUsage || 0,
          attempts: result.metadata.attempts
        }
      };

      // Add error details if execution failed
      if (!result.success && result.error) {
        updateData.error_details = {
          type: result.error.type,
          message: result.error.message,
          context: result.error.details || {},
          retryable: result.error.retryable,
          suggestedAction: result.error.suggestedAction
        };
      }

      const { error } = await this.supabase
        .from('element_webhook_logs')
        .update(updateData)
        .eq('id', executionId);

      if (error) {
        console.error('Failed to log execution completion:', error);
      }

      // Update webhook statistics
      await this.updateWebhookStats(config.id, result);

      // Log performance metrics for monitoring
      await this.logPerformanceMetrics(config.id, request.organizationId, result);

    } catch (error) {
      console.error('Logging service error (complete):', error);
    }
  }

  /**
   * Log error during webhook execution
   */
  async logExecutionError(
    executionId: string,
    error: ExecutionError,
    config?: WebhookConfiguration,
    request?: ElementWebhookRequest
  ): Promise<void> {
    try {
      const updateData = {
        status: this.getStatusFromError(error.type),
        error_details: {
          type: error.type,
          message: error.message,
          context: error.details || {},
          retryable: error.retryable,
          suggestedAction: error.suggestedAction,
          stackTrace: error.details?.stackTrace
        },
        completed_at: new Date().toISOString(),
        response_time_ms: Math.round(performance.now() - this.startTime)
      };

      const { error: dbError } = await this.supabase
        .from('element_webhook_logs')
        .update(updateData)
        .eq('id', executionId);

      if (dbError) {
        console.error('Failed to log execution error:', dbError);
      }

      // Increment error counts
      if (config) {
        await this.incrementErrorCount(config.id, error.type);
      }

    } catch (logError) {
      console.error('Logging service error (error):', logError);
    }
  }

  /**
   * Create comprehensive execution log entry
   */
  createExecutionLog(
    executionId: string,
    request: ElementWebhookRequest,
    config: WebhookConfiguration,
    result: WebhookExecutionResult
  ): ExecutionLog {
    return {
      // Execution metadata
      executionId,
      webhookId: config.id,
      organizationId: request.organizationId,
      userId: request.userContext.userId,

      // Element context
      featureSlug: request.featureSlug,
      pagePath: request.pagePath,
      elementId: request.elementId,
      eventType: request.eventType,

      // Request details
      request: {
        method: config.httpMethod,
        url: config.endpointUrl,
        headers: config.headers,
        payloadSize: new TextEncoder().encode(JSON.stringify(request.payload)).length,
        templateVariables: request.templateVariables || {}
      },

      // Response details
      response: result.statusCode ? {
        statusCode: result.statusCode,
        headers: {}, // Would need to capture from actual response
        bodySize: result.responseBody ? 
          new TextEncoder().encode(JSON.stringify(result.responseBody)).length : 0,
        contentType: 'application/json'
      } : undefined,

      // Performance metrics
      performance: {
        responseTime: result.responseTime,
        networkLatency: result.metadata.networkLatency,
        processingTime: result.metadata.processingTime,
        queueTime: result.metadata.queueTime,
        memoryUsage: result.metadata.memoryUsage || 0
      },

      // Error information
      error: result.error ? {
        type: result.error.type,
        message: result.error.message,
        stackTrace: result.error.details?.stackTrace,
        context: result.error.details || {}
      } : undefined,

      // Audit trail
      audit: {
        timestamp: new Date().toISOString(),
        source: 'execute-element-webhook',
        userAgent: request.userContext.userAgent || '',
        ipAddress: request.userContext.ipAddress || '',
        sessionId: request.userContext.sessionId || '',
        executionEnvironment: 'supabase-edge-function'
      },

      // Status and metadata
      status: result.success ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILURE,
      retryAttempt: result.metadata.attempts - 1,
      totalAttempts: result.metadata.attempts
    };
  }

  /**
   * Log security events and potential threats
   */
  async logSecurityEvent(
    eventType: 'rate_limit_exceeded' | 'invalid_auth' | 'suspicious_payload' | 'blocked_ip',
    details: {
      organizationId: string;
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      elementId?: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      additionalContext?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      await this.supabase
        .from('webhook_security_events')
        .insert({
          event_type: eventType,
          organization_id: details.organizationId,
          user_id: details.userId,
          element_id: details.elementId,
          ip_address: details.ipAddress,
          user_agent: details.userAgent,
          description: details.description,
          severity: details.severity,
          context: details.additionalContext || {},
          request_id: this.requestId,
          detected_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Log admin audit events
   */
  async logAdminAudit(
    action: 'webhook_created' | 'webhook_updated' | 'webhook_deleted' | 'webhook_tested',
    details: {
      adminUserId: string;
      organizationId: string;
      webhookId?: string;
      elementId?: string;
      changes?: Record<string, any>;
      reason?: string;
    }
  ): Promise<void> {
    try {
      await this.supabase
        .from('webhook_admin_audit')
        .insert({
          action,
          admin_user_id: details.adminUserId,
          organization_id: details.organizationId,
          webhook_id: details.webhookId,
          element_id: details.elementId,
          changes: details.changes || {},
          reason: details.reason,
          request_id: this.requestId,
          performed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log admin audit:', error);
    }
  }

  /**
   * Generate performance insights and alerts
   */
  async generatePerformanceAlerts(
    webhookId: string,
    organizationId: string,
    currentMetrics: PerformanceMetrics
  ): Promise<void> {
    try {
      const alerts: Array<{
        type: string;
        severity: string;
        message: string;
        threshold: number;
        currentValue: number;
      }> = [];

      // Response time alerts
      if (currentMetrics.averageResponseTime > 10000) { // 10 seconds
        alerts.push({
          type: 'slow_response',
          severity: currentMetrics.averageResponseTime > 30000 ? 'critical' : 'warning',
          message: `Webhook response time is ${currentMetrics.averageResponseTime}ms`,
          threshold: 10000,
          currentValue: currentMetrics.averageResponseTime
        });
      }

      // Error rate alerts
      if (currentMetrics.successRate < 0.95) { // Below 95%
        alerts.push({
          type: 'high_error_rate',
          severity: currentMetrics.successRate < 0.8 ? 'critical' : 'warning',
          message: `Webhook success rate is ${(currentMetrics.successRate * 100).toFixed(1)}%`,
          threshold: 95,
          currentValue: currentMetrics.successRate * 100
        });
      }

      // High execution volume alerts
      if (currentMetrics.executionsLastHour > 1000) {
        alerts.push({
          type: 'high_volume',
          severity: currentMetrics.executionsLastHour > 5000 ? 'warning' : 'info',
          message: `High webhook execution volume: ${currentMetrics.executionsLastHour} in last hour`,
          threshold: 1000,
          currentValue: currentMetrics.executionsLastHour
        });
      }

      // Store alerts if any exist
      if (alerts.length > 0) {
        await this.supabase
          .from('webhook_performance_alerts')
          .insert(
            alerts.map(alert => ({
              webhook_id: webhookId,
              organization_id: organizationId,
              alert_type: alert.type,
              severity: alert.severity,
              message: alert.message,
              threshold_value: alert.threshold,
              current_value: alert.currentValue,
              request_id: this.requestId,
              generated_at: new Date().toISOString()
            }))
          );
      }
    } catch (error) {
      console.error('Failed to generate performance alerts:', error);
    }
  }

  /**
   * Private helper methods
   */

  private getStatusFromError(errorType: ErrorType): ExecutionStatus {
    switch (errorType) {
      case ErrorType.NETWORK_TIMEOUT:
        return ExecutionStatus.TIMEOUT;
      case ErrorType.RATE_LIMIT_EXCEEDED:
        return ExecutionStatus.RATE_LIMITED;
      case ErrorType.AUTH_INVALID_CREDENTIALS:
      case ErrorType.AUTH_INSUFFICIENT_PERMISSIONS:
        return ExecutionStatus.UNAUTHORIZED;
      case ErrorType.WEBHOOK_NOT_FOUND:
      case ErrorType.WEBHOOK_DISABLED:
      case ErrorType.SYSTEM_CONFIGURATION_ERROR:
        return ExecutionStatus.CONFIGURATION_ERROR;
      default:
        return ExecutionStatus.FAILURE;
    }
  }

  private async updateWebhookStats(
    webhookId: string,
    result: WebhookExecutionResult
  ): Promise<void> {
    try {
      await this.supabase.rpc('update_webhook_execution_stats', {
        p_webhook_id: webhookId,
        p_success: result.success,
        p_response_time_ms: result.responseTime,
        p_error_type: result.error?.type || null
      });
    } catch (error) {
      console.error('Failed to update webhook stats:', error);
    }
  }

  private async logPerformanceMetrics(
    webhookId: string,
    organizationId: string,
    result: WebhookExecutionResult
  ): Promise<void> {
    try {
      await this.supabase
        .from('webhook_performance_metrics')
        .insert({
          webhook_id: webhookId,
          organization_id: organizationId,
          response_time_ms: result.responseTime,
          network_latency_ms: result.metadata.networkLatency,
          processing_time_ms: result.metadata.processingTime,
          memory_usage_mb: result.metadata.memoryUsage || 0,
          success: result.success,
          error_type: result.error?.type || null,
          recorded_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log performance metrics:', error);
    }
  }

  private async incrementErrorCount(
    webhookId: string,
    errorType: ErrorType
  ): Promise<void> {
    try {
      await this.supabase.rpc('increment_webhook_error_count', {
        p_webhook_id: webhookId,
        p_error_type: errorType
      });
    } catch (error) {
      console.error('Failed to increment error count:', error);
    }
  }

  /**
   * Structured logging for different event types
   */
  
  log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, any>): void {
    const logEntry = {
      level,
      message,
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      context: context || {}
    };
    
    console.log(JSON.stringify(logEntry));
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.log('error', message, context);
  }

  /**
   * Performance timing utilities
   */
  
  startTiming(label: string): number {
    const start = performance.now();
    this.info(`Starting: ${label}`, { timing: { start } });
    return start;
  }

  endTiming(label: string, startTime: number): number {
    const end = performance.now();
    const duration = end - startTime;
    this.info(`Completed: ${label}`, { 
      timing: { 
        start: startTime, 
        end, 
        duration 
      } 
    });
    return duration;
  }

  /**
   * Context enrichment for debugging
   */
  
  enrichContext(additionalContext: Record<string, any>): void {
    this.info('Context enriched', additionalContext);
  }

  /**
   * Cleanup and finalization
   */
  
  async finalize(): Promise<void> {
    const totalDuration = performance.now() - this.startTime;
    this.info('Request completed', { 
      requestId: this.requestId,
      totalDuration 
    });
  }
}