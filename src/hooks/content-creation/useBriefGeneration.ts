import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ContentBriefGenerationService, type BriefGenerationContext, type BriefGenerationStatus } from '@/services/ContentBriefGenerationService';
import { useAuth } from '@/auth/AuthProvider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { contentCreationKeys } from './queryKeys';
import type { AISuggestion, ContentIdeaWithDetails } from '@/types/content-creation';

export interface UseBriefGenerationOptions {
  onSuccess?: (briefId: string) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for triggering content brief generation
 */
export function useBriefGeneration(options?: UseBriefGenerationOptions) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      idea,
      suggestion
    }: {
      idea: ContentIdeaWithDetails;
      suggestion: AISuggestion;
    }) => {
      if (!user || !currentOrganization) {
        throw new Error('User or organization not available');
      }

      const context: BriefGenerationContext = {
        idea: {
          id: idea.id,
          title: idea.title,
          description: idea.description,
          keywords: idea.keywords,
          target_audience: idea.target_audience,
          content_type: idea.content_type
        },
        suggestion,
        organizationId: currentOrganization.id,
        userId: user.id
      };

      const result = await ContentBriefGenerationService.triggerBriefGeneration(context);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to trigger brief generation');
      }

      return {
        briefId: result.briefId!,
        suggestion,
        idea
      };
    },
    onSuccess: (data) => {
      toast.success('Brief generation started!', {
        description: `AI is creating a detailed brief for "${data.suggestion.title}". This may take a few minutes.`,
        duration: 5000, // Show longer to emphasize the waiting
      });
      
      // Invalidate content briefs queries to refresh the list
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.contentBriefs.all });
      
      options?.onSuccess?.(data.briefId);
    },
    onError: (error: Error) => {
      console.error('❌ Brief generation failed:', error);
      toast.error('Failed to generate brief', {
        description: error.message,
      });
      options?.onError?.(error.message);
    }
  });
}

/**
 * Hook for checking brief generation status
 */
export function useBriefGenerationStatus(briefId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['brief-generation-status', briefId],
    queryFn: () => briefId ? ContentBriefGenerationService.checkGenerationStatus(briefId) : null,
    enabled: enabled && !!briefId,
    refetchInterval: (data) => {
      // Poll every 3 seconds if status is pending or processing
      if (data?.status === 'pending' || data?.status === 'processing') {
        return 3000;
      }
      return false; // Stop polling when completed/failed
    },
    staleTime: 1000, // Consider data stale after 1 second to enable frequent polling
  });
}

/**
 * Hook for retrying failed brief generation
 */
export function useBriefGenerationRetry(options?: UseBriefGenerationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (briefId: string) => {
      const result = await ContentBriefGenerationService.retryFailedGeneration(briefId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to retry brief generation');
      }

      return { briefId };
    },
    onSuccess: (data) => {
      toast.success('Brief generation retry started!', {
        description: 'Attempting to generate the brief again...',
      });
      
      // Invalidate status query to start polling again
      queryClient.invalidateQueries({ queryKey: ['brief-generation-status', data.briefId] });
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.contentBriefs.all });
      
      options?.onSuccess?.(data.briefId);
    },
    onError: (error: Error) => {
      console.error('❌ Brief generation retry failed:', error);
      toast.error('Failed to retry brief generation', {
        description: error.message,
      });
      options?.onError?.(error.message);
    }
  });
}

/**
 * Hook for getting briefs associated with a specific suggestion
 */
export function useBriefsForSuggestion(
  ideaId: string | null,
  suggestionTitle: string | null,
  enabled = true
) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['briefs-for-suggestion', currentOrganization?.id, ideaId, suggestionTitle],
    queryFn: () => {
      if (!currentOrganization || !ideaId || !suggestionTitle) return [];
      
      return ContentBriefGenerationService.getBriefsForSuggestion(
        currentOrganization.id,
        ideaId,
        suggestionTitle
      );
    },
    enabled: enabled && !!currentOrganization && !!ideaId && !!suggestionTitle,
  });
}

/**
 * Hook to combine suggestion with brief generation status
 * Returns enhanced suggestion data with brief generation info
 */
export function useEnhancedSuggestions(
  idea: ContentIdeaWithDetails | null,
  suggestions: AISuggestion[] | null
) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['enhanced-suggestions', currentOrganization?.id, idea?.id],
    queryFn: async () => {
      if (!currentOrganization || !idea || !suggestions) return [];

      // Get brief generation status for each suggestion
      const enhancedSuggestions = await Promise.all(
        suggestions.map(async (suggestion) => {
          const briefs = await ContentBriefGenerationService.getBriefsForSuggestion(
            currentOrganization.id,
            idea.id,
            suggestion.title
          );

          // Get the latest brief for this suggestion
          const latestBrief = briefs.length > 0 ? briefs[0] : null;

          return {
            ...suggestion,
            briefStatus: latestBrief?.status || null,
            briefId: latestBrief?.id || null,
            briefContent: latestBrief?.content || null,
            generatedBriefsCount: briefs.length,
            hasBrief: briefs.length > 0,
            hasCompletedBrief: briefs.some(b => b.status === 'completed')
          };
        })
      );

      return enhancedSuggestions;
    },
    enabled: !!currentOrganization && !!idea && !!suggestions,
    staleTime: 5000 // Keep data fresh for 5 seconds
  });
}

// Type for enhanced suggestions
export interface EnhancedAISuggestion extends AISuggestion {
  briefStatus: 'pending' | 'processing' | 'completed' | 'failed' | null;
  briefId: string | null;
  briefContent: string | null;
  generatedBriefsCount: number;
  hasBrief: boolean;
  hasCompletedBrief: boolean;
}