// Content Generation Hooks - Phase 3: UI Integration
// React Query hooks for content generation workflow with N8N integration

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ContentCreationService } from '@/services/ContentCreationService';
import { ContentGenerationService } from '@/services/ContentGenerationService';
import { contentCreationKeys } from './queryKeys';
import type {
  GenerationStatus,
  GenerationStatusInfo,
  ContentItem,
  UseMutationOptions
} from '@/types/content-creation';

// ========== GENERATION MUTATIONS ==========

/**
 * Hook to trigger content generation from a brief
 */
export const useTriggerContentGeneration = (
  options: UseMutationOptions<{success: boolean; executionId?: string; error?: string}, Error, string> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (briefId: string) => ContentCreationService.generateContentFromBrief(briefId),
    onMutate: async (briefId) => {
      // Cancel any outgoing refetches for this brief
      await queryClient.cancelQueries({ 
        queryKey: contentCreationKeys.briefDetail(briefId) 
      });

      // Show loading toast
      toast.loading('Starting content generation...', {
        id: `generate-${briefId}`,
        duration: Infinity
      });

      // Optimistically update brief status
      const previousBrief = queryClient.getQueryData(
        contentCreationKeys.briefDetail(briefId)
      );

      if (previousBrief) {
        queryClient.setQueryData(
          contentCreationKeys.briefDetail(briefId),
          {
            ...previousBrief,
            generation_status: 'processing',
            generation_started_at: new Date().toISOString(),
            generation_error: null
          }
        );
      }

      return { briefId, previousBrief };
    },
    onSuccess: (data, briefId) => {
      toast.dismiss(`generate-${briefId}`);
      
      if (data.success) {
        toast.success('Content generation started!', {
          description: 'Your content is being generated. You\'ll see it in the Content Items tab when ready.',
          duration: 5000
        });

        // Start polling for status updates
        startPolling(briefId, queryClient);
      } else {
        toast.error('Failed to start content generation', {
          description: data.error || 'Please try again.'
        });
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.briefs() });
    },
    onError: (error, briefId, context) => {
      toast.dismiss(`generate-${briefId}`);
      
      // Revert optimistic update
      if (context?.previousBrief) {
        queryClient.setQueryData(
          contentCreationKeys.briefDetail(briefId),
          context.previousBrief
        );
      }

      toast.error('Failed to start content generation', {
        description: error.message || 'Please check your connection and try again.'
      });
    },
    ...options,
  });
};

/**
 * Hook to retry failed content generation
 */
export const useRetryContentGeneration = (
  options: UseMutationOptions<{success: boolean; executionId?: string; error?: string}, Error, string> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ContentCreationService.retryContentGeneration,
    onSuccess: (data, briefId) => {
      if (data.success) {
        toast.success('Content generation restarted!', {
          description: 'Your content is being generated again.'
        });
        
        startPolling(briefId, queryClient);
      } else {
        toast.error('Failed to retry content generation', {
          description: data.error
        });
      }
      
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.briefs() });
    },
    onError: (error) => {
      toast.error('Failed to retry content generation', {
        description: error.message
      });
    },
    ...options,
  });
};

/**
 * Hook to cancel ongoing content generation
 */
export const useCancelContentGeneration = (
  options: UseMutationOptions<void, Error, string> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ContentCreationService.cancelContentGeneration,
    onSuccess: (_, briefId) => {
      toast.success('Content generation cancelled');
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.briefDetail(briefId) 
      });
    },
    onError: (error) => {
      toast.error('Failed to cancel content generation', {
        description: error.message
      });
    },
    ...options,
  });
};

// ========== GENERATION STATUS QUERIES ==========

/**
 * Hook to get generation status for a brief
 */
export const useGenerationStatus = (
  briefId: string,
  options: {
    enabled?: boolean;
    refetchInterval?: number;
  } = {}
) => {
  return useQuery({
    queryKey: contentCreationKeys.generationStatus(briefId),
    queryFn: () => ContentCreationService.getBriefGenerationStatus(briefId),
    enabled: !!briefId && (options.enabled !== false),
    refetchInterval: options.refetchInterval || 5000, // Poll every 5 seconds
    staleTime: 1000, // Very short stale time for real-time updates
    retry: 3,
    retryDelay: 1000,
  });
};

/**
 * Hook to get generated content items for a brief
 */
export const useGeneratedContentItems = (
  briefId: string,
  options: {
    enabled?: boolean;
  } = {}
) => {
  return useQuery({
    queryKey: contentCreationKeys.generatedItems(briefId),
    queryFn: () => ContentCreationService.getGeneratedContentItems(briefId),
    enabled: !!briefId && (options.enabled !== false),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 3,
  });
};

