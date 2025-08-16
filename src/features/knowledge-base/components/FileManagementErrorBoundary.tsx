import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class FileManagementErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      retryCount: 0 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('File Management Error Boundary caught an error:', error, errorInfo);
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Send to error reporting service
      console.error('Error in File Management:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      retryCount: 0 
    });
  };

  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < this.maxRetries;
      const isConnectionError = this.state.error?.message?.includes('subscription') ||
                               this.state.error?.message?.includes('connection') ||
                               this.state.error?.message?.includes('websocket');

      return (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              {this.props.fallbackTitle || 'File Management Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {this.props.fallbackDescription || 
                 'Something went wrong with the file management system. This might be due to a connection issue or temporary problem.'}
              </AlertDescription>
            </Alert>

            {this.state.error && (
              <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                <p className="font-medium">Error Details:</p>
                <p className="mt-1">{this.state.error.message}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              {canRetry && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={this.handleReset}
              >
                Reset Component
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>

            {isConnectionError && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This appears to be a connection issue. Real-time updates may not work properly. 
                  Check your internet connection and try refreshing the page.
                </AlertDescription>
              </Alert>
            )}

            {!canRetry && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Maximum retry attempts reached. Please refresh the page or contact support if the problem persists.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// HOC wrapper for easier usage
export function withFileManagementErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackTitle?: string,
  fallbackDescription?: string
) {
  return function WrappedComponent(props: P) {
    return (
      <FileManagementErrorBoundary 
        fallbackTitle={fallbackTitle}
        fallbackDescription={fallbackDescription}
      >
        <Component {...props} />
      </FileManagementErrorBoundary>
    );
  };
}