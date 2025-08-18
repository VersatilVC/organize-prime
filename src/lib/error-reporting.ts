/**
 * Centralized Error Reporting System
 * Provides safe, production-ready error reporting with multiple fallback mechanisms
 */

import { logger } from './secure-logger';
import { productionErrorHandler } from './production-error-handler';

export interface ErrorContext {
  component?: string;
  feature?: string;
  userId?: string;
  organizationId?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface ErrorReport {
  message: string;
  error?: Error;
  context?: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  environment: 'development' | 'production';
}

class ErrorReportingService {
  private static instance: ErrorReportingService;
  private isEnabled: boolean;
  private reportQueue: ErrorReport[] = [];
  private maxQueueSize = 100;
  private batchTimeout = 5000; // 5 seconds
  private batchTimer: NodeJS.Timeout | null = null;

  constructor() {
    try {
      this.isEnabled = import.meta.env?.VITE_ENABLE_ERROR_REPORTING !== 'false';
    } catch {
      this.isEnabled = true; // Default to enabled
    }
  }

  static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  /**
   * Report an error with context
   */
  reportError(
    message: string,
    error?: Error,
    context?: ErrorContext,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    if (!this.isEnabled) return;

    try {
      const errorReport: ErrorReport = {
        message: this.sanitizeMessage(message),
        error,
        context: this.sanitizeContext(context),
        severity,
        timestamp: new Date().toISOString(),
        environment: import.meta.env?.DEV ? 'development' : 'production'
      };

      this.addToQueue(errorReport);
      this.scheduleProcessing();

      // Immediate handling for critical errors
      if (severity === 'critical') {
        this.handleCriticalError(errorReport);
      }
    } catch (reportingError) {
      this.handleReportingFailure(message, reportingError);
    }
  }

  /**
   * Report a React component error
   */
  reportComponentError(
    error: Error,
    componentName: string,
    context?: ErrorContext
  ): void {
    this.reportError(
      `Component error in ${componentName}`,
      error,
      { ...context, component: componentName },
      'high'
    );
  }

  /**
   * Report a network/API error
   */
  reportNetworkError(
    error: Error,
    endpoint: string,
    context?: ErrorContext
  ): void {
    this.reportError(
      `Network error: ${endpoint}`,
      error,
      { ...context, action: 'network_request' },
      'medium'
    );
  }

  /**
   * Report a performance issue
   */
  reportPerformanceIssue(
    operation: string,
    duration: number,
    context?: ErrorContext
  ): void {
    if (duration > 5000) { // Only report if > 5 seconds
      this.reportError(
        `Performance issue: ${operation} took ${duration}ms`,
        undefined,
        { ...context, action: 'performance' },
        duration > 10000 ? 'high' : 'medium'
      );
    }
  }

  /**
   * Report a user action error
   */
  reportUserActionError(
    action: string,
    error: Error,
    context?: ErrorContext
  ): void {
    this.reportError(
      `User action failed: ${action}`,
      error,
      { ...context, action },
      'medium'
    );
  }

  private addToQueue(report: ErrorReport): void {
    try {
      this.reportQueue.push(report);
      
      // Prevent queue from growing too large
      if (this.reportQueue.length > this.maxQueueSize) {
        this.reportQueue = this.reportQueue.slice(-this.maxQueueSize);
      }
    } catch (error) {
      console.debug('Failed to add error to queue:', error);
    }
  }

