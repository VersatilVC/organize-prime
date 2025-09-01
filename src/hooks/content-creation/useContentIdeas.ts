// Content Ideas Hooks - Phase 2: Data Layer
// React Query hooks for content ideas CRUD operations

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ContentCreationService } from '@/services/ContentCreationService';
import { contentCreationKeys, contentCreationInvalidation } from './queryKeys';
import { useAuth } from '@/auth/AuthProvider';
import type {
  ContentIdeaWithDetails,
  ContentIdea,
  CreateContentIdeaInput,
  UpdateContentIdeaInput,
  ContentIdeaFilters,
  PaginationParams,
  PaginatedResponse,
  UseQueryOptions,
  UseMutationOptions
} from '@/types/content-creation';

// ========== QUERY HOOKS ==========

/**
 * Hook to fetch content ideas with filtering and pagination
 */
export const useContentIdeas = (
  filters: ContentIdeaFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 },
  options: UseQueryOptions<PaginatedResponse<ContentIdeaWithDetails>> = {}
) => {
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = contentCreationKeys.ideasList(filters, pagination);

  const query = useQuery({
    queryKey,
    queryFn: () => ContentCreationService.getContentIdeas(filters, pagination),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });

  // Real-time subscription for content ideas updates
  useEffect(() => {
    if (!user || !organizationId) return;

    const channel = supabase
      .channel(`content-ideas-${organizationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_ideas',
        filter: `organization_id=eq.${organizationId}`
      }, (payload) => {
        console.log('Real-time content idea update:', payload);
        
        // Invalidate all content ideas queries to ensure fresh data
        queryClient.invalidateQueries({ queryKey: contentCreationKeys.ideas() });
        
        // Also invalidate individual idea queries if it's an UPDATE event
        if (payload.eventType === 'UPDATE' && payload.new?.id) {
          queryClient.invalidateQueries({ 
            queryKey: contentCreationKeys.ideaDetail(payload.new.id) 
          });
        }
      })
      .subscribe((status) => {
        console.log('Content ideas subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, organizationId, queryClient]);

  return query;
};

/**
 * Hook to fetch a single content idea by ID
 */
export const useContentIdea = (
  ideaId: string,
  options: UseQueryOptions<ContentIdeaWithDetails | null> = {}
) => {
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = contentCreationKeys.ideaDetail(ideaId);

  const query = useQuery({
    queryKey,
    queryFn: () => ContentCreationService.getContentIdea(ideaId),
    enabled: !!ideaId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if the idea doesn't exist
      if (error?.message?.includes('not found')) return false;
      return failureCount < 3;
    },
    ...options,
  });

  // Real-time subscription for individual content idea updates
  useEffect(() => {
    if (!user || !organizationId || !ideaId) return;

    const channel = supabase
      .channel(`content-idea-${ideaId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'content_ideas',
        filter: `id=eq.${ideaId}`
      }, (payload) => {
        console.log('Real-time content idea detail update:', payload);
        
        // Invalidate the specific idea query for immediate update
        queryClient.invalidateQueries({ queryKey });
        
        // Also invalidate the ideas list to keep it in sync
        queryClient.invalidateQueries({ queryKey: contentCreationKeys.ideas() });
      })
      .subscribe((status) => {
        console.log(`Content idea ${ideaId} subscription status:`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, organizationId, ideaId, queryClient]);

  return query;
};

/**
 * Hook to fetch briefs for a specific idea
 */
export const useIdeaBriefs = (
  ideaId: string,
  options: UseQueryOptions<PaginatedResponse<any>> = {}
) => {
  return useQuery({
    queryKey: contentCreationKeys.ideaBriefs(ideaId),
    queryFn: () => ContentCreationService.getContentBriefs({ idea_id: ideaId }),
    enabled: !!ideaId,
    staleTime: 3 * 60 * 1000,
    ...options,
  });
};

// ========== MUTATION HOOKS ==========

/**
 * Hook to create a new content idea
 */
export const useCreateContentIdea = (
  options: UseMutationOptions<ContentIdea, Error, CreateContentIdeaInput> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ContentCreationService.createContentIdea,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: contentCreationKeys.ideas() });

      // Optimistically update the cache
      const previousIdeas = queryClient.getQueryData(
        contentCreationKeys.ideasList()
      ) as PaginatedResponse<ContentIdeaWithDetails> | undefined;

      if (previousIdeas) {
        const optimisticIdea: ContentIdeaWithDetails = {
          id: `temp-${Date.now()}`,
          organization_id: '',
          title: variables.title,
          description: variables.description,
          target_audience: variables.target_audience,
          content_type: variables.content_type,
          keywords: variables.keywords,
          status: 'draft',
          created_by: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          briefs_count: 0,
          can_create_brief: true,
        };

        queryClient.setQueryData(
          contentCreationKeys.ideasList(),
          {
            ...previousIdeas,
            data: [optimisticIdea, ...previousIdeas.data],
            pagination: {
              ...previousIdeas.pagination,
              total: previousIdeas.pagination.total + 1
            }
          }
        );
      }

      return { previousIdeas };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousIdeas) {
        queryClient.setQueryData(
          contentCreationKeys.ideasList(),
          context.previousIdeas
        );
      }

      toast.error('Failed to create content idea', {
        description: error.message || 'Please try again later.'
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch ideas list
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.ideas() });
      
      toast.success('Content idea created successfully!', {
        description: `"${data.title}" has been added to your ideas.`
      });
    },
    onSettled: () => {
      // Ensure fresh data regardless of success/error
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.ideas() });
    },
    ...options,
  });
};

