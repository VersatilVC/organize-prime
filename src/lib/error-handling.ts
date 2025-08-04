// Centralized error handling system for consistent error management
import { toast } from '@/hooks/use-toast';

// Custom error classes for better error categorization
export class ValidationError extends Error {
  constructor(message: string, public field?: string, public validationErrors?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class BusinessLogicError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

export class ServiceError extends Error {
  constructor(message: string, public originalError?: any, public statusCode?: number) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error context interface
export interface ErrorContext {
  userId?: string;
  organizationId?: string;
  route?: string;
  userAgent?: string;
  timestamp?: string;
  additionalData?: Record<string, any>;
}

// Error log entry interface
export interface ErrorLogEntry {
  error: Error;
  context?: string;
  severity: ErrorSeverity;
  errorContext?: ErrorContext;
  stackTrace?: string;
  userMessage: string;
}

// Centralized error handler singleton
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorLogEntry[] = [];
  private maxLogSize = 100; // Keep last 100 errors in memory
  
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Main error handling method with optional severity
  handleError(error: any, context?: string, severity: ErrorSeverity = ErrorSeverity.MEDIUM): void {
    const normalizedError = this.normalizeError(error);
    const userMessage = this.getUserFriendlyMessage(normalizedError);
    const errorContext = this.buildErrorContext();

    // Log error entry
    const logEntry: ErrorLogEntry = {
      error: normalizedError,
      context,
      severity,
      errorContext,
      stackTrace: normalizedError.stack,
      userMessage
    };

    this.logError(logEntry);

    // Show user notification based on severity
    this.showUserNotification(normalizedError, userMessage, severity);

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logToExternalService(logEntry);
    }
  }

  // Handle async operations with automatic error catching
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: string,
    options?: {
      severity?: ErrorSeverity;
      suppressToast?: boolean;
      fallbackValue?: T;
    }
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      if (!options?.suppressToast) {
        this.handleError(error, context, options?.severity);
      }
      return options?.fallbackValue;
    }
  }

  // Handle sync operations with automatic error catching
  withErrorHandlingSync<T>(
    operation: () => T,
    context?: string,
    options?: {
      severity?: ErrorSeverity;
      suppressToast?: boolean;
      fallbackValue?: T;
    }
  ): T | undefined {
    try {
      return operation();
    } catch (error) {
      if (!options?.suppressToast) {
        this.handleError(error, context, options?.severity);
      }
      return options?.fallbackValue;
    }
  }

  // Normalize different error types to Error instances
  private normalizeError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    
    if (typeof error === 'string') {
      return new Error(error);
    }
    
    if (error?.message) {
      return new Error(error.message);
    }
    
    return new Error('Unknown error occurred');
  }

  // Get user-friendly error messages
  getUserFriendlyMessage(error: any): string {
    // Handle custom error types
    if (error instanceof ValidationError) {
      return error.message || "Please check your input and try again.";
    }
    
    if (error instanceof BusinessLogicError) {
      return error.message || "Unable to complete the operation.";
    }
    
    if (error instanceof ServiceError) {
      if (error.statusCode === 404) {
        return "The requested resource could not be found.";
      }
      if (error.statusCode === 403) {
        return "You don't have permission to perform this action.";
      }
      if (error.statusCode === 500) {
        return "Server error. Please try again later.";
      }
      return "Unable to complete the request. Please try again.";
    }

    if (error instanceof NetworkError) {
      return "Network error. Please check your connection and try again.";
    }

    if (error instanceof AuthenticationError) {
      return "Please sign in to continue.";
    }

    if (error instanceof AuthorizationError) {
      return "You don't have permission to perform this action.";
    }

    // Supabase specific errors
    if (error?.code === 'PGRST301') {
      return "Access denied. You don't have permission to perform this action.";
    }
    
    if (error?.code === 'PGRST116') {
      return "The requested item was not found.";
    }
    
    if (error?.code === '23505') {
      return "This item already exists.";
    }
    
    if (error?.code === '23503') {
      return "Cannot complete this action due to related data.";
    }
    
    // Handle Supabase/JWT errors
    if (error?.message?.includes('JWT') || error?.message?.includes('Invalid token')) {
      return "Your session has expired. Please sign in again.";
    }
    
    // Network errors
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      return "Network error. Please check your connection and try again.";
    }
    
    if (error?.message?.includes('timeout')) {
      return "Request timed out. Please try again.";
    }
    
    if (error?.message?.includes('rate limit')) {
      return "Too many requests. Please wait a moment and try again.";
    }

    if (error?.message?.includes('PERMISSION_DENIED')) {
      return "You don't have permission to perform this action.";
    }

    if (error?.message?.includes('NOT_FOUND')) {
      return "The requested resource could not be found.";
    }
    
    // Generic fallback
    if (error?.message) {
      return error.message;
    }
    
    return "An unexpected error occurred. Please try again.";
  }

  // Build error context for logging
  private buildErrorContext(): ErrorContext {
    if (typeof window === 'undefined') {
      return { timestamp: new Date().toISOString() };
    }

    return {
      route: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      additionalData: {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        url: window.location.href
      }
    };
  }

  // Show user notification based on error severity
  private showUserNotification(error: Error, userMessage: string, severity: ErrorSeverity): void {
    const title = this.getNotificationTitle(severity);
    
    toast({
      title,
      description: userMessage,
      variant: severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH 
        ? "destructive" 
        : "default",
      duration: severity === ErrorSeverity.CRITICAL ? 10000 : 5000
    });
  }

  // Get notification title based on severity
  private getNotificationTitle(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return "Critical Error";
      case ErrorSeverity.HIGH:
        return "Error";
      case ErrorSeverity.MEDIUM:
        return "Something went wrong";
      case ErrorSeverity.LOW:
        return "Warning";
      default:
        return "Notification";
    }
  }

  // Log error to internal storage
  private logError(logEntry: ErrorLogEntry): void {
    this.errorLog.unshift(logEntry);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error${logEntry.context ? ` in ${logEntry.context}` : ''} [${logEntry.severity}]`);
      console.error('Error:', logEntry.error);
      console.log('User Message:', logEntry.userMessage);
      console.log('Context:', logEntry.errorContext);
      if (logEntry.stackTrace) {
        console.log('Stack Trace:', logEntry.stackTrace);
      }
      console.groupEnd();
    }
  }

  // Log to external service (Sentry, LogRocket, etc.)
  private logToExternalService(logEntry: ErrorLogEntry): void {
    try {
      // Example implementation for external logging
      // In a real app, you'd integrate with services like Sentry
      
      // Sentry.captureException(logEntry.error, {
      //   tags: {
      //     context: logEntry.context,
      //     severity: logEntry.severity
      //   },
      //   extra: logEntry.errorContext
      // });

      // Or send to your own logging endpoint
      // fetch('/api/logs/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     error: logEntry.error.message,
      //     stack: logEntry.stackTrace,
      //     context: logEntry.context,
      //     severity: logEntry.severity,
      //     errorContext: logEntry.errorContext,
      //     timestamp: new Date().toISOString()
      //   })
      // }).catch(() => {}); // Silently fail logging errors
      
    } catch (error) {
      // Silently fail if external logging fails
      console.warn('Failed to log to external service:', error);
    }
  }

  // Method to check if error should trigger logout
  shouldLogout(error: any): boolean {
    return error?.message?.includes('JWT') || 
           error?.message?.includes('Invalid token') ||
           error?.code === 'auth/invalid-token';
  }

  // Method to check if error is temporary (should retry)
  isTemporaryError(error: any): boolean {
    return error?.message?.includes('network') ||
           error?.message?.includes('timeout') ||
           error?.code === 'ECONNRESET';
  }

  // Get recent errors for debugging
  getRecentErrors(count: number = 10): ErrorLogEntry[] {
    return this.errorLog.slice(0, count);
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Get error statistics
  getErrorStats(): { total: number; bySeverity: Record<ErrorSeverity, number> } {
    const bySeverity = this.errorLog.reduce((acc, entry) => {
      acc[entry.severity] = (acc[entry.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    return {
      total: this.errorLog.length,
      bySeverity
    };
  }
}

// React hook for using error handler in components
export const useErrorHandler = () => {
  const errorHandler = ErrorHandler.getInstance();
  
  return {
    // Basic error handling (backward compatible)
    handleError: (error: any, context?: string, severity?: ErrorSeverity) => 
      errorHandler.handleError(error, context, severity),

    // Async wrapper with error handling
    withErrorHandling: <T>(
      operation: () => Promise<T>,
      context?: string,
      options?: {
        severity?: ErrorSeverity;
        suppressToast?: boolean;
        fallbackValue?: T;
      }
    ) => errorHandler.withErrorHandling(operation, context, options),

    // Sync wrapper with error handling
    withErrorHandlingSync: <T>(
      operation: () => T,
      context?: string,
      options?: {
        severity?: ErrorSeverity;
        suppressToast?: boolean;
        fallbackValue?: T;
      }
    ) => errorHandler.withErrorHandlingSync(operation, context, options),

    // Utility methods
    getRecentErrors: (count?: number) => errorHandler.getRecentErrors(count),
    clearErrorLog: () => errorHandler.clearErrorLog(),
    getErrorStats: () => errorHandler.getErrorStats(),
    getUserFriendlyMessage: (error: any) => errorHandler.getUserFriendlyMessage(error),
    shouldLogout: (error: any) => errorHandler.shouldLogout(error),
    isTemporaryError: (error: any) => errorHandler.isTemporaryError(error),

    // Error types for use in components
    ValidationError,
    BusinessLogicError,
    ServiceError,
    NetworkError,
    AuthenticationError,
    AuthorizationError,
    ErrorSeverity
  };
};

// Retry utility with exponential backoff
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error instanceof ValidationError || 
          error instanceof BusinessLogicError ||
          !ErrorHandler.getInstance().isTemporaryError(error)) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Global error handler for uncaught errors
export const setupGlobalErrorHandling = () => {
  if (typeof window !== 'undefined') {
    const errorHandler = ErrorHandler.getInstance();

    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      errorHandler.handleError(
        event.error || new Error(event.message),
        'Global Error Handler',
        ErrorSeverity.HIGH
      );
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      errorHandler.handleError(
        event.reason,
        'Unhandled Promise Rejection',
        ErrorSeverity.HIGH
      );
      event.preventDefault();
    });
  }
};

// Export singleton instance for direct use
export const errorHandler = ErrorHandler.getInstance();
