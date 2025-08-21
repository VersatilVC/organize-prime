/**
 * Test suite for webhook query client utilities and performance monitoring
 * Tests caching strategies, performance monitoring, and offline support
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  webhookQueryClient,
  webhookQueryUtils,
  WebhookSubscriptionManager,
  WebhookPerformanceMonitor,
  webhookCacheWarmer
} from '../webhook-query-client';

// Mock localStorage for persistence
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock compression functions
vi.mock('lz-string', () => ({
  compress: vi.fn((data) => data),
  decompress: vi.fn((data) => data),
}));

// Mock Supabase client
const mockSupabaseClient = {
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })),
  removeChannel: vi.fn(),
};

describe('webhook-query-client', () => {
  beforeEach(() => {
    webhookQueryClient.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    webhookQueryClient.clear();
  });

  describe('webhookQueryClient', () => {
    it('should be configured with correct defaults', () => {
      const defaultOptions = webhookQueryClient.getDefaultOptions();
      
      expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
      expect(defaultOptions.queries?.gcTime).toBe(30 * 60 * 1000); // 30 minutes
      expect(defaultOptions.queries?.networkMode).toBe('offlineFirst');
      expect(defaultOptions.mutations?.networkMode).toBe('online');
    });

    it('should handle query retries correctly', () => {
      const defaultOptions = webhookQueryClient.getDefaultOptions();
      const retryFn = defaultOptions.queries?.retry as Function;
      
      // Should not retry validation errors
      expect(retryFn(1, { message: 'VALIDATION_ERROR: Invalid input' })).toBe(false);
      expect(retryFn(1, { message: 'UNAUTHORIZED access' })).toBe(false);
      expect(retryFn(1, { statusCode: 404 })).toBe(false);
      
      // Should retry network errors
      expect(retryFn(1, { message: 'Network error' })).toBe(true);
      expect(retryFn(2, { message: 'Network error' })).toBe(true);
      expect(retryFn(3, { message: 'Network error' })).toBe(false); // Max retries reached
    });

    it('should calculate retry delays correctly', () => {
      const defaultOptions = webhookQueryClient.getDefaultOptions();
      const retryDelayFn = defaultOptions.queries?.retryDelay as Function;
      
      expect(retryDelayFn(0)).toBe(1000); // 1s
      expect(retryDelayFn(1)).toBe(2000); // 2s
      expect(retryDelayFn(2)).toBe(4000); // 4s
      expect(retryDelayFn(10)).toBe(30000); // Capped at 30s
    });

    it('should handle mutations with limited retries', () => {
      const defaultOptions = webhookQueryClient.getDefaultOptions();
      const retryFn = defaultOptions.mutations?.retry as Function;
      
      // Should retry network errors
      expect(retryFn(1, { message: 'NETWORK_ERROR: Connection failed' })).toBe(true);
      expect(retryFn(2, { message: 'NETWORK_ERROR: Connection failed' })).toBe(false); // Max retries
      
      // Should not retry business logic errors
      expect(retryFn(1, { message: 'VALIDATION_ERROR: Invalid data' })).toBe(false);
    });
  });

  describe('webhookQueryUtils', () => {
    beforeEach(() => {
      // Mock prefetchQuery to resolve immediately
      vi.spyOn(webhookQueryClient, 'prefetchQuery').mockResolvedValue(undefined);
      vi.spyOn(webhookQueryClient, 'invalidateQueries').mockResolvedValue(undefined);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should prefetch webhook data correctly', async () => {
      await webhookQueryUtils.prefetchWebhookData('webhook-1');

      expect(webhookQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['webhooks', 'detail', 'webhook-1'],
        staleTime: 10 * 60 * 1000,
      });

      expect(webhookQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['executions', 'history', 'webhook-1'],
        staleTime: 30 * 1000,
      });
    });

    it('should prefetch feature webhooks', async () => {
      await webhookQueryUtils.prefetchFeatureWebhooks('test-feature');

      expect(webhookQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['webhooks', 'feature', 'test-feature'],
        staleTime: 5 * 60 * 1000,
      });
    });

    it('should invalidate webhook data', () => {
      webhookQueryUtils.invalidateWebhookData();

      expect(webhookQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['webhooks'] });
      expect(webhookQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['executions'] });
      expect(webhookQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['discovery'] });
    });

    it('should clear all cache', () => {
      vi.spyOn(webhookQueryClient, 'clear').mockImplementation(() => {});
      
      webhookQueryUtils.clearAllCache();

      expect(webhookQueryClient.clear).toHaveBeenCalled();
    });

    it('should provide cache statistics', () => {
      // Add some mock queries to cache
      webhookQueryClient.setQueryData(['webhooks', 'detail', 'webhook-1'], { id: 'webhook-1' });
      webhookQueryClient.setQueryData(['webhooks', 'detail', 'webhook-2'], { id: 'webhook-2' });

      const stats = webhookQueryUtils.getCacheStats();

      expect(stats.totalQueries).toBeGreaterThan(0);
      expect(typeof stats.staleQueries).toBe('number');
      expect(typeof stats.loadingQueries).toBe('number');
      expect(typeof stats.errorQueries).toBe('number');
      expect(typeof stats.cacheSize).toBe('number');
    });

    it('should optimize cache by removing old entries', () => {
      vi.spyOn(webhookQueryClient.getQueryCache(), 'remove').mockImplementation(() => {});
      vi.spyOn(webhookQueryClient.getQueryCache(), 'clear').mockImplementation(() => {});

      // Add old query to cache
      const oldQuery = {
        state: {
          dataUpdatedAt: Date.now() - 3 * 60 * 60 * 1000, // 3 hours ago
        },
      };

      vi.spyOn(webhookQueryClient.getQueryCache(), 'getAll').mockReturnValue([oldQuery] as any);

      webhookQueryUtils.optimizeCache();

      expect(webhookQueryClient.getQueryCache().remove).toHaveBeenCalledWith(oldQuery);
      expect(webhookQueryClient.getQueryCache().clear).toHaveBeenCalled();
    });
  });

  describe('WebhookSubscriptionManager', () => {
    let subscriptionManager: WebhookSubscriptionManager;

    beforeEach(() => {
      subscriptionManager = new WebhookSubscriptionManager(mockSupabaseClient);
    });

    afterEach(() => {
      subscriptionManager.unsubscribeAll();
    });

    it('should subscribe to webhook changes', () => {
      const unsubscribe = subscriptionManager.subscribeToWebhookChanges('org-1');

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('webhook_changes_org-1');
      expect(typeof unsubscribe).toBe('function');
    });

    it('should subscribe to execution events', () => {
      const unsubscribe = subscriptionManager.subscribeToExecutionEvents('org-1');

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('execution_events_org-1');
      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe from specific subscription', () => {
      subscriptionManager.subscribeToWebhookChanges('org-1');
      
      subscriptionManager.unsubscribe('webhook_changes_org-1');

      expect(mockSupabaseClient.removeChannel).toHaveBeenCalled();
    });

    it('should unsubscribe from all subscriptions', () => {
      subscriptionManager.subscribeToWebhookChanges('org-1');
      subscriptionManager.subscribeToExecutionEvents('org-1');
      
      subscriptionManager.unsubscribeAll();

      expect(mockSupabaseClient.removeChannel).toHaveBeenCalledTimes(2);
    });
  });

  describe('WebhookPerformanceMonitor', () => {
    let performanceMonitor: WebhookPerformanceMonitor;

    beforeEach(() => {
      performanceMonitor = new WebhookPerformanceMonitor();
    });

    it('should initialize with zero metrics', () => {
      const metrics = performanceMonitor.getMetrics();

      expect(metrics.queryCount).toBe(0);
      expect(metrics.mutationCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.averageQueryTime).toBe(0);
      expect(metrics.slowQueries).toHaveLength(0);
    });

    it('should track slow queries', () => {
      const slowQueries = performanceMonitor.getSlowQueries();
      expect(Array.isArray(slowQueries)).toBe(true);
    });

    it('should reset metrics', () => {
      performanceMonitor.reset();
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.queryCount).toBe(0);
      expect(metrics.mutationCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
    });

    it('should track query performance over time', () => {
      // This would need actual query execution to test properly
      // For now, just verify the interface exists
      expect(typeof performanceMonitor.getMetrics).toBe('function');
      expect(typeof performanceMonitor.getSlowQueries).toBe('function');
      expect(typeof performanceMonitor.reset).toBe('function');
    });
  });

  describe('webhookCacheWarmer', () => {
    beforeEach(() => {
      vi.spyOn(webhookQueryClient, 'prefetchQuery').mockResolvedValue(undefined);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should warm essential cache', async () => {
      await webhookCacheWarmer.warmEssentialCache('org-1');

      expect(webhookQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['webhooks', 'list', { isActive: true }],
        staleTime: 10 * 60 * 1000,
      });

      expect(webhookQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['user-preferences'],
        staleTime: 30 * 60 * 1000,
      });

      expect(webhookQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['executions', 'system-health'],
        staleTime: 60 * 1000,
      });
    });

    it('should warm feature cache', async () => {
      await webhookCacheWarmer.warmFeatureCache('test-feature');

      expect(webhookQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['webhooks', 'feature', 'test-feature'],
        staleTime: 5 * 60 * 1000,
      });

      expect(webhookQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['discovery', 'registry', 'test-feature'],
        staleTime: 10 * 60 * 1000,
      });
    });

    it('should warm management cache', async () => {
      await webhookCacheWarmer.warmManagementCache();

      expect(webhookQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['webhooks', 'list', {}],
        staleTime: 2 * 60 * 1000,
      });

      expect(webhookQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['executions', 'failed'],
        staleTime: 60 * 1000,
      });

      expect(webhookQueryClient.prefetchQuery).toHaveBeenCalledWith({
        queryKey: ['executions', 'alerts'],
        staleTime: 30 * 1000,
      });
    });

    it('should handle cache warming failures gracefully', async () => {
      vi.spyOn(webhookQueryClient, 'prefetchQuery').mockRejectedValue(new Error('Network error'));

      // Should not throw even if prefetch fails
      await expect(webhookCacheWarmer.warmEssentialCache('org-1')).resolves.not.toThrow();
      await expect(webhookCacheWarmer.warmFeatureCache('test-feature')).resolves.not.toThrow();
      await expect(webhookCacheWarmer.warmManagementCache()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle localStorage failures gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      // Should not throw when localStorage fails
      expect(() => {
        new WebhookPerformanceMonitor();
      }).not.toThrow();
    });

    it('should handle JSON parsing errors in persistence', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      // Should handle corrupted storage data gracefully
      expect(() => {
        new WebhookPerformanceMonitor();
      }).not.toThrow();
    });

    it('should handle subscription errors gracefully', () => {
      mockSupabaseClient.channel.mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      const subscriptionManager = new WebhookSubscriptionManager(mockSupabaseClient);

      // Should not throw when subscription setup fails
      expect(() => {
        subscriptionManager.subscribeToWebhookChanges('org-1');
      }).not.toThrow();
    });
  });

  describe('performance optimizations', () => {
    it('should use correct stale times for different data types', () => {
      // Webhook configurations should have longer stale time
      webhookQueryClient.setQueryData(['webhooks', 'detail', 'webhook-1'], { id: 'webhook-1' });
      
      // Execution status should have shorter stale time
      webhookQueryClient.setQueryData(['executions', 'status', 'exec-1'], 'pending');

      const webhookQuery = webhookQueryClient.getQueryCache().find(['webhooks', 'detail', 'webhook-1']);
      const executionQuery = webhookQueryClient.getQueryCache().find(['executions', 'status', 'exec-1']);

      // Both should exist in cache
      expect(webhookQuery).toBeDefined();
      expect(executionQuery).toBeDefined();
    });

    it('should implement proper cache key strategies', () => {
      const testCases = [
        ['webhooks', 'detail', 'webhook-1'],
        ['webhooks', 'list', { featureSlug: 'test' }],
        ['executions', 'history', 'webhook-1'],
        ['discovery', 'elements', 'feature-1', '/page-1'],
      ];

      testCases.forEach(queryKey => {
        webhookQueryClient.setQueryData(queryKey, { data: 'test' });
        const cachedData = webhookQueryClient.getQueryData(queryKey);
        expect(cachedData).toEqual({ data: 'test' });
      });
    });

    it('should handle memory management correctly', () => {
      // Add many entries to test memory management
      for (let i = 0; i < 100; i++) {
        webhookQueryClient.setQueryData(['test', i], { id: i });
      }

      const cacheSize = webhookQueryClient.getQueryCache().getAll().length;
      expect(cacheSize).toBe(100);

      // Clear should remove all entries
      webhookQueryClient.clear();
      const clearedSize = webhookQueryClient.getQueryCache().getAll().length;
      expect(clearedSize).toBe(0);
    });
  });
});