// Content Briefs Hooks - Phase 2: Data Layer
// React Query hooks for content briefs CRUD operations

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ContentCreationService } from '@/services/ContentCreationService';
import { contentCreationKeys, contentCreationInvalidation } from './queryKeys';
import type {
  ContentBriefWithDetails,
  ContentBrief,
  CreateContentBriefInput,
  UpdateContentBriefInput,
  ContentBriefFilters,
  PaginationParams,
  PaginatedResponse,
  UseQueryOptions,
  UseMutationOptions
} from '@/types/content-creation';

// ========== QUERY HOOKS ==========

/**
 * Hook to fetch content briefs with filtering and pagination
 */
export const useContentBriefs = (
  filters: ContentBriefFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 },
  options: UseQueryOptions<PaginatedResponse<ContentBriefWithDetails>> = {}
) => {
  return useQuery({
    queryKey: contentCreationKeys.briefsList(filters, pagination),
    queryFn: () => ContentCreationService.getContentBriefs(filters, pagination),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

/**
 * Hook to fetch a single content brief by ID
 */
export const useContentBrief = (
  briefId: string,
  options: UseQueryOptions<ContentBriefWithDetails | null> = {}
) => {
  return useQuery({
    queryKey: contentCreationKeys.briefDetail(briefId),
    queryFn: async () => {
      // Since getContentBrief doesn't exist in service, we'll get it from the list
      const result = await ContentCreationService.getContentBriefs({ search: briefId });
      return result.data.find(brief => brief.id === briefId) || null;
    },
    enabled: !!briefId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('not found')) return false;
      return failureCount < 3;
    },
    ...options,
  });
};

/**
 * Hook to fetch content items for a specific brief
 */
export const useBriefItems = (
  briefId: string,
  options: UseQueryOptions<PaginatedResponse<any>> = {}
) => {
  return useQuery({
    queryKey: contentCreationKeys.briefItems(briefId),
    queryFn: () => ContentCreationService.getContentItems({ brief_id: briefId }),
    enabled: !!briefId,
    staleTime: 3 * 60 * 1000,
    ...options,
  });
};

// ========== MUTATION HOOKS ==========

/**
 * Hook to create a new content brief
 */
export const useCreateContentBrief = (
  options: UseMutationOptions<ContentBrief, Error, CreateContentBriefInput> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ContentCreationService.createContentBrief,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: contentCreationKeys.briefs() });

      // Optimistically update the cache
      const previousBriefs = queryClient.getQueryData(
        contentCreationKeys.briefsList()
      ) as PaginatedResponse<ContentBriefWithDetails> | undefined;

      if (previousBriefs) {
        const optimisticBrief: ContentBriefWithDetails = {
          id: `temp-${Date.now()}`,
          idea_id: variables.idea_id,
          organization_id: '',
          title: variables.title,
          content_type: variables.content_type,
          requirements: variables.requirements,
          tone: variables.tone,
          target_audience: variables.target_audience,
          keywords: variables.keywords,
          status: 'draft',
          created_by: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          content_items_count: 0,
          can_generate_content: false,
        };

        queryClient.setQueryData(
          contentCreationKeys.briefsList(),
          {
            ...previousBriefs,
            data: [optimisticBrief, ...previousBriefs.data],
            pagination: {
              ...previousBriefs.pagination,
              total: previousBriefs.pagination.total + 1
            }
          }
        );
      }

      return { previousBriefs };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousBriefs) {
        queryClient.setQueryData(
          contentCreationKeys.briefsList(),
          context.previousBriefs
        );
      }

      toast.error('Failed to create content brief', {
        description: error.message || 'Please try again later.'
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.briefs() });
      
      // If created from an idea, invalidate idea's briefs
      if (variables.idea_id) {
        queryClient.invalidateQueries({ 
          queryKey: contentCreationKeys.ideaBriefs(variables.idea_id) 
        });
      }
      
      toast.success('Content brief created successfully!', {
        description: `"${data.title}" has been added to your briefs.`
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.briefs() });
    },
    ...options,
  });
};

/**
 * Hook to update a content brief
 */
export const useUpdateContentBrief = (
  briefId: string,
  options: UseMutationOptions<ContentBrief, Error, UpdateContentBriefInput> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) => ContentCreationService.updateContentBrief(briefId, input),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ 
        queryKey: contentCreationKeys.briefDetail(briefId) 
      });

      const previousBrief = queryClient.getQueryData(
        contentCreationKeys.briefDetail(briefId)
      ) as ContentBriefWithDetails | undefined;

      if (previousBrief) {
        queryClient.setQueryData(
          contentCreationKeys.briefDetail(briefId),
          {
            ...previousBrief,
            ...variables,
            updated_at: new Date().toISOString()
          }
        );
      }

      return { previousBrief };
    },
    onError: (error, variables, context) => {
      if (context?.previousBrief) {
        queryClient.setQueryData(
          contentCreationKeys.briefDetail(briefId),
          context.previousBrief
        );
      }

      toast.error('Failed to update content brief', {
        description: error.message || 'Please try again later.'
      });
    },
    onSuccess: (data) => {
      // Invalidate related queries
      contentCreationInvalidation.briefAndRelated(briefId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      toast.success('Content brief updated successfully!');
    },
    ...options,
  });
};

