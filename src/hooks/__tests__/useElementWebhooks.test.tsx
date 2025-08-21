/**
 * Comprehensive test suite for webhook React hooks
 * Tests hook behavior, caching, error handling, and real-time updates
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { 
  useElementWebhook,
  useElementWebhooks,
  useCreateElementWebhook,
  useUpdateElementWebhook,
  useDeleteElementWebhook,
  useWebhookManagement,
  useWebhookEditor
} from '../useElementWebhooks';
import { useWebhookServices } from '../useWebhookServices';
import {
  ElementWebhook,
  CreateElementWebhookRequest,
  UpdateElementWebhookRequest
} from '../../types/webhook';

// Mock webhook services
const mockElementService = {
  getWebhook: vi.fn(),
  searchWebhooks: vi.fn(),
  getWebhooksForElement: vi.fn(),
  createWebhook: vi.fn(),
  updateWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  validateWebhookConfig: vi.fn(),
  testWebhookConnectivity: vi.fn(),
};

// Mock useWebhookServices hook
vi.mock('../useWebhookServices', () => ({
  useWebhookServices: vi.fn(() => ({
    elementService: mockElementService,
    discoveryService: {},
    executionService: {},
  })),
}));

// Mock organization context
vi.mock('../../contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' },
  })),
}));

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useElementWebhooks hooks', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  const mockWebhook: ElementWebhook = {
    id: 'webhook-1',
    organizationId: 'org-1',
    featureSlug: 'test-feature',
    pagePath: '/test-page',
    elementId: 'test-element',
    endpointUrl: 'https://api.example.com/webhook',
    httpMethod: 'POST',
    payloadTemplate: { test: 'data' },
    headers: { 'Content-Type': 'application/json' },
    timeoutSeconds: 30,
    retryCount: 3,
    rateLimitPerMinute: 60,
    isActive: true,
    healthStatus: 'healthy',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    totalExecutions: 10,
    successfulExecutions: 9,
    failedExecutions: 1,
    averageResponseTime: 500,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('useElementWebhook', () => {
    it('should fetch webhook successfully', async () => {
      mockElementService.getWebhook.mockResolvedValue(mockWebhook);

      const { result } = renderHook(() => useElementWebhook('webhook-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockWebhook);
      expect(mockElementService.getWebhook).toHaveBeenCalledWith('webhook-1');
    });

    it('should handle webhook not found', async () => {
      mockElementService.getWebhook.mockResolvedValue(null);

      const { result } = renderHook(() => useElementWebhook('non-existent'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should handle service errors', async () => {
      mockElementService.getWebhook.mockRejectedValue(new Error('Service error'));

      const { result } = renderHook(() => useElementWebhook('webhook-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Service error'));
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useElementWebhook(''), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockElementService.getWebhook).not.toHaveBeenCalled();
    });

    it('should use correct cache key', async () => {
      mockElementService.getWebhook.mockResolvedValue(mockWebhook);

      renderHook(() => useElementWebhook('webhook-1'), { wrapper });

      await waitFor(() => {
        const cacheData = queryClient.getQueryData(['webhooks', 'detail', 'webhook-1']);
        expect(cacheData).toEqual(mockWebhook);
      });
    });
  });

  describe('useElementWebhooks', () => {
    const mockPaginatedResult = {
      webhooks: [mockWebhook],
      totalCount: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      currentPage: 1,
      totalPages: 1,
    };

    it('should search webhooks with filters', async () => {
      mockElementService.searchWebhooks.mockResolvedValue(mockPaginatedResult);

      const filters = { featureSlug: 'test-feature', isActive: true };
      const pagination = { page: 1, limit: 10 };

      const { result } = renderHook(
        () => useElementWebhooks(filters, pagination),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaginatedResult);
      expect(mockElementService.searchWebhooks).toHaveBeenCalledWith(filters, pagination);
    });

    it('should handle empty results', async () => {
      const emptyResult = {
        webhooks: [],
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        currentPage: 1,
        totalPages: 0,
      };

      mockElementService.searchWebhooks.mockResolvedValue(emptyResult);

      const { result } = renderHook(() => useElementWebhooks(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(emptyResult);
    });

    it('should keep previous data during refetch', async () => {
      mockElementService.searchWebhooks.mockResolvedValue(mockPaginatedResult);

      const { result, rerender } = renderHook(
        ({ page }: { page: number }) => useElementWebhooks({}, { page }),
        { 
          wrapper,
          initialProps: { page: 1 }
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const firstPageData = result.current.data;

      // Change to page 2
      mockElementService.searchWebhooks.mockResolvedValue({
        ...mockPaginatedResult,
        currentPage: 2,
      });

      rerender({ page: 2 });

      // Should still have previous data while loading
      expect(result.current.data).toEqual(firstPageData);
    });
  });

  describe('useCreateElementWebhook', () => {
    const createRequest: CreateElementWebhookRequest = {
      featureSlug: 'test-feature',
      pagePath: '/test-page',
      elementId: 'test-element',
      endpointUrl: 'https://api.example.com/webhook',
      httpMethod: 'POST',
    };

    it('should create webhook successfully', async () => {
      mockElementService.createWebhook.mockResolvedValue(mockWebhook);

      const { result } = renderHook(() => useCreateElementWebhook(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(createRequest);
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(mockWebhook);
      expect(mockElementService.createWebhook).toHaveBeenCalledWith(createRequest);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Creation failed');
      mockElementService.createWebhook.mockRejectedValue(error);

      const { result } = renderHook(() => useCreateElementWebhook(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(createRequest);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toEqual(error);
    });

    it('should invalidate relevant queries on success', async () => {
      mockElementService.createWebhook.mockResolvedValue(mockWebhook);

      // Pre-populate cache with some data
      queryClient.setQueryData(['webhooks', 'list'], { webhooks: [] });

      const { result } = renderHook(() => useCreateElementWebhook(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(createRequest);
      });

      // Check that queries were invalidated
      await waitFor(() => {
        expect(queryClient.getQueryState(['webhooks', 'list'])?.isInvalidated).toBe(true);
      });
    });

    it('should add webhook to cache optimistically', async () => {
      mockElementService.createWebhook.mockResolvedValue(mockWebhook);

      const { result } = renderHook(() => useCreateElementWebhook(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(createRequest);
      });

      // Check that webhook was added to detail cache
      const cachedWebhook = queryClient.getQueryData(['webhooks', 'detail', mockWebhook.id]);
      expect(cachedWebhook).toEqual(mockWebhook);
    });
  });

  describe('useUpdateElementWebhook', () => {
    const updateRequest: UpdateElementWebhookRequest = {
      endpointUrl: 'https://api.example.com/webhook-v2',
      isActive: false,
    };

    it('should update webhook successfully', async () => {
      const updatedWebhook = { ...mockWebhook, ...updateRequest };
      mockElementService.updateWebhook.mockResolvedValue(updatedWebhook);

      const { result } = renderHook(() => useUpdateElementWebhook(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: 'webhook-1', updates: updateRequest });
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(updatedWebhook);
      expect(mockElementService.updateWebhook).toHaveBeenCalledWith('webhook-1', updateRequest);
    });

    it('should update cache with new data', async () => {
      const updatedWebhook = { ...mockWebhook, ...updateRequest };
      mockElementService.updateWebhook.mockResolvedValue(updatedWebhook);

      const { result } = renderHook(() => useUpdateElementWebhook(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: 'webhook-1', updates: updateRequest });
      });

      // Check that cache was updated
      const cachedWebhook = queryClient.getQueryData(['webhooks', 'detail', 'webhook-1']);
      expect(cachedWebhook).toEqual(updatedWebhook);
    });
  });

  describe('useDeleteElementWebhook', () => {
    it('should delete webhook successfully', async () => {
      mockElementService.deleteWebhook.mockResolvedValue(true);

      const { result } = renderHook(() => useDeleteElementWebhook(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('webhook-1');
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toBe(true);
      expect(mockElementService.deleteWebhook).toHaveBeenCalledWith('webhook-1');
    });

    it('should remove webhook from cache', async () => {
      mockElementService.deleteWebhook.mockResolvedValue(true);

      // Pre-populate cache
      queryClient.setQueryData(['webhooks', 'detail', 'webhook-1'], mockWebhook);

      const { result } = renderHook(() => useDeleteElementWebhook(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('webhook-1');
      });

      // Check that webhook was removed from cache
      const cachedWebhook = queryClient.getQueryData(['webhooks', 'detail', 'webhook-1']);
      expect(cachedWebhook).toBeUndefined();
    });
  });

  describe('useWebhookManagement', () => {
    const elementContext = {
      featureSlug: 'test-feature',
      pagePath: '/test-page',
      elementId: 'test-element',
    };

    beforeEach(() => {
      mockElementService.getWebhooksForElement.mockResolvedValue([mockWebhook]);
      mockElementService.createWebhook.mockResolvedValue(mockWebhook);
      mockElementService.updateWebhook.mockResolvedValue(mockWebhook);
      mockElementService.deleteWebhook.mockResolvedValue(true);
      mockElementService.testWebhookConnectivity.mockResolvedValue({
        success: true,
        responseTime: 500,
        statusCode: 200,
        endpointReachable: true,
        sslValid: true,
        dnsResolvable: true,
        recommendations: [],
        testedAt: new Date().toISOString(),
      });
    });

    it('should provide complete webhook management interface', async () => {
      const { result } = renderHook(
        () => useWebhookManagement(elementContext),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.webhook).toEqual(mockWebhook);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.createWebhook).toBe('function');
      expect(typeof result.current.updateWebhook).toBe('function');
      expect(typeof result.current.deleteWebhook).toBe('function');
      expect(typeof result.current.testConnectivity).toBe('function');
    });

    it('should create webhook with element context', async () => {
      const { result } = renderHook(
        () => useWebhookManagement(elementContext),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.webhook).toEqual(mockWebhook);
      });

      const createConfig = {
        endpointUrl: 'https://api.example.com/webhook',
        httpMethod: 'POST' as const,
      };

      await act(async () => {
        await result.current.createWebhook(createConfig);
      });

      expect(mockElementService.createWebhook).toHaveBeenCalledWith({
        ...createConfig,
        ...elementContext,
      });
    });

    it('should update webhook when webhook exists', async () => {
      const { result } = renderHook(
        () => useWebhookManagement(elementContext),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.webhook).toEqual(mockWebhook);
      });

      const updates = { isActive: false };

      await act(async () => {
        await result.current.updateWebhook(updates);
      });

      expect(mockElementService.updateWebhook).toHaveBeenCalledWith(mockWebhook.id, updates);
    });

    it('should throw error when updating non-existent webhook', async () => {
      mockElementService.getWebhooksForElement.mockResolvedValue([]);

      const { result } = renderHook(
        () => useWebhookManagement(elementContext),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.webhook).toBeNull();
      });

      await expect(
        result.current.updateWebhook({ isActive: false })
      ).rejects.toThrow('No webhook to update');
    });

    it('should test webhook connectivity', async () => {
      const { result } = renderHook(
        () => useWebhookManagement(elementContext),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.webhook).toEqual(mockWebhook);
      });

      await act(async () => {
        await result.current.testConnectivity();
      });

      expect(mockElementService.testWebhookConnectivity).toHaveBeenCalledWith(mockWebhook.id);
    });

    it('should provide loading states for all operations', async () => {
      const { result } = renderHook(
        () => useWebhookManagement(elementContext),
        { wrapper }
      );

      expect(result.current.isCreating).toBe(false);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
      expect(result.current.isTesting).toBe(false);
    });
  });

  describe('useWebhookEditor', () => {
    beforeEach(() => {
      mockElementService.getWebhook.mockResolvedValue(mockWebhook);
      mockElementService.createWebhook.mockResolvedValue(mockWebhook);
      mockElementService.updateWebhook.mockResolvedValue(mockWebhook);
      mockElementService.testWebhookConnectivity.mockResolvedValue({
        success: true,
        responseTime: 500,
        statusCode: 200,
        endpointReachable: true,
        sslValid: true,
        dnsResolvable: true,
        recommendations: [],
        testedAt: new Date().toISOString(),
      });
    });

    it('should provide editor interface for existing webhook', async () => {
      const { result } = renderHook(
        () => useWebhookEditor('webhook-1'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.webhook).toEqual(mockWebhook);
      });

      expect(result.current.isEditing).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(typeof result.current.updateWebhook).toBe('function');
      expect(typeof result.current.testConfiguration).toBe('function');
    });

    it('should provide editor interface for new webhook', () => {
      const { result } = renderHook(
        () => useWebhookEditor(),
        { wrapper }
      );

      expect(result.current.isEditing).toBe(false);
      expect(result.current.webhook).toBeUndefined();
      expect(typeof result.current.createWebhook).toBe('function');
    });

    it('should update webhook in edit mode', async () => {
      const { result } = renderHook(
        () => useWebhookEditor('webhook-1'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.webhook).toEqual(mockWebhook);
      });

      const updates = { isActive: false };

      await act(async () => {
        await result.current.updateWebhook(updates);
      });

      expect(mockElementService.updateWebhook).toHaveBeenCalledWith('webhook-1', updates);
    });

    it('should test configuration in edit mode', async () => {
      const { result } = renderHook(
        () => useWebhookEditor('webhook-1'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.webhook).toEqual(mockWebhook);
      });

      await act(async () => {
        await result.current.testConfiguration();
      });

      expect(mockElementService.testWebhookConnectivity).toHaveBeenCalledWith('webhook-1');
    });

    it('should reject operations when no webhook ID provided', async () => {
      const { result } = renderHook(
        () => useWebhookEditor(),
        { wrapper }
      );

      await expect(
        result.current.updateWebhook({ isActive: false })
      ).rejects.toThrow('No webhook ID');

      await expect(
        result.current.testConfiguration()
      ).rejects.toThrow('No webhook ID');
    });

    it('should provide loading and error states', () => {
      const { result } = renderHook(
        () => useWebhookEditor('webhook-1'),
        { wrapper }
      );

      expect(result.current.isSaving).toBe(false);
      expect(result.current.isTesting).toBe(false);
      expect(result.current.saveError).toBeNull();
      expect(result.current.testError).toBeNull();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle network failures gracefully', async () => {
      mockElementService.getWebhook.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useElementWebhook('webhook-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Network error');
    });

    it('should handle service unavailable', async () => {
      const serviceError = new Error('Service temporarily unavailable');
      serviceError.statusCode = 503;
      
      mockElementService.getWebhook.mockRejectedValue(serviceError);

      const { result } = renderHook(() => useElementWebhook('webhook-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(serviceError);
    });

    it('should handle malformed data gracefully', async () => {
      mockElementService.getWebhook.mockResolvedValue({
        // Incomplete webhook data
        id: 'webhook-1',
        organizationId: 'org-1',
      });

      const { result } = renderHook(() => useElementWebhook('webhook-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should handle partial data without crashing
      expect(result.current.data?.id).toBe('webhook-1');
    });
  });

  describe('caching behavior', () => {
    it('should use stale-while-revalidate strategy', async () => {
      mockElementService.getWebhook.mockResolvedValue(mockWebhook);

      // First render
      const { result, rerender } = renderHook(() => useElementWebhook('webhook-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Clear mock call history
      mockElementService.getWebhook.mockClear();

      // Second render should use cached data
      rerender();

      // Should not call service again immediately
      expect(mockElementService.getWebhook).not.toHaveBeenCalled();
      expect(result.current.data).toEqual(mockWebhook);
    });

    it('should share cache between different hook instances', async () => {
      mockElementService.getWebhook.mockResolvedValue(mockWebhook);

      // First hook instance
      const { result: result1 } = renderHook(() => useElementWebhook('webhook-1'), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second hook instance should use cached data
      const { result: result2 } = renderHook(() => useElementWebhook('webhook-1'), { wrapper });

      expect(result2.current.data).toEqual(mockWebhook);
      expect(result2.current.isSuccess).toBe(true);

      // Service should only be called once
      expect(mockElementService.getWebhook).toHaveBeenCalledTimes(1);
    });
  });
});