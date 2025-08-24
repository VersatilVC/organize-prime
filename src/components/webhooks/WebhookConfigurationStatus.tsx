import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  Zap, 
  ExternalLink,
  Info
} from 'lucide-react';
import { usePageWebhooks } from '@/hooks/usePageWebhooks';
import { useNavigate } from 'react-router-dom';

interface WebhookConfigurationStatusProps {
  /** Current page/feature for webhook checking */
  featurePage: string;
  
  /** Specific button positions to check (if not provided, shows general status) */
  positions?: string[];
  
  /** Whether to show detailed configuration info */
  detailed?: boolean;
  
  /** Compact mode for smaller spaces */
  compact?: boolean;
  
  /** Custom className */
  className?: string;
}

/**
 * Component that shows webhook configuration status and provides guidance
 * Helps users understand webhook setup and troubleshoot issues
 */
export function WebhookConfigurationStatus({
  featurePage,
  positions = [],
  detailed = false,
  compact = false,
  className,
}: WebhookConfigurationStatusProps) {
  const navigate = useNavigate();
  const {
    pageAssignments,
    availablePositions,
    isLoading,
    error,
    totalWebhooks,
    activeWebhooks,
  } = usePageWebhooks(featurePage);

  const goToWebhookManagement = () => {
    navigate('/admin/webhooks');
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-muted rounded w-48"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>
          Failed to load webhook configuration. Please check your connection.
        </AlertDescription>
      </Alert>
    );
  }

  // Check specific positions if requested
  const positionStatus = positions.map(position => {
    const assignment = pageAssignments.find(a => a.position === position);
    return {
      position,
      hasWebhook: !!assignment && assignment.isActive,
      webhookName: assignment?.webhook?.name || null,
      isActive: assignment?.isActive || false,
    };
  });

  const totalCheckedPositions = positions.length;
  const configuredPositions = positionStatus.filter(p => p.hasWebhook).length;

  // Determine overall status
  const getOverallStatus = () => {
    if (positions.length > 0) {
      // Checking specific positions
      if (configuredPositions === 0) {
        return { type: 'warning', message: 'No webhooks configured for required positions' };
      } else if (configuredPositions < totalCheckedPositions) {
        return { type: 'warning', message: `${configuredPositions}/${totalCheckedPositions} positions configured` };
      } else {
        return { type: 'success', message: 'All required positions configured' };
      }
    } else {
      // General page status
      if (totalWebhooks === 0) {
        return { type: 'info', message: 'No webhooks configured for this page' };
      } else if (activeWebhooks < totalWebhooks) {
        return { type: 'warning', message: `${activeWebhooks}/${totalWebhooks} webhooks active` };
      } else {
        return { type: 'success', message: `${totalWebhooks} webhooks configured and active` };
      }
    }
  };

  const status = getOverallStatus();

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {status.type === 'success' && (
          <CheckCircle className="h-4 w-4 text-green-600" />
        )}
        {status.type === 'warning' && (
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        )}
        {status.type === 'info' && (
          <Info className="h-4 w-4 text-blue-600" />
        )}
        <span className="text-sm text-muted-foreground">
          {status.message}
        </span>
        {(status.type === 'warning' || (status.type === 'info' && totalWebhooks === 0)) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={goToWebhookManagement}
            className="h-6 px-2"
          >
            <Settings className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  const alertVariant = status.type === 'success' ? 'default' : 
                     status.type === 'warning' ? 'destructive' : 'default';

  return (
    <Alert variant={alertVariant} className={className}>
      {status.type === 'success' && <CheckCircle className="h-4 w-4" />}
      {status.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
      {status.type === 'info' && <Info className="h-4 w-4" />}
      
      <AlertTitle className="flex items-center gap-2">
        Webhook Configuration
        <Badge variant="outline" className="text-xs">
          {featurePage}
        </Badge>
      </AlertTitle>
      
      <AlertDescription className="space-y-3">
        <p>{status.message}</p>
        
        {detailed && positions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Position Status:</h4>
            <div className="grid gap-2">
              {positionStatus.map(pos => (
                <div key={pos.position} className="flex items-center justify-between text-sm">
                  <span className="font-mono">{pos.position}</span>
                  <div className="flex items-center gap-2">
                    {pos.hasWebhook ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">{pos.webhookName}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3 w-3 text-yellow-600" />
                        <span className="text-muted-foreground">Not configured</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {detailed && positions.length === 0 && totalWebhooks > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Available Webhooks:</h4>
            <div className="grid gap-1">
              {availablePositions.map(pos => (
                <div key={pos.position} className="flex items-center gap-2 text-sm">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="font-mono">{pos.position}</span>
                  <span className="text-muted-foreground">→ {pos.webhookName}</span>
                  <Badge variant={pos.isActive ? 'default' : 'secondary'} className="text-xs">
                    {pos.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {(status.type === 'warning' || (status.type === 'info' && totalWebhooks === 0)) && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={goToWebhookManagement}>
              <Settings className="h-4 w-4 mr-2" />
              Configure Webhooks
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open('/admin/webhooks', '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Quick status indicator for specific webhook positions
 */
export function WebhookPositionIndicator({
  featurePage,
  position,
  className,
}: {
  featurePage: string;
  position: string;
  className?: string;
}) {
  return (
    <WebhookConfigurationStatus
      featurePage={featurePage}
      positions={[position]}
      compact={true}
      className={className}
    />
  );
}

/**
 * Detailed webhook configuration panel
 */
export function WebhookConfigurationPanel({
  featurePage,
  requiredPositions = [],
  className,
}: {
  featurePage: string;
  requiredPositions?: string[];
  className?: string;
}) {
  return (
    <WebhookConfigurationStatus
      featurePage={featurePage}
      positions={requiredPositions}
      detailed={true}
      className={className}
    />
  );
}