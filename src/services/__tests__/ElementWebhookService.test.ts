/**
 * Comprehensive test suite for ElementWebhookService
 * Tests CRUD operations, validation, error handling, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ElementWebhookService } from '../ElementWebhookService';
import { ServiceConfig } from '../base/BaseWebhookService';
import {
  CreateElementWebhookRequest,
  UpdateElementWebhookRequest,
  ElementWebhook,
  WebhookSearchFilters
} from '../../types/webhook';

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
  in: vi.fn(() => mockSupabaseClient),
};

// Mock createClient
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('ElementWebhookService', () => {
  let service: ElementWebhookService;
  let config: ServiceConfig;

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
    config = {
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-key',
      organizationId: 'org-1',
      enableLogging: false,
      enableRateLimiting: false,
    };

    service = new ElementWebhookService(config);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.dispose();
  });

  describe('createWebhook', () => {
    const createRequest: CreateElementWebhookRequest = {
      featureSlug: 'test-feature',
      pagePath: '/test-page',
      elementId: 'test-element',
      endpointUrl: 'https://api.example.com/webhook',
      httpMethod: 'POST',
      payloadTemplate: { test: 'data' },
    };

    it('should create a webhook successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: 'webhook-1',
          organization_id: 'org-1',
          feature_slug: 'test-feature',
          page_path: '/test-page',
          element_id: 'test-element',
          endpoint_url: 'https://api.example.com/webhook',
          http_method: 'POST',
          payload_template: { test: 'data' },
          headers: {},
          timeout_seconds: 30,
          retry_count: 3,
          rate_limit_per_minute: 60,
          is_active: true,
          health_status: 'unknown',
          created_by: 'current-user-id',
          updated_by: 'current-user-id',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          total_executions: 0,
          successful_executions: 0,
          failed_executions: 0,
          average_response_time: 0,
        },
        error: null,
      });

      // Mock the check for existing webhooks
      mockSupabaseClient.eq.mockImplementation((field, value) => {
        if (field === 'feature_slug' && value === 'test-feature') {
          return {
            ...mockSupabaseClient,
            eq: vi.fn().mockReturnValue({
              ...mockSupabaseClient,
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return mockSupabaseClient;
      });

      const result = await service.createWebhook(createRequest);

      expect(result).toBeDefined();
      expect(result.featureSlug).toBe('test-feature');
      expect(result.endpointUrl).toBe('https://api.example.com/webhook');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should throw error for invalid URL', async () => {
      const invalidRequest = {
        ...createRequest,
        endpointUrl: 'invalid-url',
      };

      await expect(service.createWebhook(invalidRequest)).rejects.toThrow('must be a valid HTTP/HTTPS URL');
    });

    it('should throw error for invalid HTTP method', async () => {
      const invalidRequest = {
        ...createRequest,
        httpMethod: 'INVALID' as any,
      };

      await expect(service.createWebhook(invalidRequest)).rejects.toThrow('HTTP method must be one of');
    });

    it('should throw error for duplicate webhook', async () => {
      // Mock existing webhook found
      mockSupabaseClient.eq.mockImplementation(() => ({
        ...mockSupabaseClient,
        eq: vi.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: vi.fn().mockResolvedValue({ 
            data: [mockWebhook], 
            error: null 
          }),
        }),
      }));

      await expect(service.createWebhook(createRequest)).rejects.toThrow('Webhook already exists');
    });

    it('should enforce timeout limits', async () => {
      const requestWithLargeTimeout = {
        ...createRequest,
        timeoutSeconds: 500, // Exceeds max of 300
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: { ...mockWebhook, timeout_seconds: 300 },
        error: null,
      });

      mockSupabaseClient.eq.mockImplementation(() => ({
        ...mockSupabaseClient,
        eq: vi.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }));

      const result = await service.createWebhook(requestWithLargeTimeout);
      expect(result.timeoutSeconds).toBe(300); // Should be capped
    });
  });

  describe('updateWebhook', () => {
    const updateRequest: UpdateElementWebhookRequest = {
      endpointUrl: 'https://api.example.com/webhook-v2',
      isActive: false,
    };

    it('should update webhook successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...mockWebhook,
          endpoint_url: 'https://api.example.com/webhook-v2',
          is_active: false,
        },
        error: null,
      });

      const result = await service.updateWebhook('webhook-1', updateRequest);

      expect(result).toBeDefined();
      expect(result.endpointUrl).toBe('https://api.example.com/webhook-v2');
      expect(result.isActive).toBe(false);
      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });

    it('should throw error for non-existent webhook', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(service.updateWebhook('non-existent', updateRequest))
        .rejects.toThrow('Webhook not found or access denied');
    });

    it('should validate updated URL', async () => {
      const invalidUpdate = {
        endpointUrl: 'invalid-url',
      };

      await expect(service.updateWebhook('webhook-1', invalidUpdate))
        .rejects.toThrow('must be a valid HTTP/HTTPS URL');
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook successfully', async () => {
      mockSupabaseClient.delete.mockResolvedValue({
        error: null,
      });

      const result = await service.deleteWebhook('webhook-1');

      expect(result).toBe(true);
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'webhook-1');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    });

    it('should handle delete error', async () => {
      mockSupabaseClient.delete.mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      const result = await service.deleteWebhook('webhook-1');

      expect(result).toBe(false);
    });
  });

  describe('getWebhook', () => {
    it('should retrieve webhook successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockWebhook,
        error: null,
      });

      const result = await service.getWebhook('webhook-1');

      expect(result).toEqual(mockWebhook);
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'webhook-1');
    });

    it('should return null for non-existent webhook', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.getWebhook('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getWebhooksForElement', () => {
    it('should retrieve webhooks for element', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [mockWebhook],
        error: null,
      });

      const result = await service.getWebhooksForElement('test-feature', '/test-page', 'test-element');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockWebhook);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('feature_slug', 'test-feature');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('page_path', '/test-page');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('element_id', 'test-element');
    });

    it('should validate required parameters', async () => {
      await expect(service.getWebhooksForElement('', '/test-page', 'test-element'))
        .rejects.toThrow('feature slug is required');

      await expect(service.getWebhooksForElement('test-feature', '', 'test-element'))
        .rejects.toThrow('page path is required');

      await expect(service.getWebhooksForElement('test-feature', '/test-page', ''))
        .rejects.toThrow('element ID is required');
    });
  });

  describe('searchWebhooks', () => {
    const mockPaginatedResult = {
      data: [mockWebhook],
      count: 1,
    };

    it('should search webhooks with filters', async () => {
      mockSupabaseClient.range.mockResolvedValue({
        ...mockPaginatedResult,
        error: null,
      });

      const filters: WebhookSearchFilters = {
        featureSlug: 'test-feature',
        isActive: true,
      };

      const result = await service.searchWebhooks(filters, { page: 1, limit: 10 });

      expect(result.webhooks).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.currentPage).toBe(1);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('feature_slug', 'test-feature');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should handle pagination correctly', async () => {
      mockSupabaseClient.range.mockResolvedValue({
        data: [mockWebhook],
        count: 25,
        error: null,
      });

      const result = await service.searchWebhooks({}, { page: 2, limit: 10 });

      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(true);
      expect(mockSupabaseClient.range).toHaveBeenCalledWith(10, 19); // page 2 with limit 10
    });
  });

  describe('bulkCreateWebhooks', () => {
    const bulkRequests: CreateElementWebhookRequest[] = [
      {
        featureSlug: 'feature-1',
        pagePath: '/page-1',
        elementId: 'element-1',
        endpointUrl: 'https://api.example.com/webhook1',
        httpMethod: 'POST',
      },
      {
        featureSlug: 'feature-2',
        pagePath: '/page-2',
        elementId: 'element-2',
        endpointUrl: 'https://api.example.com/webhook2',
        httpMethod: 'POST',
      },
    ];

    it('should create multiple webhooks successfully', async () => {
      // Mock individual createWebhook calls
      const originalCreate = service.createWebhook;
      service.createWebhook = vi.fn().mockImplementation((request) => 
        Promise.resolve({ ...mockWebhook, ...request, id: `webhook-${request.elementId}` })
      );

      const result = await service.bulkCreateWebhooks(bulkRequests);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(service.createWebhook).toHaveBeenCalledTimes(2);

      // Restore original method
      service.createWebhook = originalCreate;
    });

    it('should handle partial failures', async () => {
      const originalCreate = service.createWebhook;
      service.createWebhook = vi.fn()
        .mockResolvedValueOnce({ ...mockWebhook, id: 'webhook-1' })
        .mockRejectedValueOnce(new Error('Creation failed'));

      const result = await service.bulkCreateWebhooks(bulkRequests);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Creation failed');

      service.createWebhook = originalCreate;
    });

    it('should reject too many requests', async () => {
      const tooManyRequests = Array(101).fill(bulkRequests[0]);

      await expect(service.bulkCreateWebhooks(tooManyRequests))
        .rejects.toThrow('Cannot create more than 100 webhooks at once');
    });
  });

  describe('validateWebhookConfig', () => {
    it('should validate complete valid config', async () => {
      const config: CreateElementWebhookRequest = {
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: 'test-element',
        endpointUrl: 'https://api.example.com/webhook',
        httpMethod: 'POST',
        timeoutSeconds: 30,
        retryCount: 3,
      };

      const result = await service.validateWebhookConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', async () => {
      const incompleteConfig = {
        featureSlug: 'test-feature',
        // Missing other required fields
      };

      const result = await service.validateWebhookConfig(incompleteConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'pagePath')).toBe(true);
    });

    it('should detect invalid URL', async () => {
      const invalidConfig = {
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: 'test-element',
        endpointUrl: 'invalid-url',
        httpMethod: 'POST' as const,
      };

      const result = await service.validateWebhookConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'endpointUrl')).toBe(true);
    });

    it('should provide warnings for non-HTTPS URLs', async () => {
      const httpConfig = {
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: 'test-element',
        endpointUrl: 'http://api.example.com/webhook',
        httpMethod: 'POST' as const,
      };

      const result = await service.validateWebhookConfig(httpConfig);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'INSECURE_PROTOCOL')).toBe(true);
    });

    it('should warn about high timeout values', async () => {
      const highTimeoutConfig = {
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: 'test-element',
        endpointUrl: 'https://api.example.com/webhook',
        httpMethod: 'POST' as const,
        timeoutSeconds: 120,
      };

      const result = await service.validateWebhookConfig(highTimeoutConfig);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'LONG_TIMEOUT')).toBe(true);
    });
  });

  describe('testWebhookConnectivity', () => {
    beforeEach(() => {
      // Mock fetch for connectivity testing
      global.fetch = vi.fn();
    });

    it('should test successful connectivity', async () => {
      // Mock getWebhook
      const originalGet = service.getWebhook;
      service.getWebhook = vi.fn().mockResolvedValue(mockWebhook);

      // Mock successful fetch
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      const result = await service.testWebhookConnectivity('webhook-1');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.endpointReachable).toBe(true);
      expect(result.recommendations).toContain('Use HTTPS for secure webhook communication');

      service.getWebhook = originalGet;
    });

    it('should handle connection failures', async () => {
      const originalGet = service.getWebhook;
      service.getWebhook = vi.fn().mockResolvedValue(mockWebhook);

      (global.fetch as Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.testWebhookConnectivity('webhook-1');

      expect(result.success).toBe(false);
      expect(result.endpointReachable).toBe(false);
      expect(result.error).toContain('Connection failed');

      service.getWebhook = originalGet;
    });

    it('should handle non-existent webhook', async () => {
      const originalGet = service.getWebhook;
      service.getWebhook = vi.fn().mockResolvedValue(null);

      await expect(service.testWebhookConnectivity('non-existent'))
        .rejects.toThrow('Webhook not found');

      service.getWebhook = originalGet;
    });

    it('should test HTTPS endpoints for SSL validity', async () => {
      const httpsWebhook = {
        ...mockWebhook,
        endpointUrl: 'https://api.example.com/webhook',
      };

      const originalGet = service.getWebhook;
      service.getWebhook = vi.fn().mockResolvedValue(httpsWebhook);

      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      const result = await service.testWebhookConnectivity('webhook-1');

      expect(result.sslValid).toBe(true);

      service.getWebhook = originalGet;
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(service.getWebhook('webhook-1'))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle rate limiting', async () => {
      const rateLimitedConfig = {
        ...config,
        enableRateLimiting: true,
        rateLimitConfig: {
          maxRequests: 1,
          windowMs: 1000,
        },
      };

      const rateLimitedService = new ElementWebhookService(rateLimitedConfig);

      // First request should succeed
      mockSupabaseClient.single.mockResolvedValue({
        data: mockWebhook,
        error: null,
      });

      await rateLimitedService.getWebhook('webhook-1');

      // Second immediate request should be rate limited
      await expect(rateLimitedService.getWebhook('webhook-2'))
        .rejects.toThrow('Rate limit exceeded');

      rateLimitedService.dispose();
    });

    it('should validate organization access', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...mockWebhook, organization_id: 'different-org' },
        error: null,
      });

      await expect(service.getWebhook('webhook-1'))
        .rejects.toThrow('Attempted to access data from different organization');
    });
  });

  describe('data transformation', () => {
    it('should convert snake_case to camelCase', async () => {
      const snakeCaseData = {
        id: 'webhook-1',
        organization_id: 'org-1',
        feature_slug: 'test-feature',
        page_path: '/test-page',
        element_id: 'test-element',
        endpoint_url: 'https://api.example.com/webhook',
        http_method: 'POST',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: snakeCaseData,
        error: null,
      });

      const result = await service.getWebhook('webhook-1');

      expect(result).toBeDefined();
      expect(result!.organizationId).toBe('org-1');
      expect(result!.featureSlug).toBe('test-feature');
      expect(result!.pagePath).toBe('/test-page');
      expect(result!.elementId).toBe('test-element');
      expect(result!.endpointUrl).toBe('https://api.example.com/webhook');
      expect(result!.httpMethod).toBe('POST');
      expect(result!.createdAt).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('caching and performance', () => {
    it('should handle concurrent requests', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockWebhook,
        error: null,
      });

      // Make multiple concurrent requests
      const promises = Array(5).fill(null).map(() => service.getWebhook('webhook-1'));
      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result).toEqual(mockWebhook);
      });
    });

    it('should handle memory cleanup on dispose', () => {
      // Service should clean up internal state
      expect(() => service.dispose()).not.toThrow();
    });
  });
});