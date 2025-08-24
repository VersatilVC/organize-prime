import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Zap } from 'lucide-react';
import { useWebhookTrigger } from '@/hooks/useWebhookTrigger';
import { useToast } from '@/hooks/use-toast';
import { UnifiedWebhookService } from '@/services/UnifiedWebhookService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/auth/AuthProvider';

interface WebhookTriggerButtonProps {
  /** Webhook name OR assignment-based trigger */
  webhookName?: string;
  
  /** Assignment-based webhook trigger (more robust) */
  featurePage?: string;
  buttonPosition?: string;
  
  payload?: Record<string, any>;
  context?: {
    action?: string;
    component?: string;
    metadata?: Record<string, any>;
  };
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
  disabled?: boolean;
  showWebhookStatus?: boolean;
  
  /** Show webhook indicator icon */
  showWebhookIcon?: boolean;
}

/**
 * Enhanced button component that triggers webhooks
 * Supports both name-based and assignment-based webhook triggering
 * Assignment-based is more robust and future-proof
 */
export function WebhookTriggerButton({
  webhookName,
  featurePage,
  buttonPosition,
  payload = {},
  context,
  onSuccess,
  onError,
  children,
  variant = 'default',
  size = 'default',
  disabled = false,
  showWebhookStatus = false,
  showWebhookIcon = false,
}: WebhookTriggerButtonProps) {
  const { triggerWebhook, hasWebhook, isLoading: webhooksLoading } = useWebhookTrigger();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const [isTriggering, setIsTriggering] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<{ success: boolean; timestamp: number } | null>(null);
  const [assignmentExists, setAssignmentExists] = React.useState<boolean>(false);
  const [assignmentLoading, setAssignmentLoading] = React.useState(true);

  // Check if webhook exists (either by name or assignment)
  const webhookExists = webhookName ? hasWebhook(webhookName) : assignmentExists;

  // Check for assignment-based webhook
  React.useEffect(() => {
    if (!featurePage || !buttonPosition || !currentOrganization?.id) {
      setAssignmentExists(false);
      setAssignmentLoading(false);
      return;
    }

    const checkAssignment = async () => {
      try {
        const assignment = await UnifiedWebhookService.getWebhookAssignment(
          currentOrganization.id,
          featurePage,
          buttonPosition
        );
        setAssignmentExists(!!assignment && assignment.is_active);
      } catch (error) {
        console.warn('Failed to check webhook assignment:', error);
        setAssignmentExists(false);
      } finally {
        setAssignmentLoading(false);
      }
    };

    checkAssignment();
  }, [featurePage, buttonPosition, currentOrganization?.id]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!webhookExists) {
      const errorMsg = webhookName 
        ? `Webhook '${webhookName}' not found or inactive`
        : `No webhook assigned for ${featurePage}:${buttonPosition}`;
      toast({
        title: 'Webhook Not Available',
        description: errorMsg,
        variant: 'destructive',
      });
      onError?.(errorMsg);
      return;
    }

    setIsTriggering(true);
    
    try {
      let result: any;

      if (featurePage && buttonPosition) {
        // Assignment-based triggering (more robust)
        if (!currentOrganization?.id || !user?.id) {
          throw new Error('Missing organization or user context');
        }

        const assignment = await UnifiedWebhookService.getWebhookAssignment(
          currentOrganization.id,
          featurePage,
          buttonPosition
        );

        if (!assignment) {
          throw new Error(`No webhook assignment found for ${featurePage}:${buttonPosition}`);
        }

        // Build comprehensive context
        const triggerContext = {
          event_type: 'manual_trigger',
          organization_id: currentOrganization.id,
          user_id: user.id,
          page: featurePage,
          position: buttonPosition,
          triggered_at: new Date().toISOString(),
          user_triggered: true,
          ...payload,
          context: {
            ...context,
            trigger_method: 'assignment_based'
          }
        };

        result = await UnifiedWebhookService.triggerAssignedWebhook(assignment.id, triggerContext);
      } else if (webhookName) {
        // Name-based triggering (legacy support)
        result = await triggerWebhook(webhookName, payload, {
          ...context,
          trigger_method: 'name_based'
        });
      } else {
        throw new Error('Either webhookName or featurePage+buttonPosition must be provided');
      }
      
      setLastResult({
        success: result.success,
        timestamp: Date.now(),
      });

      if (result.success) {
        toast({
          title: 'Webhook Triggered',
          description: result.message || 'Webhook executed successfully',
        });
        onSuccess?.(result.data);
      } else {
        toast({
          title: 'Webhook Failed',
          description: result.error || 'Unknown error occurred',
          variant: 'destructive',
        });
        onError?.(result.error || 'Unknown error');
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to trigger webhook';
      toast({
        title: 'Webhook Error',
        description: errorMsg,
        variant: 'destructive',
      });
      onError?.(errorMsg);
      setLastResult({
        success: false,
        timestamp: Date.now(),
      });
    } finally {
      setIsTriggering(false);
    }
  };

  // Show loading state if webhooks are still loading
  if (webhooksLoading || assignmentLoading) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {children}
      </Button>
    );
  }

  // Show disabled state if webhook doesn't exist
  if (!webhookExists) {
    return (
      <div className="relative">
        <Button variant="outline" size={size} disabled>
          {children}
        </Button>
        {showWebhookStatus && (
          <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs">
            No webhook
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size}
        disabled={disabled || isTriggering}
        onClick={handleClick}
      >
        {isTriggering ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Triggering...
          </>
        ) : (
          <>
            {showWebhookIcon && <Zap className="h-4 w-4 mr-2" />}
            {children}
          </>
        )}
      </Button>
      
      {showWebhookStatus && lastResult && (
        <Badge 
          variant={lastResult.success ? 'default' : 'destructive'} 
          className="absolute -top-2 -right-2 text-xs"
        >
          {lastResult.success ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
        </Badge>
      )}
    </div>
  );
}