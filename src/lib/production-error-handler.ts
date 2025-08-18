/**
 * Production Error Handling and Logging
 * Captures and reports errors in production environment
 */

interface ErrorInfo {
  componentStack?: string;
  errorBoundary?: boolean;
  [key: string]: any;
}

interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  environment: string;
  userId?: string;
  additionalInfo?: ErrorInfo;
}

class ProductionErrorHandler {
  private static instance: ProductionErrorHandler;
  private errorQueue: ErrorReport[] = [];
  private isProduction: boolean;
  private isDevelopment: boolean;
  private maxQueueSize = 50;
  private isSetupComplete = false;
  private errorCounts = new Map<string, number>();
  private errorThrottleLimit = 5; // Max same errors per minute

  constructor() {
    try {
      this.isDevelopment = import.meta.env?.DEV ?? false;
      this.isProduction = import.meta.env?.PROD ?? false;
      
      // Fallback detection
      if (!this.isDevelopment && !this.isProduction) {
        this.isProduction = typeof window !== 'undefined' && 
          !window.location.hostname.includes('localhost') &&
          !window.location.hostname.includes('127.0.0.1') &&
          !window.location.hostname.includes('dev');
        this.isDevelopment = !this.isProduction;
      }
    } catch {
      // Safe fallback
      this.isProduction = true;
      this.isDevelopment = false;
    }
    
    this.setupErrorHandlers();
  }
  
  private setupErrorHandlers() {
    try {
      // Always setup error handlers, but behavior differs by environment
      this.setupGlobalErrorHandlers();
      this.isSetupComplete = true;
    } catch (error) {
      console.error('Failed to setup error handlers:', error);
    }
  }

  static getInstance(): ProductionErrorHandler {
    if (!ProductionErrorHandler.instance) {
      ProductionErrorHandler.instance = new ProductionErrorHandler();
    }
    return ProductionErrorHandler.instance;
  }

  private setupGlobalErrorHandlers() {
    if (typeof window === 'undefined') return;
    
    try {
      // Handle uncaught JavaScript errors
      window.addEventListener('error', (event) => {
        try {
          this.captureError(event.error || new Error(event.message || 'Unknown error'), {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            type: 'javascript_error'
          });
        } catch (handlerError) {
          console.error('Error in error handler:', handlerError);
        }
      }, { passive: true });

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        try {
          const error = event.reason instanceof Error ? 
            event.reason : 
            new Error(String(event.reason || 'Unhandled promise rejection'));
            
          this.captureError(error, {
            type: 'unhandledrejection',
            promise: true,
          });
        } catch (handlerError) {
          console.error('Error in promise rejection handler:', handlerError);
        }
      }, { passive: true });
    } catch (setupError) {
      console.error('Failed to setup global error handlers:', setupError);
    }
  }

  captureError(error: Error, additionalInfo?: ErrorInfo) {
    try {
      // Always capture errors but handle differently by environment
      const errorKey = `${error.name}-${error.message?.slice(0, 50) || 'unknown'}`;
      
      // Throttle identical errors
      const currentCount = this.errorCounts.get(errorKey) || 0;
      if (currentCount >= this.errorThrottleLimit) {
        return; // Skip this error to prevent spam
      }
      this.errorCounts.set(errorKey, currentCount + 1);
      
      // Reset error counts every minute
      setTimeout(() => {
        this.errorCounts.delete(errorKey);
      }, 60000);

      if (this.isDevelopment) {
        console.error('Development Error:', error, additionalInfo);
        return;
      }

      const errorReport: ErrorReport = {
        message: this.sanitizeMessage(error.message || 'Unknown error'),
        stack: this.isProduction ? undefined : error.stack, // No stack traces in production
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        timestamp: new Date().toISOString(),
        environment: this.isProduction ? 'production' : 'development',
        additionalInfo,
      };

      // Add to queue with size limit
      this.errorQueue.push(errorReport);
      if (this.errorQueue.length > this.maxQueueSize) {
        this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
      }
      
      // Safe console logging
      try {
        console.error('🚨 Error Captured:', {
          message: errorReport.message,
          timestamp: errorReport.timestamp,
          environment: errorReport.environment
        });
      } catch {
        // Silent failure for console errors
      }

      // Process queue safely
      this.processErrorQueue();
    } catch (captureError) {
      // Last resort error handling
      try {
        console.error('Error capture failed:', captureError);
      } catch {
        // Complete silent failure
      }
    }
  }
  
  private sanitizeMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return 'Invalid error message';
    }
    
    // Remove sensitive information from error messages
    return message
      .replace(/token[:\s]*[a-zA-Z0-9_\-\.]+/gi, 'token:***')
      .replace(/key[:\s]*[a-zA-Z0-9_\-\.]+/gi, 'key:***')
      .replace(/password[:\s]*[^\s]+/gi, 'password:***')
      .replace(/secret[:\s]*[a-zA-Z0-9_\-\.]+/gi, 'secret:***');
  }

  private async processErrorQueue() {
    if (this.errorQueue.length === 0) return;

    try {
      // For now, log to console since we don't have external error service
      // In production, this would send to Sentry, LogRocket, or similar service
      const errors = [...this.errorQueue];
      this.errorQueue = [];

      if (this.isDevelopment) {
        try {
          console.group('🔍 Error Batch Report');
          errors.forEach((error, index) => {
            console.error(`Error ${index + 1}:`, error);
          });
          console.groupEnd();
        } catch {
          // Fallback if console.group is not available
          errors.forEach((error, index) => {
            try {
              console.error(`Error ${index + 1}:`, error);
            } catch {
              // Silent failure
            }
          });
        }
      } else {
        // Production: minimal logging
        try {
          console.error(`Processed ${errors.length} error(s)`);
        } catch {
          // Silent failure
        }
      }
    } catch (processError) {
      // Silent failure to prevent error processing from breaking the app
    }
  }

  // Method for React Error Boundaries
  captureReactError(error: Error, errorInfo: ErrorInfo) {
    this.captureError(error, {
      ...errorInfo,
      errorBoundary: true,
    });
  }

  // Method for manual error reporting
  reportError(message: string, additionalInfo?: any) {
    const error = new Error(message);
    this.captureError(error, additionalInfo);
  }
}

export const productionErrorHandler = ProductionErrorHandler.getInstance();

// React Error Boundary helper with safety
export const handleReactError = (error: Error, errorInfo: ErrorInfo) => {
  try {
    productionErrorHandler.captureReactError(error, errorInfo);
  } catch (handlerError) {
    console.error('Failed to handle React error:', handlerError);
  }
};

// Manual error reporting helper with safety
export const reportError = (message: string, additionalInfo?: any) => {
  try {
    productionErrorHandler.reportError(message, additionalInfo);
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError);
  }
};

// Safe error reporting for critical errors
export const reportCriticalError = (message: string, error?: Error) => {
  try {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    productionErrorHandler.reportError(errorMessage, { critical: true });
  } catch {
    // Last resort
    try {
      console.error('CRITICAL ERROR:', message);
    } catch {
      // Complete silent failure
    }
  }
};