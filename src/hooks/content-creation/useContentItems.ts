// Content Items Hooks - Phase 2: Data Layer
// React Query hooks for content items CRUD operations

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ContentCreationService } from '@/services/ContentCreationService';
import { contentCreationKeys, contentCreationInvalidation } from './queryKeys';
import type {
  ContentItemWithDetails,
  ContentItem,
  CreateContentItemInput,
  UpdateContentItemInput,
  ContentItemFilters,
  PaginationParams,
  PaginatedResponse,
  UseQueryOptions,
  UseMutationOptions
} from '@/types/content-creation';

// ========== QUERY HOOKS ==========

/**
 * Hook to fetch content items with filtering and pagination
 */
export const useContentItems = (
  filters: ContentItemFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 },
  options: UseQueryOptions<PaginatedResponse<ContentItemWithDetails>> = {}
) => {
  return useQuery({
    queryKey: contentCreationKeys.itemsList(filters, pagination),
    queryFn: () => ContentCreationService.getContentItems(filters, pagination),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

/**
 * Hook to fetch a single content item by ID
 */
export const useContentItem = (
  itemId: string,
  options: UseQueryOptions<ContentItemWithDetails | null> = {}
) => {
  return useQuery({
    queryKey: contentCreationKeys.itemDetail(itemId),
    queryFn: async () => {
      // Get item from the list query since we don't have a specific getContentItem method
      const result = await ContentCreationService.getContentItems();
      return result.data.find(item => item.id === itemId) || null;
    },
    enabled: !!itemId,
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
 * Hook to fetch derivatives for a specific content item
 */
export const useItemDerivatives = (
  itemId: string,
  options: UseQueryOptions<PaginatedResponse<ContentItemWithDetails>> = {}
) => {
  return useQuery({
    queryKey: contentCreationKeys.itemDerivatives(itemId),
    queryFn: () => ContentCreationService.getContentItems({ 
      brief_id: itemId, // Derivatives would have the major item as their brief_id
      is_major_item: false 
    }),
    enabled: !!itemId,
    staleTime: 3 * 60 * 1000,
    ...options,
  });
};

// ========== MUTATION HOOKS ==========

/**
 * Hook to create a new content item
 */
export const useCreateContentItem = (
  options: UseMutationOptions<ContentItem, Error, CreateContentItemInput> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ContentCreationService.createContentItem,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: contentCreationKeys.items() });

      // Optimistically update the cache
      const previousItems = queryClient.getQueryData(
        contentCreationKeys.itemsList()
      ) as PaginatedResponse<ContentItemWithDetails> | undefined;

      if (previousItems) {
        const optimisticItem: ContentItemWithDetails = {
          id: `temp-${Date.now()}`,
          brief_id: variables.brief_id,
          organization_id: '',
          title: variables.title,
          content: variables.content,
          content_type: variables.content_type,
          status: 'draft',
          is_major_item: variables.is_major_item || false,
          derivatives_count: 0,
          created_by: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          can_create_derivatives: false,
        };

        queryClient.setQueryData(
          contentCreationKeys.itemsList(),
          {
            ...previousItems,
            data: [optimisticItem, ...previousItems.data],
            pagination: {
              ...previousItems.pagination,
              total: previousItems.pagination.total + 1
            }
          }
        );
      }

      return { previousItems };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousItems) {
        queryClient.setQueryData(
          contentCreationKeys.itemsList(),
          context.previousItems
        );
      }

      toast.error('Failed to create content item', {
        description: error.message || 'Please try again later.'
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.items() });
      
      // If created from a brief, invalidate brief's items
      if (variables.brief_id) {
        queryClient.invalidateQueries({ 
          queryKey: contentCreationKeys.briefItems(variables.brief_id) 
        });
      }
      
      toast.success('Content item created successfully!', {
        description: `"${data.title}" has been added to your content library.`
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.items() });
    },
    ...options,
  });
};

/**
 * Hook to update a content item
 */