/**
 * Hook to delete a content brief
 */
export const useDeleteContentBrief = (
  options: UseMutationOptions<void, Error, string> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ContentCreationService.deleteContentBrief,
    onSuccess: (_, briefId) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ 
        queryKey: contentCreationKeys.briefDetail(briefId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.briefs() 
      });

      toast.success('Content brief deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete content brief', {
        description: error.message || 'Please try again later.'
      });
    },
    ...options,
  });
};

/**
 * Hook to generate content from a brief (workflow action)
 */
export const useGenerateContentFromBrief = (
  briefId: string,
  options: UseMutationOptions<any, Error, { format?: string; tone?: string; length?: 'short' | 'medium' | 'long' }> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (generateOptions) => 
      ContentCreationService.generateContentFromBrief(briefId, generateOptions),
    onMutate: async (variables) => {
      // Show loading state in UI
      toast.loading('Generating content from brief...', {
        id: `generate-${briefId}`,
        duration: Infinity, // Will be dismissed on success/error
      });

      return { briefId };
    },
    onSuccess: (data) => {
      // Dismiss loading toast
      toast.dismiss(`generate-${briefId}`);
      
      // Invalidate brief items and general items list
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.briefItems(briefId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.items() 
      });

      toast.success('Content generated successfully!', {
        description: `"${data.title}" has been created from the brief.`,
        action: {
          label: 'View Item',
          onClick: () => {
            // Navigate to content items tab - will be implemented in UI phase
            console.log('Navigate to content item:', data.id);
          }
        }
      });
    },
    onError: (error) => {
      // Dismiss loading toast
      toast.dismiss(`generate-${briefId}`);
      
      toast.error('Failed to generate content from brief', {
        description: error.message || 'Please try again later.'
      });
    },
    ...options,
  });
};

/**
 * Hook to approve a brief (changes status to approved)
 */
export const useApproveBrief = (
  briefId: string,
  options: UseMutationOptions<ContentBrief, Error, void> = {}
) => {
  return useUpdateContentBrief(briefId, {
    ...options,
    onSuccess: (data, variables, context) => {
      toast.success('Brief approved successfully!', {
        description: 'The brief is now ready for content generation.'
      });
      options.onSuccess?.(data, variables, context);
    }
  });
};

/**
 * Hook to reject a brief (changes status to archived)
 */
export const useRejectBrief = (
  briefId: string,
  options: UseMutationOptions<ContentBrief, Error, void> = {}
) => {
  return useUpdateContentBrief(briefId, {
    ...options,
    onSuccess: (data, variables, context) => {
      toast.success('Brief rejected and archived');
      options.onSuccess?.(data, variables, context);
    }
  });
};

// ========== CONVENIENCE HOOKS ==========

/**
 * Hook that combines briefs list with common filters
 */
export const useContentBriefsFiltered = (
  status?: string,
  contentType?: string,
  search?: string,
  ideaId?: string
) => {
  const filters: ContentBriefFilters = {};
  if (status && status !== 'all') filters.status = status as any;
  if (contentType) filters.content_type = contentType;
  if (search) filters.search = search;
  if (ideaId) filters.idea_id = ideaId;

  return useContentBriefs(filters);
};

/**
 * Hook to get briefs that are ready for content generation
 */
export const useGenerateReadyBriefs = () => {
  return useContentBriefs({ status: 'approved' });
};

/**
 * Hook to get draft briefs for current user
 */
export const useDraftBriefs = () => {
  return useContentBriefs({ status: 'draft' });
};

/**
 * Hook to prefetch next page of briefs
 */
export const usePrefetchNextBriefsPage = (
  currentPage: number,
  filters: ContentBriefFilters = {}
) => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: contentCreationKeys.briefsList(filters, { 
        page: currentPage + 1, 
        limit: 10 
      }),
      queryFn: () => ContentCreationService.getContentBriefs(filters, { 
        page: currentPage + 1, 
        limit: 10 
      }),
      staleTime: 5 * 60 * 1000,
    });
  };
};

// ========== BULK OPERATIONS ==========

/**
 * Hook to bulk update brief statuses
 */
export const useBulkUpdateBriefStatus = (
  options: UseMutationOptions<ContentBrief[], Error, { briefIds: string[]; status: ContentBrief['status'] }> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ briefIds, status }) => {
      const results = await Promise.all(
        briefIds.map(briefId => 
          ContentCreationService.updateContentBrief(briefId, { status })
        )
      );
      return results;
    },
    onSuccess: (data, variables) => {
      // Invalidate all briefs queries
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.briefs() });

      toast.success(`${data.length} brief(s) updated successfully!`, {
        description: `Status changed to ${variables.status}`
      });
    },
    onError: (error) => {
      toast.error('Failed to update briefs', {
        description: error.message || 'Some briefs may not have been updated.'
      });
    },
    ...options,
  });
};

// Export all hooks and types for easy importing
export type {
  ContentBriefWithDetails,
  ContentBrief,
  CreateContentBriefInput,
  UpdateContentBriefInput,
  ContentBriefFilters,
};