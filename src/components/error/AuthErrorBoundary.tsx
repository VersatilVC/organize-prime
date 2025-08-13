import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Auth Error Boundary caught an error:', error);
    console.error('🔍 Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
    
    // Log to localStorage for debugging
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      route: window.location.pathname,
    };
    
    try {
      const existingLogs = JSON.parse(localStorage.getItem('auth-errors') || '[]');
      existingLogs.push(errorLog);
      localStorage.setItem('auth-errors', JSON.stringify(existingLogs.slice(-10))); // Keep last 10 errors
    } catch (e) {
      console.error('Failed to log error to localStorage:', e);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Authentication Error</CardTitle>
              <CardDescription>
                Something went wrong with the authentication system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <p className="font-medium mb-1">Error Details:</p>
                <p className="font-mono text-xs break-all">
                  {this.state.error?.message || 'Unknown error'}
                </p>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={this.resetError} 
                  className="w-full"
                  variant="default"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                
                <Button 
                  onClick={() => window.location.href = '/'} 
                  className="w-full"
                  variant="outline"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
                
                <Button 
                  onClick={() => window.location.reload()} 
                  className="w-full"
                  variant="ghost"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground text-center">
                Error logged to browser console for debugging
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}