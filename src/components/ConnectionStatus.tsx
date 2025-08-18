import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getConnectionStatus, checkConnection } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/contexts/PermissionContext';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function ConnectionStatus({ showDetails = false, className }: ConnectionStatusProps) {
  const [connectionState, setConnectionState] = useState(getConnectionStatus());
  const [isChecking, setIsChecking] = useState(false);
  const { error: orgError, retryConnection } = useOrganization();
  const { error: permError, isOffline } = usePermissions();

  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionState(getConnectionStatus());
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    setIsChecking(true);
    try {
      await checkConnection();
      await retryConnection();
      setConnectionState(getConnectionStatus());
    } catch (error) {
      console.error('Connection retry failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const hasError = !!(orgError || permError);
  const isConnected = connectionState.isConnected && !hasError;

  if (!showDetails && isConnected) {
    return null; // Don't show anything when everything is working
  }

  return (
    <div className={className}>
      {hasError && (
        <Alert variant={isOffline ? "default" : "destructive"} className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              {isOffline ? (
                <span>Working offline with cached data. Some features may be limited.</span>
              ) : (
                <span>Database connection issues detected. Please check your internet connection.</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isChecking}
              className="ml-4"
            >
              {isChecking ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {showDetails && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">
              Connection Status
            </span>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Online" : "Offline"}
            </Badge>
          </div>

          {connectionState.retryCount > 0 && (
            <div className="text-sm text-muted-foreground">
              Retry attempts: {connectionState.retryCount}
            </div>
          )}

          {connectionState.timeSinceLastSuccess > 60000 && (
            <div className="text-sm text-muted-foreground">
              Last successful operation: {Math.floor(connectionState.timeSinceLastSuccess / 1000)}s ago
            </div>
          )}

          {connectionState.lastError && (
            <div className="text-sm text-red-600">
              Last error: {connectionState.lastError.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simple status indicator for app header
 */
export function ConnectionIndicator() {
  const [connectionState, setConnectionState] = useState(getConnectionStatus());
  const { error: orgError } = useOrganization();
  const { error: permError, isOffline } = usePermissions();

  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionState(getConnectionStatus());
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const hasError = !!(orgError || permError);
  const isConnected = connectionState.isConnected && !hasError;

  // Only show when there are issues
  if (isConnected) {
    return null;
  }

  return (
    <Badge 
      variant={isOffline ? "secondary" : "destructive"} 
      className="ml-2"
      title={isOffline ? "Working offline" : "Connection issues"}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-3 w-3 mr-1" />
          Offline
        </>
      ) : (
        <>
          <AlertTriangle className="h-3 w-3 mr-1" />
          Connection Issue
        </>
      )}
    </Badge>
  );
}

/**
 * Hook to get overall connection health
 */
export function useConnectionHealth() {
  const [connectionState, setConnectionState] = useState(getConnectionStatus());
  const { error: orgError, isOffline: orgOffline } = useOrganization();
  const { error: permError, isOffline: permOffline } = usePermissions();

  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionState(getConnectionStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected: connectionState.isConnected && !orgError && !permError,
    isOffline: orgOffline || permOffline,
    hasErrors: !!(orgError || permError),
    retryCount: connectionState.retryCount,
    lastError: connectionState.lastError,
    timeSinceLastSuccess: connectionState.timeSinceLastSuccess,
  };
}