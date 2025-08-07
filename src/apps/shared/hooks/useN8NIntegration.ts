import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { N8NWebhookConfig, N8NWebhookError } from '../types/AppTypes';
import { N8NWebhookService } from '../services/N8NWebhookService';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UseN8NIntegrationOptions {
  appId: string;
  onSuccess?: (result: any) => void;
  onError?: (error: N8NWebhookError) => void;
}

export interface UseN8NIntegrationReturn {
  executeWebhook: (webhookId: string, payload: Record<string, any>) => Promise<any>;
  testWebhook: (config: N8NWebhookConfig) => Promise<{ success: boolean; message: string; responseTime?: number }>;
  isExecuting: boolean;
  isTesting: boolean;
  lastError: N8NWebhookError | null;
  lastResult: any;
}

export function useN8NIntegration({ 
  appId, 
  onSuccess, 
  onError 
}: UseN8NIntegrationOptions): UseN8NIntegrationReturn {
  const { currentOrganization } = useOrganizationData();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [lastError, setLastError] = useState<N8NWebhookError | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const organizationId = currentOrganization?.id;
  const userId = user?.id;

  // Webhook execution mutation
  const executeMutation = useMutation({
    mutationFn: async ({ webhookId, payload }: { webhookId: string; payload: Record<string, any> }) => {
      if (!organizationId || !userId) {
        throw new Error('Organization and user context required');
      }

      // Get webhook configuration
      const config = await N8NWebhookService.getWebhookConfig(appId, organizationId, webhookId);
      if (!config) {
        throw new N8NWebhookError(`Webhook ${webhookId} not configured`, webhookId);
      }

      // Execute webhook
      return N8NWebhookService.executeWebhook(config, payload, organizationId, userId, appId);
    },
    onSuccess: (result) => {
      setLastResult(result);
      setLastError(null);
      onSuccess?.(result);
      
      toast({
        title: 'Webhook Executed',
        description: 'N8N workflow has been triggered successfully.',
      });
    },
    onError: (error: N8NWebhookError) => {
      setLastError(error);
      setLastResult(null);
      onError?.(error);
      
      toast({
        title: 'Webhook Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Webhook test mutation
  const testMutation = useMutation({
    mutationFn: async (config: N8NWebhookConfig) => {
      if (!organizationId || !userId) {
        throw new Error('Organization and user context required');
      }

      return N8NWebhookService.testWebhook(config, organizationId, userId);
    },
    onSuccess: (result) => {
      toast({
        title: result.success ? 'Test Successful' : 'Test Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Test Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Execute webhook function
  const executeWebhook = useCallback(async (webhookId: string, payload: Record<string, any>) => {
    return executeMutation.mutateAsync({ webhookId, payload });
  }, [executeMutation]);

  // Test webhook function
  const testWebhook = useCallback(async (config: N8NWebhookConfig) => {
    return testMutation.mutateAsync(config);
  }, [testMutation]);

  return {
    executeWebhook,
    testWebhook,
    isExecuting: executeMutation.isPending,
    isTesting: testMutation.isPending,
    lastError,
    lastResult,
  };
}

// Hook for managing webhook configurations
export function useWebhookConfig(appId: string) {
  const { currentOrganization } = useOrganizationData();
  const organizationId = currentOrganization?.id;

  const getWebhookConfig = useCallback(async (webhookId: string): Promise<N8NWebhookConfig | null> => {
    if (!organizationId) {
      throw new Error('Organization context required');
    }
    
    return N8NWebhookService.getWebhookConfig(appId, organizationId, webhookId);
  }, [appId, organizationId]);

  const validateConfig = useCallback((config: Partial<N8NWebhookConfig>) => {
    return N8NWebhookService.validateWebhookConfig(config);
  }, []);

  return {
    getWebhookConfig,
    validateConfig,
  };
}

// Hook for webhook analytics and monitoring
export function useWebhookAnalytics(appId: string, webhookId?: string) {
  // TODO: Implement webhook analytics queries
  // This would query marketplace_app_analytics for webhook-related events
  
  return {
    successRate: 0,
    averageResponseTime: 0,
    totalExecutions: 0,
    recentErrors: [],
    isLoading: false,
  };
}

// Helper hook for common webhook patterns
export function useCommonWebhooks(appId: string) {
  const { executeWebhook, isExecuting } = useN8NIntegration({ appId });

  // Common webhook patterns
  const sendNotification = useCallback(async (message: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    return executeWebhook('notification', {
      message,
      priority,
      timestamp: new Date().toISOString(),
    });
  }, [executeWebhook]);

  const syncData = useCallback(async (dataType: string, data: any) => {
    return executeWebhook('data_sync', {
      data_type: dataType,
      data,
      sync_timestamp: new Date().toISOString(),
    });
  }, [executeWebhook]);

  const triggerWorkflow = useCallback(async (workflowId: string, inputs: Record<string, any>) => {
    return executeWebhook('workflow_trigger', {
      workflow_id: workflowId,
      inputs,
      trigger_timestamp: new Date().toISOString(),
    });
  }, [executeWebhook]);

  const reportEvent = useCallback(async (eventType: string, eventData: Record<string, any>) => {
    return executeWebhook('event_report', {
      event_type: eventType,
      event_data: eventData,
      event_timestamp: new Date().toISOString(),
    });
  }, [executeWebhook]);

  return {
    sendNotification,
    syncData,
    triggerWorkflow,
    reportEvent,
    isExecuting,
  };
}