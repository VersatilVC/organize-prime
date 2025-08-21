/**
 * Integration tests for the complete webhook system
 * Tests end-to-end workflows, service interactions, and real-world scenarios
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

import { ElementWebhookService } from '../../services/ElementWebhookService';
import { WebhookDiscoveryService } from '../../services/WebhookDiscoveryService';
import { WebhookExecutionService } from '../../services/WebhookExecutionService';
import { useWebhookManagement } from '../../hooks/useElementWebhooks';
import { useSmartElementDiscovery } from '../../hooks/useWebhookDiscovery';
import { useWebhookExecution } from '../../hooks/useWebhookExecution';
import { webhookQueryClient, webhookCacheWarmer } from '../../lib/webhook-query-client';

import {
  ElementWebhook,
  CreateElementWebhookRequest,
  WebhookExecutionRequest,
  DiscoveredElement
} from '../../types/webhook';

// Mock environment variables
const mockEnv = {
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
};

vi.stubGlobal('import.meta', {
  env: mockEnv,
});

// Mock DOM for discovery tests
const mockDocument = {
  querySelectorAll: vi.fn(),
  querySelector: vi.fn(),
  body: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
};

vi.stubGlobal('document', mockDocument);

// Mock window for navigation and events
const mockWindow = {
  location: { pathname: '/test-page' },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  navigator: { onLine: true },
  fetch: vi.fn(),
};

vi.stubGlobal('window', mockWindow);

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  update: vi.fn(() => mockSupabaseClient),
  delete: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn(() => mockSupabaseClient),
  order: vi.fn(() => mockSupabaseClient),
  range: vi.fn(() => mockSupabaseClient),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })),
  removeChannel: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Mock organization context
vi.mock('../../contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-1', name: 'Test Organization' },
  })),
}));

// Mock toast notifications
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

vi.mock('sonner', () => ({
  toast: mockToast,
}));

describe('Webhook System Integration Tests', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;
  let elementService: ElementWebhookService;
  let discoveryService: WebhookDiscoveryService;
  let executionService: WebhookExecutionService;

  const mockWebhook: ElementWebhook = {
    id: 'webhook-1',
    organizationId: 'org-1',
    featureSlug: 'test-feature',
    pagePath: '/test-page',
    elementId: 'submit-button',
    endpointUrl: 'https://api.example.com/webhook',
    httpMethod: 'POST',
    payloadTemplate: { action: 'submit', userId: '${userId}' },
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
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageResponseTime: 0,
  };

  const mockElement: DiscoveredElement = {
    elementId: 'submit-button',
    elementType: 'button',
    tagName: 'button',
    textContent: 'Submit Form',
    attributes: { id: 'submit-button', class: 'btn btn-primary' },
    cssSelector: '#submit-button',
    xpath: '//button[@id="submit-button"]',
    boundingRect: { x: 100, y: 200, width: 120, height: 40 },
    isVisible: true,
    isInteractable: true,
    childElementIds: [],
    discoveredAt: '2024-01-01T00:00:00Z',
    fingerprint: 'fingerprint-123',
  };

  beforeAll(() => {
    // Initialize services
    const serviceConfig = {
      supabaseUrl: mockEnv.VITE_SUPABASE_URL,
      supabaseAnonKey: mockEnv.VITE_SUPABASE_ANON_KEY,
      organizationId: 'org-1',
      enableLogging: false,
      enableRateLimiting: false,
    };

    elementService = new ElementWebhookService(serviceConfig);
    discoveryService = new WebhookDiscoveryService(serviceConfig);
    executionService = new WebhookExecutionService(serviceConfig, {
      edgeFunctionUrl: 'https://test.supabase.co/functions/v1/execute-element-webhook',
    });
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  afterAll(() => {
    elementService.dispose();
    discoveryService.dispose();
    executionService.dispose();
  });

  describe('Complete Webhook Lifecycle', () => {
    it('should complete full webhook creation and execution workflow', async () => {
      // Step 1: Discover elements on the page
      mockDocument.querySelectorAll.mockReturnValue([
        {
          tagName: 'BUTTON',
          id: 'submit-button',
          textContent: 'Submit Form',
          className: 'btn btn-primary',
          getAttribute: vi.fn((attr) => {
            const attrs = { id: 'submit-button', class: 'btn btn-primary' };
            return attrs[attr as keyof typeof attrs];
          }),
          getBoundingClientRect: vi.fn(() => ({ x: 100, y: 200, width: 120, height: 40 })),
          attributes: [
            { name: 'id', value: 'submit-button' },
            { name: 'class', value: 'btn btn-primary' },
          ],
          parentElement: null,
          children: [],
          matches: vi.fn(() => false),
        },
      ]);

      // Mock element discovery
      const discoveryHook = renderHook(
        () => useSmartElementDiscovery('test-feature', { autoRegister: false }),
        { wrapper }
      );

      await waitFor(() => {
        expect(discoveryHook.result.current.allElements).toHaveLength(1);
      });

      const discoveredElement = discoveryHook.result.current.allElements[0];
      expect(discoveredElement.elementId).toBe('submit-button');

      // Step 2: Create webhook for discovered element
      mockSupabaseClient.eq.mockImplementation(() => ({
        ...mockSupabaseClient,
        eq: vi.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }));

      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: 'webhook-1',
          organization_id: 'org-1',
          feature_slug: 'test-feature',
          page_path: '/test-page',
          element_id: 'submit-button',
          endpoint_url: 'https://api.example.com/webhook',
          http_method: 'POST',
          payload_template: { action: 'submit' },
          headers: { 'Content-Type': 'application/json' },
          timeout_seconds: 30,
          retry_count: 3,
          rate_limit_per_minute: 60,
          is_active: true,
          health_status: 'unknown',
          created_by: 'user-1',
          updated_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          total_executions: 0,
          successful_executions: 0,
          failed_executions: 0,
          average_response_time: 0,
        },
        error: null,
      });

      const managementHook = renderHook(
        () => useWebhookManagement({
          featureSlug: 'test-feature',
          pagePath: '/test-page',
          elementId: 'submit-button',
        }),
        { wrapper }
      );

      const createRequest: CreateElementWebhookRequest = {
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: 'submit-button',
        endpointUrl: 'https://api.example.com/webhook',
        httpMethod: 'POST',
        payloadTemplate: { action: 'submit' },
      };

      await act(async () => {
        await managementHook.result.current.createWebhook(createRequest);
      });

      expect(managementHook.result.current.isCreating).toBe(false);
      expect(mockToast.success).toHaveBeenCalledWith(
        'Webhook created successfully',
        expect.any(Object)
      );

      // Step 3: Execute the webhook
      mockWindow.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          executionId: 'exec-1',
          webhookId: 'webhook-1',
          statusCode: 200,
          responseTime: 500,
        }),
      });

      const [executeWebhook] = renderHook(() => useWebhookExecution(), { wrapper }).result.current;

      const executionRequest: WebhookExecutionRequest = {
        webhookId: 'webhook-1',
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: 'submit-button',
        eventType: 'click',
        payload: { formData: { name: 'John', email: 'john@example.com' } },
        userContext: {
          userId: 'user-1',
          role: 'user',
        },
      };

      let executionResult;
      await act(async () => {
        executionResult = await executeWebhook(executionRequest);
      });

      expect(executionResult.success).toBe(true);
      expect(executionResult.executionId).toBeDefined();
      expect(mockToast.success).toHaveBeenCalledWith(
        'Webhook executed successfully',
        expect.any(Object)
      );
    });

    it('should handle complete error recovery workflow', async () => {
      // Step 1: Create webhook with invalid endpoint
      const createRequest: CreateElementWebhookRequest = {
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: 'error-button',
        endpointUrl: 'https://invalid-endpoint.com/webhook',
        httpMethod: 'POST',
      };

      mockSupabaseClient.eq.mockImplementation(() => ({
        ...mockSupabaseClient,
        eq: vi.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }));

      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...mockWebhook,
          id: 'webhook-error',
          element_id: 'error-button',
          endpoint_url: 'https://invalid-endpoint.com/webhook',
        },
        error: null,
      });

      const managementHook = renderHook(
        () => useWebhookManagement({
          featureSlug: 'test-feature',
          pagePath: '/test-page',
          elementId: 'error-button',
        }),
        { wrapper }
      );

      await act(async () => {
        await managementHook.result.current.createWebhook(createRequest);
      });

      // Step 2: Test connectivity (should fail)
      mockWindow.fetch.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        try {
          await managementHook.result.current.testConnectivity();
        } catch (error) {
          // Expected to fail
        }
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        'Connectivity test error',
        expect.any(Object)
      );

      // Step 3: Update webhook with correct endpoint
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...mockWebhook,
          id: 'webhook-error',
          element_id: 'error-button',
          endpoint_url: 'https://api.example.com/webhook',
        },
        error: null,
      });

      await act(async () => {
        await managementHook.result.current.updateWebhook({
          endpointUrl: 'https://api.example.com/webhook',
        });
      });

      expect(mockToast.success).toHaveBeenCalledWith(
        'Webhook updated successfully',
        expect.any(Object)
      );

      // Step 4: Test connectivity again (should succeed)
      mockWindow.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      await act(async () => {
        await managementHook.result.current.testConnectivity();
      });

      expect(mockToast.success).toHaveBeenCalledWith(
        'Connectivity test passed',
        expect.any(Object)
      );
    });

    it('should handle bulk operations efficiently', async () => {
      // Prepare multiple webhook creation requests
      const bulkRequests: CreateElementWebhookRequest[] = Array.from({ length: 5 }, (_, i) => ({
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: `element-${i}`,
        endpointUrl: `https://api.example.com/webhook-${i}`,
        httpMethod: 'POST',
      }));

      // Mock successful bulk creation
      mockSupabaseClient.eq.mockImplementation(() => ({
        ...mockSupabaseClient,
        eq: vi.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }));

      const mockWebhooks = bulkRequests.map((req, i) => ({
        ...mockWebhook,
        id: `webhook-${i}`,
        element_id: req.elementId,
        endpoint_url: req.endpointUrl,
      }));

      mockSupabaseClient.single.mockImplementation(() => {
        const webhook = mockWebhooks.shift();
        return Promise.resolve({ data: webhook, error: null });
      });

      // Execute bulk creation through service layer
      const result = await elementService.bulkCreateWebhooks(bulkRequests);

      expect(result.successful).toHaveLength(5);
      expect(result.failed).toHaveLength(0);

      // Verify all webhooks were created with correct data
      result.successful.forEach((webhook, i) => {
        expect(webhook.elementId).toBe(`element-${i}`);
        expect(webhook.endpointUrl).toBe(`https://api.example.com/webhook-${i}`);
      });
    });

    it('should handle real-time updates and cache invalidation', async () => {
      // Set up initial webhook in cache
      queryClient.setQueryData(['webhooks', 'detail', 'webhook-1'], mockWebhook);

      const webhookQuery = renderHook(
        () => queryClient.getQueryData(['webhooks', 'detail', 'webhook-1']),
        { wrapper }
      );

      expect(webhookQuery.result.current).toEqual(mockWebhook);

      // Simulate real-time update
      const updatedWebhook = { ...mockWebhook, isActive: false };
      
      act(() => {
        queryClient.setQueryData(['webhooks', 'detail', 'webhook-1'], updatedWebhook);
      });

      // Verify cache was updated
      const updatedQuery = renderHook(
        () => queryClient.getQueryData(['webhooks', 'detail', 'webhook-1']),
        { wrapper }
      );

      expect(updatedQuery.result.current).toEqual(updatedWebhook);
    });
  });

  describe('Performance and Caching Integration', () => {
    it('should warm cache efficiently on application load', async () => {
      vi.spyOn(webhookQueryClient, 'prefetchQuery').mockResolvedValue(undefined);

      // Warm essential cache
      await webhookCacheWarmer.warmEssentialCache('org-1');

      expect(webhookQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['webhooks', 'list', { isActive: true }],
        staleTime: 10 * 60 * 1000,
      });

      expect(webhookQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['user-preferences'],
        staleTime: 30 * 60 * 1000,
      });

      // Warm feature-specific cache
      await webhookCacheWarmer.warmFeatureCache('test-feature');

      expect(webhookQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['webhooks', 'feature', 'test-feature'],
        staleTime: 5 * 60 * 1000,
      });
    });

    it('should handle cache invalidation patterns correctly', async () => {
      // Set up cached data
      queryClient.setQueryData(['webhooks', 'list'], { webhooks: [mockWebhook] });
      queryClient.setQueryData(['webhooks', 'detail', 'webhook-1'], mockWebhook);
      queryClient.setQueryData(['webhooks', 'feature', 'test-feature'], [mockWebhook]);

      // Simulate webhook update
      const updateHook = renderHook(() => {
        const { mutateAsync } = useMutation({
          mutationFn: ({ id, updates }: { id: string; updates: any }) => 
            elementService.updateWebhook(id, updates),
          onSuccess: (webhook) => {
            // Update specific webhook in cache
            queryClient.setQueryData(['webhooks', 'detail', webhook.id], webhook);
            
            // Invalidate list queries
            queryClient.invalidateQueries({ queryKey: ['webhooks', 'list'] });
            queryClient.invalidateQueries({ 
              queryKey: ['webhooks', 'feature', webhook.featureSlug] 
            });
          },
        });
        return { mutateAsync };
      }, { wrapper });

      mockSupabaseClient.single.mockResolvedValue({
        data: { ...mockWebhook, is_active: false },
        error: null,
      });

      await act(async () => {
        await updateHook.result.current.mutateAsync({
          id: 'webhook-1',
          updates: { isActive: false },
        });
      });

      // Check that specific webhook was updated
      const updatedWebhook = queryClient.getQueryData(['webhooks', 'detail', 'webhook-1']);
      expect(updatedWebhook.isActive).toBe(false);

      // Check that list queries were invalidated
      expect(queryClient.getQueryState(['webhooks', 'list'])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(['webhooks', 'feature', 'test-feature'])?.isInvalidated).toBe(true);
    });

    it('should handle concurrent operations without conflicts', async () => {
      // Set up multiple concurrent webhook creation requests
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: `concurrent-element-${i}`,
        endpointUrl: `https://api.example.com/webhook-${i}`,
        httpMethod: 'POST' as const,
      }));

      mockSupabaseClient.eq.mockImplementation(() => ({
        ...mockSupabaseClient,
        eq: vi.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }));

      let requestCount = 0;
      mockSupabaseClient.single.mockImplementation(() => {
        const request = concurrentRequests[requestCount++];
        return Promise.resolve({
          data: {
            ...mockWebhook,
            id: `webhook-${requestCount}`,
            element_id: request.elementId,
            endpoint_url: request.endpointUrl,
          },
          error: null,
        });
      });

      // Execute concurrent requests
      const promises = concurrentRequests.map(request => 
        elementService.createWebhook(request)
      );

      const results = await Promise.all(promises);

      // Verify all requests completed successfully
      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.elementId).toBe(`concurrent-element-${i}`);
        expect(result.endpointUrl).toBe(`https://api.example.com/webhook-${i}`);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle service degradation gracefully', async () => {
      // Simulate database connection issues
      mockSupabaseClient.single.mockRejectedValue(new Error('Database connection failed'));

      const managementHook = renderHook(
        () => useWebhookManagement({
          featureSlug: 'test-feature',
          pagePath: '/test-page',
          elementId: 'test-element',
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(managementHook.result.current.error).toBeDefined();
      });

      // Verify error is handled gracefully
      expect(managementHook.result.current.webhook).toBeNull();
      expect(managementHook.result.current.isLoading).toBe(false);

      // Simulate service recovery
      mockSupabaseClient.single.mockResolvedValue({
        data: mockWebhook,
        error: null,
      });

      // Trigger refetch
      await act(async () => {
        await managementHook.result.current.refetch();
      });

      await waitFor(() => {
        expect(managementHook.result.current.webhook).toEqual(mockWebhook);
      });
    });

    it('should handle network failures with proper fallbacks', async () => {
      // Simulate network failure
      mockWindow.fetch.mockRejectedValue(new Error('Network error'));

      const [executeWebhook] = renderHook(() => useWebhookExecution(), { wrapper }).result.current;

      const executionRequest: WebhookExecutionRequest = {
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: 'test-element',
        eventType: 'click',
        payload: { test: 'data' },
        userContext: { userId: 'user-1', role: 'user' },
      };

      let result;
      await act(async () => {
        result = await executeWebhook(executionRequest);
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_ERROR');
      expect(mockToast.error).toHaveBeenCalledWith(
        'Webhook execution failed',
        expect.any(Object)
      );
    });

    it('should validate data integrity across service boundaries', async () => {
      // Test with malformed webhook data
      const malformedWebhook = {
        id: 'malformed-webhook',
        organizationId: 'org-1',
        // Missing required fields
        endpointUrl: 'https://api.example.com/webhook',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: malformedWebhook,
        error: null,
      });

      const managementHook = renderHook(
        () => useWebhookManagement({
          featureSlug: 'test-feature',
          pagePath: '/test-page',
          elementId: 'malformed-element',
        }),
        { wrapper }
      );

      await waitFor(() => {
        // Should handle malformed data gracefully
        expect(managementHook.result.current.webhook).toBeDefined();
      });

      // Verify that required validation is performed
      expect(managementHook.result.current.webhook?.id).toBe('malformed-webhook');
    });
  });

  describe('Security and Access Control', () => {
    it('should enforce organization-scoped access', async () => {
      // Try to access webhook from different organization
      const crossOrgWebhook = {
        ...mockWebhook,
        organization_id: 'different-org',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: crossOrgWebhook,
        error: null,
      });

      await expect(elementService.getWebhook('webhook-1'))
        .rejects.toThrow('Attempted to access data from different organization');
    });

    it('should validate webhook configuration security', async () => {
      const insecureConfig = {
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: 'test-element',
        endpointUrl: 'http://insecure-endpoint.com/webhook', // HTTP instead of HTTPS
        httpMethod: 'POST' as const,
      };

      const validation = await elementService.validateWebhookConfig(insecureConfig);

      expect(validation.valid).toBe(true); // Should be valid but with warnings
      expect(validation.warnings.some(w => w.code === 'INSECURE_PROTOCOL')).toBe(true);
    });

    it('should handle authentication and authorization properly', async () => {
      // Mock unauthorized access
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized access', code: 'PGRST301' },
      });

      await expect(elementService.getWebhook('restricted-webhook'))
        .rejects.toThrow('Unauthorized access');
    });
  });
});