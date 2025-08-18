import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  renderCount: number;
  lastErrorTime: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  private maxRetries = 3;
  private retryDelay = 1000;
  private errorThrottleMs = 5000; // Throttle same errors
  
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorId: null,
      renderCount: 0,
      lastErrorTime: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const now = Date.now();
    const errorId = `${error.name}-${error.message.slice(0, 50)}`;
    
    return { 
      hasError: true, 
      error,
      errorId,
      renderCount: 0, // Reset render count on new error
      lastErrorTime: now
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const now = Date.now();
    
    // Prevent error loops - check if this is the same error happening too frequently
    if (this.state.errorId && 
        this.state.lastErrorTime && 
        (now - this.state.lastErrorTime) < this.errorThrottleMs) {
      console.warn('ErrorBoundary: Throttling repeated error:', error.message);
      return;
    }
    
    // Increment render count to detect potential loops
    this.setState(prevState => ({
      renderCount: prevState.renderCount + 1
    }));
    
    // If we've rendered too many times, something is wrong
    if (this.state.renderCount > this.maxRetries) {
      console.error('ErrorBoundary: Too many error renders, stopping to prevent infinite loop');
      return;
    }
    
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Call custom error handler if provided
    try {
      this.props.onError?.(error, errorInfo);
    } catch (handlerError) {
      console.error('Error in custom error handler:', handlerError);
    }
    
    // Enhanced production error reporting with safety
    try {
      import('@/lib/production-error-handler').then(({ handleReactError }) => {
        handleReactError(error, errorInfo);
      }).catch(reportingError => {
        console.debug('Failed to report error:', reportingError);
      });
    } catch (reportingError) {
      console.debug('Failed to import error handler:', reportingError);
    }
  }

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorId: null,
      renderCount: 0,
      lastErrorTime: 0
    });
  };
  
  componentDidUpdate(prevProps: Props, prevState: State) {
    // Reset error state if children prop changes (new content to render)
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.resetError();
    }
    
    // Auto-retry after delay if not too many retries
    if (!prevState.hasError && this.state.hasError && this.state.renderCount <= this.maxRetries) {
      setTimeout(() => {
        if (this.state.hasError && this.state.renderCount <= this.maxRetries) {
          console.log('ErrorBoundary: Auto-retrying after error...');
          this.resetError();
        }
      }, this.retryDelay * this.state.renderCount); // Exponential backoff
    }
  }

  render() {
    if (this.state.hasError) {
      // If too many render attempts, show a simplified error
      if (this.state.renderCount > this.maxRetries) {
        return (
          <div className="min-h-[200px] flex items-center justify-center p-4">
            <div className="text-center space-y-2">
              <p className="text-destructive font-medium">Application Error</p>
              <p className="text-sm text-muted-foreground">Please refresh the page</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Refresh Page
              </button>
            </div>
          </div>
        );
      }
      
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return (
        <Fallback 
          error={this.state.error!} 
          resetError={this.resetError}
          retryCount={this.state.renderCount}
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback = ({ 
  error, 
  resetError,
  retryCount = 0
}: { 
  error: Error; 
  resetError: () => void;
  retryCount?: number;
}) => (
  <div 
    className="min-h-[400px] flex items-center justify-center p-6"
    role="alert"
    aria-labelledby="error-title"
    aria-describedby="error-description"
  >
    <Alert className="max-w-md">
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <AlertDescription className="space-y-4">
        <div>
          <h3 id="error-title" className="font-semibold mb-2">
            Something went wrong
          </h3>
          <p id="error-description" className="text-sm text-muted-foreground">
            {error.message || 'An unexpected error occurred. Please try again.'}
            {retryCount > 0 && (
              <span className="block mt-1 text-xs text-muted-foreground">
                Retry attempt: {retryCount}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={resetError} 
            size="sm"
            className="min-w-0"
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Try Again
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
            className="min-w-0"
          >
            Reload Page
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            asChild
            className="min-w-0"
          >
            <Link to="/">
              <Home className="h-4 w-4 mr-2" aria-hidden="true" />
              Go Home
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  </div>
);

// Specialized error boundaries for different parts of the app
export const AsyncErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary
    fallback={({ error, resetError, retryCount }) => (
      <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
        <div className="flex items-center gap-2 text-destructive mb-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">Loading Error</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Failed to load this content. {error.message}
          {retryCount && retryCount > 0 && (
            <span className="block mt-1 text-xs">Attempt: {retryCount}</span>
          )}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={resetError}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          {retryCount && retryCount > 2 && (
            <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          )}
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export const FormErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary
    fallback={({ error, resetError, retryCount }) => (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Form Error</p>
            <p className="text-sm">
              {error.message}
              {retryCount && retryCount > 0 && (
                <span className="block mt-1 text-xs text-muted-foreground">
                  Retry attempt: {retryCount}
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={resetError}>
                Reset Form
              </Button>
              {retryCount && retryCount > 2 && (
                <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    )}
  >
    {children}
  </ErrorBoundary>
);

// New: Route-specific error boundary for better UX
export const RouteErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary
    fallback={({ error, resetError, retryCount }) => (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Page Loading Error</h3>
              <p className="text-sm">
                This page failed to load properly.
                {retryCount && retryCount > 0 && (
                  <span className="block mt-1 text-xs text-muted-foreground">
                    Retry attempt: {retryCount}
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={resetError}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
              {retryCount && retryCount > 2 && (
                <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

// Hook for handling async errors in components
export const useErrorHandler = () => {
  return React.useCallback((error: Error) => {
    // Re-throw the error to be caught by the nearest error boundary
    throw error;
  }, []);
};