import { useCallback, useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/auth/AuthProvider';
import { UnifiedWebhookService } from '@/services/UnifiedWebhookService';
import { useQuery } from '@tanstack/react-query';

/**
 * Simple hook for page-specific webhook integration
 * Provides easy access to webhook assignments for the current page
 */
export function usePageWebhooks(featurePage: string) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  // Get all webhook assignments for this page
  const {
    data: pageAssignments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['page-webhooks', currentOrganization?.id, featurePage],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      try {
        const allAssignments = await UnifiedWebhookService.getActiveAssignments(currentOrganization.id);
        return allAssignments.filter(assignment => assignment.page === featurePage);
      } catch (error) {
        console.error('Failed to load page webhooks:', error);
        return [];
      }
    },
    enabled: !!currentOrganization?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Check if a specific button position has a webhook
  const hasWebhookAt = useCallback(
    (buttonPosition: string) => {
      return pageAssignments.some(
        assignment => assignment.position === buttonPosition && assignment.isActive
      );
    },
    [pageAssignments]
  );

  // Get webhook assignment for specific position
  const getWebhookAt = useCallback(
    (buttonPosition: string) => {
      return pageAssignments.find(
        assignment => assignment.position === buttonPosition && assignment.isActive
      ) || null;
    },
    [pageAssignments]
  );

  // Trigger webhook at specific position
  const triggerWebhookAt = useCallback(
    async (
      buttonPosition: string,
      payload: Record<string, any> = {},
      additionalContext?: Record<string, any>
    ) => {
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

      const triggerContext = {
        event_type: 'page_trigger',
        organization_id: currentOrganization.id,
        user_id: user.id,
        page: featurePage,
        position: buttonPosition,
        triggered_at: new Date().toISOString(),
        user_triggered: true,
        ...payload,
        ...additionalContext,
      };

      return await UnifiedWebhookService.triggerAssignedWebhook(assignment.id, triggerContext);
    },
    [featurePage, currentOrganization?.id, user?.id]
  );

  // Available webhook positions on this page
  const availablePositions = useMemo(() => {
    return pageAssignments.map(assignment => ({
      position: assignment.position,
      webhookName: assignment.webhook?.name || 'Unknown Webhook',
      isActive: assignment.isActive,
    }));
  }, [pageAssignments]);

  return {
    // Data
    pageAssignments,
    availablePositions,
    
    // State
    isLoading,
    error,
    
    // Utilities
    hasWebhookAt,
    getWebhookAt,
    triggerWebhookAt,
    
    // Metrics
    totalWebhooks: pageAssignments.length,
    activeWebhooks: pageAssignments.filter(a => a.isActive).length,
  };
}

/**
 * Hook specifically for file processing pages
 * Provides file-specific webhook functionality
 */
export function useFileProcessingWebhooks() {
  const pageWebhooks = usePageWebhooks('ManageFiles');
  const { currentOrganization } = useOrganization();

  // Trigger file processing webhook with file-specific context
  const triggerFileProcessing = useCallback(
    async (fileData: {
      fileId: string;
      fileName: string;
      filePath: string;
      fileSize: number;
      mimeType: string;
      kbId: string;
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('Missing organization context');
      }

      return await UnifiedWebhookService.triggerFileProcessingWebhook(
        currentOrganization.id,
        fileData.fileId, // user ID will be resolved inside the service
        fileData
      );
    },
    [currentOrganization?.id]
  );

  return {
    ...pageWebhooks,
    
    // File-specific functionality
    triggerFileProcessing,
    hasFileProcessingWebhook: pageWebhooks.hasWebhookAt('upload-section'),
    fileProcessingWebhook: pageWebhooks.getWebhookAt('upload-section'),
  };
}

/**
 * Hook for chat/messaging pages
 */
export function useChatWebhooks() {
  const pageWebhooks = usePageWebhooks('Chat');
  
  return {
    ...pageWebhooks,
    
    // Chat-specific utilities
    hasMessageWebhook: pageWebhooks.hasWebhookAt('input-right-addon'),
    messageWebhook: pageWebhooks.getWebhookAt('input-right-addon'),
  };
}