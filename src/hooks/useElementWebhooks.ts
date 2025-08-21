/**
 * React hooks for element webhook CRUD operations
 * Provides optimized caching, real-time updates, and error handling
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useWebhookServices } from './useWebhookServices';
import {
  ElementWebhook,
  CreateElementWebhookRequest,
  UpdateElementWebhookRequest,
  BulkUpdateRequest,
  BulkCreateResponse,
  WebhookSearchFilters,
  PaginatedWebhooks,
  ValidationResult,
  ConnectivityTestResult,
  PaginationOptions
} from '../types/webhook';

// Query key factory for webhook operations
export const webhookQueryKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookQueryKeys.all, 'list'] as const,
  list: (filters: WebhookSearchFilters) => [...webhookQueryKeys.lists(), filters] as const,
  details: () => [...webhookQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...webhookQueryKeys.details(), id] as const,
  element: (featureSlug: string, pagePath: string, elementId: string) => 
    [...webhookQueryKeys.all, 'element', featureSlug, pagePath, elementId] as const,
  page: (featureSlug: string, pagePath: string) => 
    [...webhookQueryKeys.all, 'page', featureSlug, pagePath] as const,
  feature: (featureSlug: string) => 
    [...webhookQueryKeys.all, 'feature', featureSlug] as const,
  validation: (config: Partial<CreateElementWebhookRequest>) => 
    [...webhookQueryKeys.all, 'validation', config] as const,
  connectivity: (id: string) => 
    [...webhookQueryKeys.all, 'connectivity', id] as const,
};

/**
 * Get a single webhook by ID
 */
export function useElementWebhook(id: string): UseQueryResult<ElementWebhook | null> {
  const { elementService } = useWebhookServices();

  return useQuery({
    queryKey: webhookQueryKeys.detail(id),
    queryFn: () => elementService.getWebhook(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry for 404s
      if (error?.statusCode === 404) return false;
      return failureCount < 3;
    }
  });
}

/**
 * Get webhooks with search and pagination
 */
export function useElementWebhooks(
  filters: WebhookSearchFilters = {},
  pagination: PaginationOptions = {}
): UseQueryResult<PaginatedWebhooks> {
  const { elementService } = useWebhookServices();

  return useQuery({
    queryKey: webhookQueryKeys.list({ ...filters, ...pagination }),
    queryFn: () => elementService.searchWebhooks(filters, pagination),
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true, // Keep previous data while loading new page
  });
}

/**
 * Get webhooks for a specific element
 */
export function useElementWebhooksForElement(
  featureSlug: string,
  pagePath: string,
  elementId: string
): UseQueryResult<ElementWebhook[]> {
  const { elementService } = useWebhookServices();

  return useQuery({
    queryKey: webhookQueryKeys.element(featureSlug, pagePath, elementId),
    queryFn: () => elementService.getWebhooksForElement(featureSlug, pagePath, elementId),
    enabled: !!(featureSlug && pagePath && elementId),
    staleTime: 10 * 60 * 1000, // 10 minutes - element webhooks don't change often
  });
}

/**
 * Get webhooks for a specific page
 */