export const useUpdateContentItem = (
  itemId: string,
  options: UseMutationOptions<ContentItem, Error, UpdateContentItemInput> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) => ContentCreationService.updateContentItem(itemId, input),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ 
        queryKey: contentCreationKeys.itemDetail(itemId) 
      });

      const previousItem = queryClient.getQueryData(
        contentCreationKeys.itemDetail(itemId)
      ) as ContentItemWithDetails | undefined;

      if (previousItem) {
        queryClient.setQueryData(
          contentCreationKeys.itemDetail(itemId),
          {
            ...previousItem,
            ...variables,
            updated_at: new Date().toISOString()
          }
        );
      }

      return { previousItem };
    },
    onError: (error, variables, context) => {
      if (context?.previousItem) {
        queryClient.setQueryData(
          contentCreationKeys.itemDetail(itemId),
          context.previousItem
        );
      }

      toast.error('Failed to update content item', {
        description: error.message || 'Please try again later.'
      });
    },
    onSuccess: (data) => {
      // Invalidate related queries
      contentCreationInvalidation.itemAndRelated(itemId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      toast.success('Content item updated successfully!');
    },
    ...options,
  });
};

/**
 * Hook to delete a content item
 */
export const useDeleteContentItem = (
  options: UseMutationOptions<void, Error, string> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ContentCreationService.deleteContentItem,
    onSuccess: (_, itemId) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ 
        queryKey: contentCreationKeys.itemDetail(itemId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.items() 
      });

      toast.success('Content item deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete content item', {
        description: error.message || 'Please try again later.'
      });
    },
    ...options,
  });
};

/**
 * Hook to create derivatives from a major content item (workflow action)
 */
export const useCreateDerivatives = (
  itemId: string,
  options: UseMutationOptions<ContentItem[], Error, string[]> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (derivativeTypes) => 
      ContentCreationService.createDerivatives(itemId, derivativeTypes),
    onMutate: async (variables) => {
      // Show loading state in UI
      toast.loading(`Creating ${variables.length} derivative(s)...`, {
        id: `derivatives-${itemId}`,
        duration: Infinity,
      });

      return { itemId };
    },
    onSuccess: (data, variables) => {
      // Dismiss loading toast
      toast.dismiss(`derivatives-${itemId}`);
      
      // Invalidate item derivatives and general items list
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.itemDerivatives(itemId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: contentCreationKeys.items() 
      });

      toast.success(`${data.length} derivative(s) created successfully!`, {
        description: 'New content variations have been generated.',
        action: {
          label: 'View All',
          onClick: () => {
            // Navigate to items list filtered by derivatives - will be implemented in UI phase
            console.log('Navigate to derivatives for item:', itemId);
          }
        }
      });
    },
    onError: (error) => {
      // Dismiss loading toast
      toast.dismiss(`derivatives-${itemId}`);
      
      toast.error('Failed to create derivatives', {
        description: error.message || 'Please try again later.'
      });
    },
    ...options,
  });
};

/**
 * Hook to publish a content item (changes status to published)
 */
export const usePublishContentItem = (
  itemId: string,
  options: UseMutationOptions<ContentItem, Error, void> = {}
) => {
  return useUpdateContentItem(itemId, {
    ...options,
    onMutate: async (variables) => {
      toast.loading('Publishing content item...', {
        id: `publish-${itemId}`,
        duration: 3000,
      });
    },
    onSuccess: (data, variables, context) => {
      toast.dismiss(`publish-${itemId}`);
      toast.success('Content item published successfully!', {
        description: 'Your content is now live and available.',
        action: {
          label: 'View Published',
          onClick: () => {
            console.log('View published content:', data.id);
          }
        }
      });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      toast.dismiss(`publish-${itemId}`);
      options.onError?.(error, variables, context);
    }
  });
};

/**
 * Hook to archive a content item (changes status to archived)
 */
export const useArchiveContentItem = (
  itemId: string,
  options: UseMutationOptions<ContentItem, Error, void> = {}
) => {
  return useUpdateContentItem(itemId, {
    ...options,
    onSuccess: (data, variables, context) => {
      toast.success('Content item archived successfully');
      options.onSuccess?.(data, variables, context);
    }
  });
};

// ========== CONVENIENCE HOOKS ==========

