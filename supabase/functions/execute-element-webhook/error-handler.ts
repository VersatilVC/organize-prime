/**
 * Advanced error handling and recovery mechanisms for webhook execution
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import {
  ElementWebhookRequest,
  WebhookConfiguration,
  ExecutionError,
  ErrorType,
  ExecutionStatus,
  RETRY_DELAYS
} from "./types.ts";
import { LoggingService } from "./logging-service.ts";

export class ErrorHandler {
  private supabase: any;
  private logger: LoggingService;
  private requestId: string;

  constructor(
    supabaseUrl: string, 
    supabaseKey: string, 
    logger: LoggingService,
    requestId: string
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger = logger;
    this.requestId = requestId;
  }

  /**
   * Handle execution errors with appropriate recovery strategies
   */
  async handleExecutionError(
    error: ExecutionError,
    request: ElementWebhookRequest,
    config: WebhookConfiguration,
    executionId: string,
    attemptNumber: number = 1
  ): Promise<{
    shouldRetry: boolean;
    retryDelay?: number;
    recoveryAction?: string;
    escalationRequired?: boolean;
  }> {
    try {
      this.logger.error('Webhook execution error', {
        executionId,
        errorType: error.type,
        errorMessage: error.message,
        attemptNumber,
        retryable: error.retryable
      });

      // Log the error to database
      await this.logger.logExecutionError(executionId, error, config, request);

      // Determine recovery strategy based on error type
      const recoveryStrategy = this.determineRecoveryStrategy(error, attemptNumber, config);

      // Execute recovery actions if needed
      if (recoveryStrategy.recoveryAction) {
        await this.executeRecoveryAction(
          recoveryStrategy.recoveryAction,
          error,
          request,
          config,
          executionId
        );
      }

      // Check if escalation is needed
      if (recoveryStrategy.escalationRequired) {
        await this.escalateError(error, request, config, executionId, attemptNumber);
      }

      // Update error statistics
      await this.updateErrorStatistics(config.id, error.type, attemptNumber);

      return recoveryStrategy;

    } catch (handlingError) {
      this.logger.error('Error in error handling', {
        originalError: error.message,
        handlingError: handlingError.message,
        executionId
      });

      // Fallback strategy when error handling itself fails
      return {
        shouldRetry: false,
        escalationRequired: true,
        recoveryAction: 'fallback_emergency_stop'
      };
    }
  }

  /**
   * Determine the appropriate recovery strategy for an error
   */
  private determineRecoveryStrategy(
    error: ExecutionError,
    attemptNumber: number,
    config: WebhookConfiguration
  ): {
    shouldRetry: boolean;
    retryDelay?: number;
    recoveryAction?: string;
    escalationRequired?: boolean;
  } {
    const maxAttempts = config.retryCount + 1;

    switch (error.type) {
      case ErrorType.NETWORK_TIMEOUT:
        return this.handleNetworkTimeout(attemptNumber, maxAttempts);

      case ErrorType.NETWORK_UNREACHABLE:
        return this.handleNetworkUnreachable(attemptNumber, maxAttempts);

      case ErrorType.SERVER_INTERNAL_ERROR:
        return this.handleServerError(attemptNumber, maxAttempts);

      case ErrorType.SERVER_RATE_LIMITED:
        return this.handleRateLimit(error, attemptNumber, maxAttempts);

      case ErrorType.AUTH_INVALID_CREDENTIALS:
      case ErrorType.AUTH_EXPIRED_TOKEN:
        return this.handleAuthError(error, attemptNumber);

      case ErrorType.CLIENT_PAYLOAD_TOO_LARGE:
        return this.handlePayloadError(attemptNumber);

      case ErrorType.VALIDATION_URL_INVALID:
      case ErrorType.VALIDATION_PAYLOAD_INVALID:
        return this.handleValidationError(error);

      case ErrorType.WEBHOOK_NOT_FOUND:
      case ErrorType.WEBHOOK_DISABLED:
        return this.handleConfigurationError(error);

      case ErrorType.RATE_LIMIT_EXCEEDED:
        return this.handleSystemRateLimit(error, attemptNumber);

      case ErrorType.SYSTEM_OVERLOADED:
        return this.handleSystemOverload(attemptNumber, maxAttempts);

      default:
        return this.handleUnknownError(attemptNumber, maxAttempts);
    }
  }

  /**
   * Specific error handling strategies
   */

  private handleNetworkTimeout(
    attemptNumber: number,
    maxAttempts: number
  ): { shouldRetry: boolean; retryDelay?: number; recoveryAction?: string } {
    if (attemptNumber < maxAttempts) {
      return {
        shouldRetry: true,
        retryDelay: RETRY_DELAYS[Math.min(attemptNumber - 1, RETRY_DELAYS.length - 1)] * 2, // Double delay for timeouts
        recoveryAction: 'increase_timeout'
      };
    }
    return {
      shouldRetry: false,
      recoveryAction: 'mark_endpoint_unreachable',
      escalationRequired: true
    };
  }

  private handleNetworkUnreachable(
    attemptNumber: number,
    maxAttempts: number
  ): { shouldRetry: boolean; retryDelay?: number; recoveryAction?: string } {
    if (attemptNumber < Math.min(maxAttempts, 3)) { // Limit retries for unreachable endpoints
      return {
        shouldRetry: true,
        retryDelay: RETRY_DELAYS[Math.min(attemptNumber - 1, RETRY_DELAYS.length - 1)],
        recoveryAction: 'check_endpoint_health'
      };
    }
    return {
      shouldRetry: false,
      recoveryAction: 'disable_webhook_temporarily',
      escalationRequired: true
    };
  }

  private handleServerError(
    attemptNumber: number,
    maxAttempts: number
  ): { shouldRetry: boolean; retryDelay?: number; recoveryAction?: string; escalationRequired?: boolean } {
    if (attemptNumber < maxAttempts) {
      return {
        shouldRetry: true,
        retryDelay: RETRY_DELAYS[Math.min(attemptNumber - 1, RETRY_DELAYS.length - 1)],
        recoveryAction: 'log_server_error'
      };
    }
    return {
      shouldRetry: false,
      recoveryAction: 'notify_endpoint_admin',
      escalationRequired: attemptNumber >= 3
    };
  }

  private handleRateLimit(
    error: ExecutionError,
    attemptNumber: number,
    maxAttempts: number
  ): { shouldRetry: boolean; retryDelay?: number; recoveryAction?: string } {
    // Extract retry-after from error details if available
    const retryAfter = error.details?.retryAfter || 60000; // Default 1 minute
    
    if (attemptNumber < maxAttempts && retryAfter < 300000) { // Don't wait more than 5 minutes
      return {
        shouldRetry: true,
        retryDelay: retryAfter,
        recoveryAction: 'respect_rate_limit'
      };
    }
    return {
      shouldRetry: false,
      recoveryAction: 'schedule_delayed_execution'
    };
  }

  private handleAuthError(
    error: ExecutionError,
    attemptNumber: number
  ): { shouldRetry: boolean; recoveryAction?: string; escalationRequired?: boolean } {
    if (attemptNumber === 1) {
      return {
        shouldRetry: true,
        recoveryAction: 'refresh_auth_credentials'
      };
    }
    return {
      shouldRetry: false,
      recoveryAction: 'notify_auth_failure',
      escalationRequired: true
    };
  }

  private handlePayloadError(
    attemptNumber: number
  ): { shouldRetry: boolean; recoveryAction?: string } {
    if (attemptNumber === 1) {
      return {
        shouldRetry: true,
        recoveryAction: 'compress_payload'
      };
    }
    return {
      shouldRetry: false,
      recoveryAction: 'split_payload_chunks'
    };
  }

  private handleValidationError(
    error: ExecutionError
  ): { shouldRetry: boolean; recoveryAction?: string; escalationRequired?: boolean } {
    return {
      shouldRetry: false,
      recoveryAction: 'fix_configuration',
      escalationRequired: true
    };
  }

  private handleConfigurationError(
    error: ExecutionError
  ): { shouldRetry: boolean; recoveryAction?: string; escalationRequired?: boolean } {
    return {
      shouldRetry: false,
      recoveryAction: 'check_webhook_config',
      escalationRequired: true
    };
  }

  private handleSystemRateLimit(
    error: ExecutionError,
    attemptNumber: number
  ): { shouldRetry: boolean; retryDelay?: number; recoveryAction?: string } {
    const retryAfter = error.details?.retryAfter || 60000;
    
    return {
      shouldRetry: attemptNumber <= 2, // Limited retries for system rate limits
      retryDelay: retryAfter,
      recoveryAction: 'throttle_requests'
    };
  }

  private handleSystemOverload(
    attemptNumber: number,
    maxAttempts: number
  ): { shouldRetry: boolean; retryDelay?: number; recoveryAction?: string; escalationRequired?: boolean } {
    if (attemptNumber < Math.min(maxAttempts, 2)) {
      return {
        shouldRetry: true,
        retryDelay: RETRY_DELAYS[RETRY_DELAYS.length - 1], // Use maximum delay
        recoveryAction: 'back_off_aggressively'
      };
    }
    return {
      shouldRetry: false,
      recoveryAction: 'queue_for_later',
      escalationRequired: true
    };
  }

  private handleUnknownError(
    attemptNumber: number,
    maxAttempts: number
  ): { shouldRetry: boolean; retryDelay?: number; escalationRequired?: boolean } {
    if (attemptNumber < Math.min(maxAttempts, 2)) {
      return {
        shouldRetry: true,
        retryDelay: RETRY_DELAYS[Math.min(attemptNumber - 1, RETRY_DELAYS.length - 1)]
      };
    }
    return {
      shouldRetry: false,
      escalationRequired: true
    };
  }

  /**
   * Execute specific recovery actions
   */
  private async executeRecoveryAction(
    action: string,
    error: ExecutionError,
    request: ElementWebhookRequest,
    config: WebhookConfiguration,
    executionId: string
  ): Promise<void> {
    try {
      this.logger.info(`Executing recovery action: ${action}`, {
        executionId,
        errorType: error.type
      });

      switch (action) {
        case 'increase_timeout':
          await this.suggestTimeoutIncrease(config.id);
          break;

        case 'mark_endpoint_unreachable':
          await this.markEndpointUnreachable(config.id);
          break;

        case 'disable_webhook_temporarily':
          await this.disableWebhookTemporarily(config.id, '1 hour');
          break;

        case 'check_endpoint_health':
          await this.checkEndpointHealth(config.endpointUrl, executionId);
          break;

        case 'notify_endpoint_admin':
          await this.notifyEndpointAdmin(config, error);
          break;

        case 'refresh_auth_credentials':
          await this.suggestAuthRefresh(config.id);
          break;

        case 'compress_payload':
          await this.logPayloadCompressionSuggestion(config.id);
          break;

        case 'fix_configuration':
          await this.logConfigurationIssue(config.id, error);
          break;

        case 'queue_for_later':
          await this.queueForLaterExecution(request, config, executionId);
          break;

        default:
          this.logger.warn(`Unknown recovery action: ${action}`, { executionId });
      }
    } catch (recoveryError) {
      this.logger.error('Recovery action failed', {
        action,
        error: recoveryError.message,
        executionId
      });
    }
  }

  /**
   * Escalate errors to appropriate channels
   */
  private async escalateError(
    error: ExecutionError,
    request: ElementWebhookRequest,
    config: WebhookConfiguration,
    executionId: string,
    attemptNumber: number
  ): Promise<void> {
    try {
      const escalationLevel = this.determineEscalationLevel(error, attemptNumber);
      
      await this.logger.logSecurityEvent('webhook_escalation', {
        organizationId: request.organizationId,
        userId: request.userContext.userId,
        elementId: request.elementId,
        description: `Webhook execution failed with escalation: ${error.message}`,
        severity: escalationLevel,
        additionalContext: {
          executionId,
          webhookId: config.id,
          errorType: error.type,
          attemptNumber,
          endpointUrl: config.endpointUrl
        }
      });

      // Create escalation notification
      await this.createEscalationNotification(
        request.organizationId,
        config.id,
        error,
        escalationLevel,
        executionId
      );

    } catch (escalationError) {
      this.logger.error('Error escalation failed', {
        originalError: error.message,
        escalationError: escalationError.message,
        executionId
      });
    }
  }

  /**
   * Helper methods for recovery actions
   */

  private async suggestTimeoutIncrease(webhookId: string): Promise<void> {
    await this.supabase
      .from('webhook_optimization_suggestions')
      .insert({
        webhook_id: webhookId,
        suggestion_type: 'increase_timeout',
        description: 'Consider increasing timeout due to network latency',
        priority: 'medium',
        created_at: new Date().toISOString()
      });
  }

  private async markEndpointUnreachable(webhookId: string): Promise<void> {
    await this.supabase
      .from('element_webhooks')
      .update({
        health_status: 'unreachable',
        last_health_check: new Date().toISOString()
      })
      .eq('id', webhookId);
  }

  private async disableWebhookTemporarily(webhookId: string, duration: string): Promise<void> {
    const disableUntil = new Date();
    disableUntil.setHours(disableUntil.getHours() + 1); // 1 hour default

    await this.supabase
      .from('element_webhooks')
      .update({
        is_active: false,
        disabled_until: disableUntil.toISOString(),
        disable_reason: 'automatic_temporary_disable_due_to_failures'
      })
      .eq('id', webhookId);
  }

  private async checkEndpointHealth(url: string, executionId: string): Promise<void> {
    try {
      const healthCheck = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });

      await this.supabase
        .from('webhook_health_checks')
        .insert({
          endpoint_url: url,
          execution_id: executionId,
          status_code: healthCheck.status,
          response_time_ms: 0, // Would need to measure
          healthy: healthCheck.ok,
          checked_at: new Date().toISOString()
        });
    } catch (error) {
      this.logger.warn('Health check failed', { url, error: error.message });
    }
  }

  private async notifyEndpointAdmin(config: WebhookConfiguration, error: ExecutionError): Promise<void> {
    // This would integrate with notification system
    this.logger.info('Endpoint admin notification triggered', {
      webhookId: config.id,
      endpointUrl: config.endpointUrl,
      errorType: error.type
    });
  }

  private async suggestAuthRefresh(webhookId: string): Promise<void> {
    await this.supabase
      .from('webhook_optimization_suggestions')
      .insert({
        webhook_id: webhookId,
        suggestion_type: 'refresh_auth',
        description: 'Authentication credentials may need refreshing',
        priority: 'high',
        created_at: new Date().toISOString()
      });
  }

  private async logPayloadCompressionSuggestion(webhookId: string): Promise<void> {
    await this.supabase
      .from('webhook_optimization_suggestions')
      .insert({
        webhook_id: webhookId,
        suggestion_type: 'compress_payload',
        description: 'Payload size is large, consider compression or splitting',
        priority: 'medium',
        created_at: new Date().toISOString()
      });
  }

  private async logConfigurationIssue(webhookId: string, error: ExecutionError): Promise<void> {
    await this.supabase
      .from('webhook_configuration_issues')
      .insert({
        webhook_id: webhookId,
        issue_type: error.type,
        description: error.message,
        suggested_fix: error.suggestedAction,
        severity: 'high',
        created_at: new Date().toISOString()
      });
  }

  private async queueForLaterExecution(
    request: ElementWebhookRequest,
    config: WebhookConfiguration,
    executionId: string
  ): Promise<void> {
    const retryAt = new Date();
    retryAt.setMinutes(retryAt.getMinutes() + 15); // Retry in 15 minutes

    await this.supabase
      .from('webhook_retry_queue')
      .insert({
        execution_id: executionId,
        webhook_id: config.id,
        organization_id: request.organizationId,
        original_request: request,
        retry_at: retryAt.toISOString(),
        retry_count: 0,
        max_retries: 3,
        created_at: new Date().toISOString()
      });
  }

  private determineEscalationLevel(error: ExecutionError, attemptNumber: number): 'low' | 'medium' | 'high' | 'critical' {
    if (attemptNumber >= 5) return 'critical';
    
    const criticalErrors = [
      ErrorType.SYSTEM_DATABASE_ERROR,
      ErrorType.SYSTEM_CONFIGURATION_ERROR,
      ErrorType.AUTH_INSUFFICIENT_PERMISSIONS
    ];
    
    const highErrors = [
      ErrorType.WEBHOOK_NOT_FOUND,
      ErrorType.WEBHOOK_DISABLED,
      ErrorType.VALIDATION_URL_INVALID
    ];

    if (criticalErrors.includes(error.type)) return 'critical';
    if (highErrors.includes(error.type)) return 'high';
    if (attemptNumber >= 3) return 'medium';
    
    return 'low';
  }

  private async createEscalationNotification(
    organizationId: string,
    webhookId: string,
    error: ExecutionError,
    severity: string,
    executionId: string
  ): Promise<void> {
    await this.supabase
      .from('webhook_escalations')
      .insert({
        organization_id: organizationId,
        webhook_id: webhookId,
        execution_id: executionId,
        error_type: error.type,
        error_message: error.message,
        severity,
        escalated_at: new Date().toISOString(),
        status: 'open'
      });
  }

  private async updateErrorStatistics(
    webhookId: string,
    errorType: ErrorType,
    attemptNumber: number
  ): Promise<void> {
    try {
      await this.supabase.rpc('update_webhook_error_stats', {
        p_webhook_id: webhookId,
        p_error_type: errorType,
        p_attempt_number: attemptNumber
      });
    } catch (error) {
      this.logger.error('Failed to update error statistics', {
        webhookId,
        errorType,
        error: error.message
      });
    }
  }

  /**
   * Create standardized error objects
   */
  createError(type: ErrorType, message: string, details?: any): ExecutionError {
    const retryableErrors = [
      ErrorType.NETWORK_TIMEOUT,
      ErrorType.NETWORK_UNREACHABLE,
      ErrorType.SERVER_INTERNAL_ERROR,
      ErrorType.SERVER_RATE_LIMITED,
      ErrorType.SERVER_OVERLOADED,
      ErrorType.SYSTEM_OVERLOADED
    ];

    return {
      type,
      message,
      details: details || {},
      retryable: retryableErrors.includes(type),
      suggestedAction: this.getSuggestedAction(type)
    };
  }

  private getSuggestedAction(errorType: ErrorType): string {
    const suggestions: Record<ErrorType, string> = {
      [ErrorType.NETWORK_TIMEOUT]: 'Increase timeout or check network connectivity',
      [ErrorType.NETWORK_UNREACHABLE]: 'Verify endpoint URL and network configuration',
      [ErrorType.AUTH_INVALID_CREDENTIALS]: 'Update authentication credentials',
      [ErrorType.WEBHOOK_NOT_FOUND]: 'Configure webhook for this element',
      [ErrorType.WEBHOOK_DISABLED]: 'Enable webhook in configuration',
      [ErrorType.RATE_LIMIT_EXCEEDED]: 'Reduce request frequency or increase limits',
      [ErrorType.CLIENT_PAYLOAD_TOO_LARGE]: 'Reduce payload size or enable compression',
      [ErrorType.VALIDATION_URL_INVALID]: 'Update webhook URL to use HTTPS',
      [ErrorType.SYSTEM_OVERLOADED]: 'Try again later when system load decreases'
    } as any;

    return suggestions[errorType] || 'Review configuration and try again';
  }
}