export function useElementWebhooksForPage(
  featureSlug: string,
  pagePath: string
): UseQueryResult<ElementWebhook[]> {
  const { elementService } = useWebhookServices();

  return useQuery({
    queryKey: webhookQueryKeys.page(featureSlug, pagePath),
    queryFn: () => elementService.getWebhooksForPage(featureSlug, pagePath),
    enabled: !!(featureSlug && pagePath),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get webhooks for a specific feature
 */
export function useElementWebhooksForFeature(featureSlug: string): UseQueryResult<ElementWebhook[]> {
  const { elementService } = useWebhookServices();

  return useQuery({
    queryKey: webhookQueryKeys.feature(featureSlug),
    queryFn: () => elementService.getWebhooksForFeature(featureSlug),
    enabled: !!featureSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get active webhooks for the organization
 */
export function useActiveElementWebhooks(): UseQueryResult<ElementWebhook[]> {
  const { elementService } = useWebhookServices();

  return useQuery({
    queryKey: webhookQueryKeys.list({ isActive: true }),
    queryFn: () => elementService.getActiveWebhooks(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create a new webhook
 */
export function useCreateElementWebhook(): UseMutationResult<
  ElementWebhook,
  Error,
  CreateElementWebhookRequest
> {
  const { elementService } = useWebhookServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateElementWebhookRequest) => elementService.createWebhook(request),
    onSuccess: (webhook, variables) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: webhookQueryKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: webhookQueryKeys.element(variables.featureSlug, variables.pagePath, variables.elementId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: webhookQueryKeys.page(variables.featureSlug, variables.pagePath) 
      });
      queryClient.invalidateQueries({ 
        queryKey: webhookQueryKeys.feature(variables.featureSlug) 
      });

      // Optimistically add to cache
      queryClient.setQueryData(webhookQueryKeys.detail(webhook.id), webhook);

      toast.success('Webhook created successfully', {
        description: `Created webhook for ${variables.elementId}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to create webhook', {
        description: error.message,
      });
    },
  });
}

/**
 * Update an existing webhook
 */
export function useUpdateElementWebhook(): UseMutationResult<
  ElementWebhook,
  Error,
  { id: string; updates: UpdateElementWebhookRequest }
> {
  const { elementService } = useWebhookServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }) => elementService.updateWebhook(id, updates),
    onSuccess: (webhook) => {
      // Update specific webhook in cache
      queryClient.setQueryData(webhookQueryKeys.detail(webhook.id), webhook);

      // Invalidate list queries to reflect changes
      queryClient.invalidateQueries({ queryKey: webhookQueryKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: webhookQueryKeys.element(webhook.featureSlug, webhook.pagePath, webhook.elementId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: webhookQueryKeys.page(webhook.featureSlug, webhook.pagePath) 
      });
      queryClient.invalidateQueries({ 
        queryKey: webhookQueryKeys.feature(webhook.featureSlug) 
      });

      toast.success('Webhook updated successfully', {
        description: `Updated webhook for ${webhook.elementId}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to update webhook', {
        description: error.message,
      });
    },
  });
}

/**
 * Delete a webhook
 */
export function useDeleteElementWebhook(): UseMutationResult<boolean, Error, string> {
  const { elementService } = useWebhookServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => elementService.deleteWebhook(id),
    onSuccess: (_, webhookId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: webhookQueryKeys.detail(webhookId) });

      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: webhookQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: webhookQueryKeys.all });

      toast.success('Webhook deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete webhook', {
        description: error.message,
      });
    },
  });
}

/**
 * Bulk create webhooks
 */
export function useBulkCreateElementWebhooks(): UseMutationResult<
  BulkCreateResponse,
  Error,
  CreateElementWebhookRequest[]
> {
  const { elementService } = useWebhookServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requests: CreateElementWebhookRequest[]) => 
      elementService.bulkCreateWebhooks(requests),
    onSuccess: (result) => {
      // Invalidate all list queries
      queryClient.invalidateQueries({ queryKey: webhookQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: webhookQueryKeys.all });

      toast.success(`Bulk operation completed`, {
        description: `Created ${result.successful.length} webhooks, ${result.failed.length} failed`,
      });
    },
    onError: (error) => {
      toast.error('Bulk create failed', {
        description: error.message,
      });
    },
  });
}

/**
 * Bulk update webhooks
 */
export function useBulkUpdateElementWebhooks(): UseMutationResult<
  ElementWebhook[],
  Error,
  BulkUpdateRequest[]
> {
  const { elementService } = useWebhookServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: BulkUpdateRequest[]) => 
      elementService.bulkUpdateWebhooks(updates),
    onSuccess: (updatedWebhooks) => {
      // Update individual webhooks in cache
      updatedWebhooks.forEach(webhook => {
        queryClient.setQueryData(webhookQueryKeys.detail(webhook.id), webhook);
      });

      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: webhookQueryKeys.lists() });

      toast.success(`Updated ${updatedWebhooks.length} webhooks successfully`);
    },
    onError: (error) => {
      toast.error('Bulk update failed', {
        description: error.message,
      });
    },
  });
}

/**
 * Bulk delete webhooks
 */
export function useBulkDeleteElementWebhooks(): UseMutationResult<boolean, Error, string[]> {
  const { elementService } = useWebhookServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => elementService.bulkDeleteWebhooks(ids),
    onSuccess: (_, deletedIds) => {
      // Remove from cache
      deletedIds.forEach(id => {
        queryClient.removeQueries({ queryKey: webhookQueryKeys.detail(id) });
      });

      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: webhookQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: webhookQueryKeys.all });

      toast.success(`Deleted ${deletedIds.length} webhooks successfully`);
    },
    onError: (error) => {
      toast.error('Bulk delete failed', {
        description: error.message,
      });
    },
  });
}

/**
 * Validate webhook configuration
 */