// ========== POLLING UTILITIES ==========

/**
 * Start polling for generation status updates
 */
function startPolling(briefId: string, queryClient: any) {
  const pollInterval = setInterval(async () => {
    try {
      const status = await ContentCreationService.getBriefGenerationStatus(briefId);
      
      // Update query cache
      queryClient.setQueryData(
        contentCreationKeys.generationStatus(briefId),
        status
      );

      // Check if generation is complete
      if (status.status === 'completed') {
        clearInterval(pollInterval);
        
        toast.success('Content generation completed!', {
          description: 'Your new content item is ready in the Content Items tab.',
          action: {
            label: 'View Items',
            onClick: () => {
              // Navigate to content items tab - will be handled by parent component
              window.dispatchEvent(new CustomEvent('navigate-to-content-items'));
            }
          }
        });

        // Refresh content items list
        queryClient.invalidateQueries({ 
          queryKey: contentCreationKeys.items() 
        });
        queryClient.invalidateQueries({ 
          queryKey: contentCreationKeys.generatedItems(briefId) 
        });
        
      } else if (status.status === 'error') {
        clearInterval(pollInterval);
        
        toast.error('Content generation failed', {
          description: status.error || 'An unknown error occurred during generation.',
          action: {
            label: 'Retry',
            onClick: () => {
              // Trigger retry
              ContentCreationService.retryContentGeneration(briefId);
            }
          }
        });
      }

      // Update brief in cache
      const briefKey = contentCreationKeys.briefDetail(briefId);
      const currentBrief = queryClient.getQueryData(briefKey);
      if (currentBrief) {
        queryClient.setQueryData(briefKey, {
          ...currentBrief,
          generation_status: status.status,
          generation_started_at: status.startedAt,
          generation_completed_at: status.completedAt,
          generation_error: status.error,
          n8n_execution_id: status.executionId
        });
      }

    } catch (error) {
      console.error('Error polling generation status:', error);
    }
  }, 5000); // Poll every 5 seconds

  // Set timeout to stop polling after 5 minutes
  setTimeout(() => {
    clearInterval(pollInterval);
  }, 5 * 60 * 1000);
}

// ========== CONVENIENCE HOOKS ==========

/**
 * Hook that combines generation trigger and status polling
 */
export const useContentGenerationWorkflow = (briefId: string) => {
  const triggerGeneration = useTriggerContentGeneration();
  const retryGeneration = useRetryContentGeneration();
  const cancelGeneration = useCancelContentGeneration();
  const generationStatus = useGenerationStatus(briefId);
  const generatedItems = useGeneratedContentItems(briefId);

  const startGeneration = () => {
    triggerGeneration.mutate(briefId);
  };

  const retryFailedGeneration = () => {
    retryGeneration.mutate(briefId);
  };

  const cancelOngoingGeneration = () => {
    cancelGeneration.mutate(briefId);
  };

  return {
    // Actions
    startGeneration,
    retryFailedGeneration,
    cancelOngoingGeneration,
    
    // Status
    status: generationStatus.data?.status || 'pending',
    isGenerating: generationStatus.data?.status === 'processing',
    isCompleted: generationStatus.data?.status === 'completed',
    hasError: generationStatus.data?.status === 'error',
    error: generationStatus.data?.error,
    
    // Generated content
    generatedItems: generatedItems.data || [],
    hasGeneratedItems: (generatedItems.data?.length || 0) > 0,
    
    // Loading states
    isTriggeringGeneration: triggerGeneration.isPending,
    isRetrying: retryGeneration.isPending,
    isCancelling: cancelGeneration.isPending,
    
    // Raw query objects for advanced usage
    triggerMutation: triggerGeneration,
    retryMutation: retryGeneration,
    cancelMutation: cancelGeneration,
    statusQuery: generationStatus,
    itemsQuery: generatedItems
  };
};

/**
 * Hook to check if generation is available for a brief
 */
export const useCanGenerateContent = (brief: {
  status: string;
  generation_status?: string;
}) => {
  return brief.status === 'approved' && brief.generation_status !== 'processing';
};

/**
 * Hook to get generation statistics for dashboard
 */
export const useGenerationStats = (organizationId?: string) => {
  return useQuery({
    queryKey: contentCreationKeys.generationStats(organizationId),
    queryFn: () => ContentGenerationService.getGenerationStats(organizationId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });
};

// Export types for convenience
export type {
  GenerationStatus,
  GenerationStatusInfo,
};