import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Info } from 'lucide-react';
import { useConnectionHealth } from './ConnectionStatus';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils';

interface OfflineStatusBannerProps {
  className?: string;
  showRetryButton?: boolean;
}

export function OfflineStatusBanner({ 
  className, 
  showRetryButton = true 
}: OfflineStatusBannerProps) {
  const { isConnected, isOffline, hasErrors } = useConnectionHealth();
  const { retryConnection } = useOrganization();
  const [isRetrying, setIsRetrying] = React.useState(false);

  // Don't show banner if everything is working fine
  if (isConnected && !hasErrors) {
    return null;
  }

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryConnection();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Alert 
      variant={isOffline ? "default" : "destructive"} 
      className={cn("border-l-4", className)}
    >
      <div className="flex items-center gap-2">
        {isOffline ? (
          <WifiOff className="h-4 w-4 text-orange-500" />
        ) : (
          <Wifi className="h-4 w-4 text-red-500" />
        )}
        <Info className="h-4 w-4" />
      </div>
      
      <AlertDescription className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="font-medium">
            {isOffline ? "Working Offline" : "Connection Issues"}
          </div>
          <div className="text-sm text-muted-foreground">
            {isOffline ? (
              "Using cached data. Some features may be limited until connection is restored."
            ) : (
              "Unable to connect to the database. Please check your internet connection."
            )}
          </div>
        </div>

        {showRetryButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="ml-4 flex-shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRetrying && "animate-spin")} />
            {isRetrying ? "Retrying..." : "Retry Connection"}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Compact status indicator for use in headers/toolbars
 */
export function CompactOfflineIndicator() {
  const { isConnected, isOffline } = useConnectionHealth();

  if (isConnected) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
      {isOffline ? (
        <>
          <WifiOff className="h-3 w-3 text-orange-500" />
          <span>Offline</span>
        </>
      ) : (
        <>
          <Wifi className="h-3 w-3 text-red-500" />
          <span>No Connection</span>
        </>
      )}
    </div>
  );
}

/**
 * Smart fallback component that shows appropriate content based on connection status
 */
interface SmartFallbackProps {
  children: React.ReactNode;
  fallbackContent?: React.ReactNode;
  offlineContent?: React.ReactNode;
  loadingContent?: React.ReactNode;
  isLoading?: boolean;
}

export function SmartFallback({
  children,
  fallbackContent,
  offlineContent,
  loadingContent,
  isLoading = false
}: SmartFallbackProps) {
  const { isConnected, isOffline } = useConnectionHealth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        {loadingContent || (
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading...</span>
          </div>
        )}
      </div>
    );
  }

  if (isOffline && offlineContent) {
    return <>{offlineContent}</>;
  }

  if (!isConnected && fallbackContent) {
    return <>{fallbackContent}</>;
  }

  return <>{children}</>;
}

/**
 * Hook to provide offline-aware data loading states
 */
export function useOfflineAwareQuery<T>(
  data: T | undefined,
  isLoading: boolean,
  error: Error | null,
  fallbackData?: T
) {
  const { isOffline } = useConnectionHealth();

  return React.useMemo(() => {
    // If we have data, always return it
    if (data !== undefined) {
      return {
        data,
        isLoading,
        error,
        isOffline: false,
        isEmpty: false,
      };
    }

    // If we're loading and not offline, show loading state
    if (isLoading && !isOffline) {
      return {
        data: undefined,
        isLoading: true,
        error: null,
        isOffline: false,
        isEmpty: false,
      };
    }

    // If we have an error but we're offline and have fallback data, use it
    if (error && isOffline && fallbackData !== undefined) {
      return {
        data: fallbackData,
        isLoading: false,
        error: null,
        isOffline: true,
        isEmpty: false,
      };
    }

    // If we have an error and no fallback, show error state
    if (error) {
      return {
        data: undefined,
        isLoading: false,
        error,
        isOffline,
        isEmpty: false,
      };
    }

    // Empty state
    return {
      data: undefined,
      isLoading: false,
      error: null,
      isOffline,
      isEmpty: true,
    };
  }, [data, isLoading, error, isOffline, fallbackData]);
}