  private scheduleProcessing(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.processBatch();
      this.batchTimer = null;
    }, this.batchTimeout);
  }

  private processBatch(): void {
    if (this.reportQueue.length === 0) return;

    try {
      const batch = [...this.reportQueue];
      this.reportQueue = [];

      // Process through multiple channels
      this.processWithLogger(batch);
      this.processWithProductionHandler(batch);
      
      // Future: Send to external service (Sentry, LogRocket, etc.)
      // this.sendToExternalService(batch);
    } catch (error) {
      console.debug('Failed to process error batch:', error);
    }
  }

  private processWithLogger(batch: ErrorReport[]): void {
    try {
      batch.forEach(report => {
        const logMessage = `${report.severity.toUpperCase()}: ${report.message}`;
        
        switch (report.severity) {
          case 'critical':
          case 'high':
            logger.error(logMessage, report.error, report.context);
            break;
          case 'medium':
            logger.warn(logMessage, report.context);
            break;
          case 'low':
            logger.info(logMessage, report.context);
            break;
        }
      });
    } catch (error) {
      console.debug('Logger processing failed:', error);
    }
  }

  private processWithProductionHandler(batch: ErrorReport[]): void {
    try {
      batch.forEach(report => {
        if (report.error) {
          productionErrorHandler.captureError(report.error, {
            severity: report.severity,
            context: report.context,
            timestamp: report.timestamp
          });
        }
      });
    } catch (error) {
      console.debug('Production handler processing failed:', error);
    }
  }

  private handleCriticalError(report: ErrorReport): void {
    try {
      // Immediate console output for critical errors
      console.error('🚨 CRITICAL ERROR:', {
        message: report.message,
        timestamp: report.timestamp,
        component: report.context?.component
      });

      // Try to send immediately (future enhancement)
      // this.sendToExternalService([report], true);
    } catch (error) {
      console.debug('Critical error handling failed:', error);
    }
  }

  private handleReportingFailure(originalMessage: string, reportingError: unknown): void {
    try {
      console.error('Error reporting failed:', {
        original: originalMessage,
        reportingError: reportingError instanceof Error ? reportingError.message : String(reportingError)
      });
    } catch {
      // Silent failure - last resort
    }
  }

  private sanitizeMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return 'Invalid error message';
    }

    return message
      .replace(/token[:\s]*[a-zA-Z0-9_\-\.]+/gi, 'token:***')
      .replace(/key[:\s]*[a-zA-Z0-9_\-\.]+/gi, 'key:***')
      .replace(/password[:\s]*[^\s]+/gi, 'password:***')
      .replace(/secret[:\s]*[a-zA-Z0-9_\-\.]+/gi, 'secret:***')
      .slice(0, 500); // Limit message length
  }

  private sanitizeContext(context?: ErrorContext): ErrorContext | undefined {
    if (!context) return undefined;

    try {
      return {
        component: context.component,
        feature: context.feature,
        userId: context.userId ? this.hashId(context.userId) : undefined,
        organizationId: context.organizationId ? this.hashId(context.organizationId) : undefined,
        action: context.action,
        metadata: this.sanitizeMetadata(context.metadata)
      };
    } catch {
      return { component: 'sanitization-failed' };
    }
  }

  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    try {
      const sanitized: Record<string, any> = {};
      Object.entries(metadata).forEach(([key, value]) => {
        // Skip sensitive keys
        if (/token|key|password|secret|auth/i.test(key)) {
          sanitized[key] = '***';
        } else if (typeof value === 'string' && value.length > 100) {
          sanitized[key] = value.slice(0, 100) + '...';
        } else {
          sanitized[key] = value;
        }
      });
      return sanitized;
    } catch {
      return { error: 'metadata-sanitization-failed' };
    }
  }

  private hashId(id: string): string {
    try {
      return id.slice(0, 4) + '***';
    } catch {
      return '***';
    }
  }

  /**
   * Force immediate processing of queued errors
   */
  flush(): void {
    try {
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }
      this.processBatch();
    } catch (error) {
      console.debug('Error flush failed:', error);
    }
  }

  /**
   * Get current queue status
   */
  getStatus(): { queueSize: number; isEnabled: boolean } {
    return {
      queueSize: this.reportQueue.length,
      isEnabled: this.isEnabled
    };
  }
}

// Export singleton instance
export const errorReporting = ErrorReportingService.getInstance();

// Convenience functions
export const reportError = (
  message: string,
  error?: Error,
  context?: ErrorContext,
  severity?: 'low' | 'medium' | 'high' | 'critical'
) => errorReporting.reportError(message, error, context, severity);

export const reportComponentError = (
  error: Error,
  componentName: string,
  context?: ErrorContext
) => errorReporting.reportComponentError(error, componentName, context);

export const reportNetworkError = (
  error: Error,
  endpoint: string,
  context?: ErrorContext
) => errorReporting.reportNetworkError(error, endpoint, context);

export const reportPerformanceIssue = (
  operation: string,
  duration: number,
  context?: ErrorContext
) => errorReporting.reportPerformanceIssue(operation, duration, context);

export const reportUserActionError = (
  action: string,
  error: Error,
  context?: ErrorContext
) => errorReporting.reportUserActionError(action, error, context);