export function useValidateWebhookConfig(
  config: Partial<CreateElementWebhookRequest>
): UseQueryResult<ValidationResult> {
  const { elementService } = useWebhookServices();

  return useQuery({
    queryKey: webhookQueryKeys.validation(config),
    queryFn: () => elementService.validateWebhookConfig(config),
    enabled: Object.keys(config).length > 0,
    staleTime: 30 * 1000, // 30 seconds
    retry: false, // Don't retry validation
  });
}

/**
 * Test webhook connectivity
 */
export function useTestWebhookConnectivity(): UseMutationResult<
  ConnectivityTestResult,
  Error,
  string
> {
  const { elementService } = useWebhookServices();

  return useMutation({
    mutationFn: (id: string) => elementService.testWebhookConnectivity(id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Connectivity test passed', {
          description: `Response time: ${result.responseTime}ms`,
        });
      } else {
        toast.warning('Connectivity test failed', {
          description: result.error || 'Unknown error',
        });
      }
    },
    onError: (error) => {
      toast.error('Connectivity test error', {
        description: error.message,
      });
    },
  });
}

/**
 * Compound hook for webhook management with element context
 */
export function useWebhookManagement(elementContext: {
  featureSlug: string;
  pagePath: string;
  elementId: string;
}) {
  const { featureSlug, pagePath, elementId } = elementContext;
  
  const webhooks = useElementWebhooksForElement(featureSlug, pagePath, elementId);
  const createWebhook = useCreateElementWebhook();
  const updateWebhook = useUpdateElementWebhook();
  const deleteWebhook = useDeleteElementWebhook();
  const testConnectivity = useTestWebhookConnectivity();

  const webhook = webhooks.data?.[0] || null; // Assume one webhook per element for now
  const isLoading = webhooks.isLoading;
  const error = webhooks.error;

  const createWebhookForElement = useCallback(
    (config: Omit<CreateElementWebhookRequest, 'featureSlug' | 'pagePath' | 'elementId'>) => {
      return createWebhook.mutateAsync({
        ...config,
        featureSlug,
        pagePath,
        elementId,
      });
    },
    [createWebhook, featureSlug, pagePath, elementId]
  );

  const updateWebhookForElement = useCallback(
    (updates: UpdateElementWebhookRequest) => {
      if (!webhook) {
        throw new Error('No webhook to update');
      }
      return updateWebhook.mutateAsync({ id: webhook.id, updates });
    },
    [updateWebhook, webhook]
  );

  const deleteWebhookForElement = useCallback(() => {
    if (!webhook) {
      throw new Error('No webhook to delete');
    }
    return deleteWebhook.mutateAsync(webhook.id);
  }, [deleteWebhook, webhook]);

  const testWebhookConnectivity = useCallback(() => {
    if (!webhook) {
      throw new Error('No webhook to test');
    }
    return testConnectivity.mutateAsync(webhook.id);
  }, [testConnectivity, webhook]);

  return {
    webhook,
    isLoading,
    error,
    
    // Actions
    createWebhook: createWebhookForElement,
    updateWebhook: updateWebhookForElement,
    deleteWebhook: deleteWebhookForElement,
    testConnectivity: testWebhookConnectivity,
    
    // Status flags
    isCreating: createWebhook.isPending,
    isUpdating: updateWebhook.isPending,
    isDeleting: deleteWebhook.isPending,
    isTesting: testConnectivity.isPending,
    
    // Recent test results
    recentTestResult: testConnectivity.data,
  };
}

/**
 * Hook for webhook editor with form state management
 */
export function useWebhookEditor(webhookId?: string) {
  const webhook = useElementWebhook(webhookId || '');
  const createWebhook = useCreateElementWebhook();
  const updateWebhook = useUpdateElementWebhook();
  const validateConfig = useValidateWebhookConfig;
  const testConnectivity = useTestWebhookConnectivity();

  const isEditing = !!webhookId;
  const isLoading = webhook.isLoading;

  return {
    webhook: webhook.data,
    isEditing,
    isLoading,
    
    // Actions
    createWebhook: createWebhook.mutateAsync,
    updateWebhook: (updates: UpdateElementWebhookRequest) => 
      webhookId ? updateWebhook.mutateAsync({ id: webhookId, updates }) : Promise.reject('No webhook ID'),
    validateConfig,
    testConfiguration: () => 
      webhookId ? testConnectivity.mutateAsync(webhookId) : Promise.reject('No webhook ID'),
    
    // Status
    isSaving: createWebhook.isPending || updateWebhook.isPending,
    isTesting: testConnectivity.isPending,
    
    // Recent results
    testResult: testConnectivity.data,
    saveError: createWebhook.error || updateWebhook.error,
    testError: testConnectivity.error,
  };
}