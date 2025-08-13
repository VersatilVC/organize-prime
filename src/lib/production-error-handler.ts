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

  constructor() {
    this.isProduction = typeof window !== 'undefined' && 
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1');
    
    if (this.isProduction) {
      this.setupGlobalErrorHandlers();
    }
  }

  static getInstance(): ProductionErrorHandler {
    if (!ProductionErrorHandler.instance) {
      ProductionErrorHandler.instance = new ProductionErrorHandler();
    }
    return ProductionErrorHandler.instance;
  }

  private setupGlobalErrorHandlers() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, {
        type: 'unhandledrejection',
        promise: true,
      });
    });
  }

  captureError(error: Error, additionalInfo?: ErrorInfo) {
    if (!this.isProduction) {
      console.error('Development Error:', error, additionalInfo);
      return;
    }

    const errorReport: ErrorReport = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      environment: 'production',
      additionalInfo,
    };

    // Add to queue for batch processing
    this.errorQueue.push(errorReport);
    
    // Log to console for immediate debugging
    console.error('🚨 Production Error Captured:', {
      message: errorReport.message,
      url: errorReport.url,
      timestamp: errorReport.timestamp,
      stack: errorReport.stack?.substring(0, 200) + '...',
    });

    // Process queue
    this.processErrorQueue();
  }

  private async processErrorQueue() {
    if (this.errorQueue.length === 0) return;

    // For now, log to console since we don't have external error service
    // In production, this would send to Sentry, LogRocket, or similar service
    const errors = [...this.errorQueue];
    this.errorQueue = [];

    console.group('🔍 Production Error Batch Report');
    errors.forEach((error, index) => {
      console.error(`Error ${index + 1}:`, error);
    });
    console.groupEnd();
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

// React Error Boundary helper
export const handleReactError = (error: Error, errorInfo: ErrorInfo) => {
  productionErrorHandler.captureReactError(error, errorInfo);
};

// Manual error reporting helper
export const reportError = (message: string, additionalInfo?: any) => {
  productionErrorHandler.reportError(message, additionalInfo);
};