/**
 * Hook that combines items list with common filters
 */
export const useContentItemsFiltered = (
  status?: string,
  contentType?: string,
  search?: string,
  isMajorItem?: boolean,
  briefId?: string
) => {
  const filters: ContentItemFilters = {};
  if (status && status !== 'all') filters.status = status as any;
  if (contentType) filters.content_type = contentType;
  if (search) filters.search = search;
  if (isMajorItem !== undefined) filters.is_major_item = isMajorItem;
  if (briefId) filters.brief_id = briefId;

  return useContentItems(filters);
};

/**
 * Hook to get major content items (can create derivatives)
 */
export const useMajorContentItems = () => {
  return useContentItems({ is_major_item: true });
};

/**
 * Hook to get published content items
 */
export const usePublishedContentItems = () => {
  return useContentItems({ status: 'published' });
};

/**
 * Hook to get draft content items
 */
export const useDraftContentItems = () => {
  return useContentItems({ status: 'draft' });
};

/**
 * Hook to get content items ready for review
 */
export const useReviewReadyItems = () => {
  return useContentItems({ status: 'review' });
};

/**
 * Hook to prefetch next page of items
 */
export const usePrefetchNextItemsPage = (
  currentPage: number,
  filters: ContentItemFilters = {}
) => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: contentCreationKeys.itemsList(filters, { 
        page: currentPage + 1, 
        limit: 10 
      }),
      queryFn: () => ContentCreationService.getContentItems(filters, { 
        page: currentPage + 1, 
        limit: 10 
      }),
      staleTime: 5 * 60 * 1000,
    });
  };
};

// ========== BULK OPERATIONS ==========

/**
 * Hook to bulk update item statuses
 */
export const useBulkUpdateItemStatus = (
  options: UseMutationOptions<ContentItem[], Error, { itemIds: string[]; status: ContentItem['status'] }> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemIds, status }) => {
      const results = await Promise.all(
        itemIds.map(itemId => 
          ContentCreationService.updateContentItem(itemId, { status })
        )
      );
      return results;
    },
    onSuccess: (data, variables) => {
      // Invalidate all items queries
      queryClient.invalidateQueries({ queryKey: contentCreationKeys.items() });

      toast.success(`${data.length} item(s) updated successfully!`, {
        description: `Status changed to ${variables.status}`
      });
    },
    onError: (error) => {
      toast.error('Failed to update content items', {
        description: error.message || 'Some items may not have been updated.'
      });
    },
    ...options,
  });
};

/**
 * Hook to bulk publish content items
 */
export const useBulkPublishItems = (
  options: UseMutationOptions<ContentItem[], Error, string[]> = {}
) => {
  return useBulkUpdateItemStatus({
    ...options,
    onSuccess: (data, variables, context) => {
      toast.success(`${data.length} item(s) published successfully!`, {
        description: 'Your content is now live and available.'
      });
      options.onSuccess?.(data, variables, context);
    }
  });
};

/**
 * Hook to bulk archive content items
 */
export const useBulkArchiveItems = (
  options: UseMutationOptions<ContentItem[], Error, string[]> = {}
) => {
  return useBulkUpdateItemStatus({
    ...options,
    onSuccess: (data, variables, context) => {
      toast.success(`${data.length} item(s) archived successfully`);
      options.onSuccess?.(data, variables, context);
    }
  });
};

// ========== CONTENT ANALYTICS HOOKS ==========

/**
 * Hook to get content performance metrics
 */
export const useContentMetrics = (
  itemId: string,
  options: UseQueryOptions<any> = {}
) => {
  return useQuery({
    queryKey: [...contentCreationKeys.itemDetail(itemId), 'metrics'],
    queryFn: async () => {
      // Placeholder for content analytics - to be implemented
      return {
        views: 0,
        engagements: 0,
        shares: 0,
        conversion_rate: 0,
        performance_score: 'N/A'
      };
    },
    enabled: !!itemId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

// Export all hooks and types for easy importing
export type {
  ContentItemWithDetails,
  ContentItem,
  CreateContentItemInput,
  UpdateContentItemInput,
  ContentItemFilters,
};