/**
 * Hook to update a content idea
 */
export const useUpdateContentIdea = (
  ideaId: string,
  options: UseMutationOptions<ContentIdea, Error, UpdateContentIdeaInput> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) => ContentCreationService.updateContentIdea(ideaId, input),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ 
        queryKey: contentCreationKeys.ideaDetail(ideaId) 
      });

      const previousIdea = queryClient.getQueryData(
        contentCreationKeys.ideaDetail(ideaId)
      ) as ContentIdeaWithDetails | undefined;

      if (previousIdea) {
        queryClient.setQueryData(
          contentCreationKeys.ideaDetail(ideaId),
          {
            ...previousIdea,
            ...variables,
            updated_at: new Date().toISOString()
          }
        );
      }

      return { previousIdea };
    },
    onError: (error, variables, context) => {
      if (context?.previousIdea) {
        queryClient.setQueryData(
          contentCreationKeys.ideaDetail(ideaId),
          context.previousIdea
        );
      }

      toast.error('Failed to update content idea', {
        description: error.message || 'Please try again later.'
      });
    },
    onSuccess: (data) => {
      // Invalidate related queries
      contentCreationInvalidation.ideaAndRelated(ideaId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      toast.success('Content idea updated successfully!');
    },
    ...options,
  });
};

/**
 * Hook to delete a content idea
 */
export const useDeleteContentIdea = (
  options: UseMutationOptions<void, Error, string> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ContentCreationService.deleteContentIdea,
    onSuccess: (_, ideaId) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ 
        queryKey: contentCreationKeys.ideaDetail(ideaId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.ideas() 
      });

      toast.success('Content idea deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete content idea', {
        description: error.message || 'Please try again later.'
      });
    },
    ...options,
  });
};

/**
 * Hook to create a brief from an idea (workflow action)
 */
export const useCreateBriefFromIdea = (
  ideaId: string,
  options: UseMutationOptions<any, Error, Omit<any, 'idea_id'>> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (briefData) => 
      ContentCreationService.createBriefFromIdea(ideaId, briefData),
    onSuccess: () => {
      // Invalidate idea briefs and general briefs list
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.ideaBriefs(ideaId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.briefs() 
      });

      toast.success('Brief created from idea successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create brief from idea', {
        description: error.message || 'Please try again later.'
      });
    },
    ...options,
  });
};

// ========== UTILITY HOOKS ==========

/**
 * Hook to get content type options for dropdowns
 */
export const useContentTypeOptions = () => {
  return useQuery({
    queryKey: contentCreationKeys.contentTypes(),
    queryFn: ContentCreationService.getContentTypeOptions,
    staleTime: 15 * 60 * 1000, // 15 minutes - these don't change often
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to get target audience options for dropdowns
 */
export const useTargetAudienceOptions = () => {
  return useQuery({
    queryKey: contentCreationKeys.targetAudiences(),
    queryFn: ContentCreationService.getTargetAudienceOptions,
    staleTime: 15 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// ========== CONVENIENCE HOOKS ==========

/**
 * Hook that combines ideas list with common filters
 */
export const useContentIdeasFiltered = (
  status?: string,
  contentType?: string,
  search?: string
) => {
  const filters: ContentIdeaFilters = {};
  if (status && status !== 'all') filters.status = status as any;
  if (contentType) filters.content_type = contentType;
  if (search) filters.search = search;

  return useContentIdeas(filters);
};

/**
 * Hook to prefetch next page of ideas for better UX
 */
export const usePrefetchNextIdeasPage = (
  currentPage: number,
  filters: ContentIdeaFilters = {}
) => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: contentCreationKeys.ideasList(filters, { 
        page: currentPage + 1, 
        limit: 10 
      }),
      queryFn: () => ContentCreationService.getContentIdeas(filters, { 
        page: currentPage + 1, 
        limit: 10 
      }),
      staleTime: 5 * 60 * 1000,
    });
  };
};

// Export all hooks and types for easy importing
export type {
  ContentIdeaWithDetails,
  ContentIdea,
  CreateContentIdeaInput,
  UpdateContentIdeaInput,
  ContentIdeaFilters,
};