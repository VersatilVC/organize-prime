import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class AdvancedErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error details
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service (if available)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId(),
    };

    // In a real app, send this to your error tracking service
    console.error('Error Report:', errorReport);
    
    // Store in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('error_reports') || '[]');
      existingErrors.push(errorReport);
      localStorage.setItem('error_reports', JSON.stringify(existingErrors.slice(-10))); // Keep last 10 errors
    } catch (e) {
      console.error('Failed to store error report:', e);
    }
  };

  private getCurrentUserId = () => {
    // Get current user ID from auth context or localStorage
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || 'anonymous';
    } catch {
      return 'anonymous';
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
      });
    } else {
      // Max retries reached, reload page
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const bugReport = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Create mailto link with bug report
    const subject = encodeURIComponent(`Bug Report: ${this.state.error?.message}`);
    const body = encodeURIComponent(`
Error ID: ${bugReport.errorId}
URL: ${bugReport.url}
Error Message: ${bugReport.message}

Please describe what you were doing when this error occurred:
[Your description here]

Technical Details:
${bugReport.stack}
${bugReport.componentStack}
    `);

    window.open(`mailto:support@organizeprime.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.retryCount < this.maxRetries;
      const isChunkError = this.state.error?.message?.includes('ChunkLoadError') || 
                          this.state.error?.message?.includes('Loading chunk');

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {isChunkError ? 'Loading Error' : 'Something went wrong'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {isChunkError ? (
                  <p>
                    There was a problem loading part of the application. This usually happens when the app has been updated.
                  </p>
                ) : (
                  <p>
                    An unexpected error occurred. Our team has been notified and is working on a fix.
                  </p>
                )}
              </div>

              {this.props.showDetails && this.state.error && (
                <details className="text-xs bg-muted p-3 rounded-md">
                  <summary className="cursor-pointer font-medium mb-2">
                    Technical Details
                  </summary>
                  <div className="space-y-2">
                    <div>
                      <strong>Error ID:</strong> {this.state.errorId}
                    </div>
                    <div>
                      <strong>Message:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="mt-1 whitespace-pre-wrap text-xs">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {(canRetry || isChunkError) && (
                  <Button 
                    onClick={this.handleRetry}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {isChunkError ? 'Reload App' : 'Try Again'}
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>

                {!isChunkError && (
                  <Button 
                    variant="outline" 
                    onClick={this.handleReportBug}
                    className="flex items-center gap-2"
                  >
                    <Bug className="h-4 w-4" />
                    Report Bug
                  </Button>
                )}
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Error ID: {this.state.errorId}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for error reporting
export function useErrorReporting() {
  const reportError = (error: Error, context?: any) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    console.error('Manual error report:', errorReport);
    
    // Store in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('manual_errors') || '[]');
      existingErrors.push(errorReport);
      localStorage.setItem('manual_errors', JSON.stringify(existingErrors.slice(-10)));
    } catch (e) {
      console.error('Failed to store manual error:', e);
    }
  };

  return { reportError };
}

// Global error handler setup
export function setupGlobalErrorHandling() {
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Handle chunk loading errors specifically
    const reason = event.reason;
    if (reason?.message?.includes('Loading chunk') || 
        reason?.message?.includes('ChunkLoadError')) {
      console.warn('Chunk loading error detected, reloading page...');
      window.location.reload();
    }
  });

  // Catch global errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });
}