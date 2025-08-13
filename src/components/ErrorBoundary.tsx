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
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Enhanced production error reporting
    try {
      import('@/lib/production-error-handler').then(({ handleReactError }) => {
        handleReactError(error, errorInfo);
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return <Fallback error={this.state.error!} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback = ({ 
  error, 
  resetError 
}: { 
  error: Error; 
  resetError: () => void; 
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
    fallback={({ error, resetError }) => (
      <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
        <div className="flex items-center gap-2 text-destructive mb-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">Loading Error</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Failed to load this content. {error.message}
        </p>
        <Button size="sm" variant="outline" onClick={resetError}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export const FormErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary
    fallback={({ error, resetError }) => (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Form Error</p>
            <p className="text-sm">{error.message}</p>
            <Button size="sm" variant="outline" onClick={resetError}>
              Reset Form
            </Button>
          </div>
        </AlertDescription>
      </Alert>
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