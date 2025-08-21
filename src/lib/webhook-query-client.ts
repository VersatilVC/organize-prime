/**
 * Optimized React Query configuration for webhook operations
 * Provides intelligent caching, offline support, and performance optimization
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { persistQueryClient } from '@tanstack/react-query-persist-client-core';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { compress, decompress } from 'lz-string';

// Enhanced error handling for webhook operations
function handleQueryError(error: Error, query: any) {
  const context = {
    queryKey: query.queryKey,
    variables: query.state.data,
    errorCode: (error as any)?.statusCode || 'UNKNOWN',
  };

  console.error('Query failed:', context, error);

  // Don't show toast for background refetches or certain error types
  const isBackgroundRefetch = query.state.fetchStatus === 'idle';
  const is404 = (error as any)?.statusCode === 404;
  const isRateLimit = (error as any)?.code === 'RATE_LIMIT_EXCEEDED';

  if (!isBackgroundRefetch && !is404) {
    if (isRateLimit) {
      toast.warning('Rate limit exceeded', {
        description: 'Please slow down your requests',
      });
    } else {
      toast.error('Request failed', {
        description: error.message,
      });
    }
  }
}

// Enhanced success handling for mutations
function handleMutationSuccess(data: any, variables: any, context: any, mutation: any) {
  // Auto-show success toasts are handled in individual hooks
  // This is for global success tracking
  console.log('Mutation succeeded:', {
    mutationKey: mutation.options.mutationKey,
    variables,
    data,
  });
}

// Enhanced error handling for mutations
function handleMutationError(error: Error, variables: any, context: any, mutation: any) {
  console.error('Mutation failed:', {
    mutationKey: mutation.options.mutationKey,
    variables,
    error,
  });

  // Global mutation errors are handled in individual hooks
  // This is for global error tracking and recovery
}

// Create optimized query cache
const queryCache = new QueryCache({
  onError: handleQueryError,
});

// Create optimized mutation cache
const mutationCache = new MutationCache({
  onSuccess: handleMutationSuccess,
  onError: handleMutationError,
});

// Create main query client with webhook-optimized defaults
export const webhookQueryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      // Cache configuration
      staleTime: 5 * 60 * 1000, // 5 minutes default
      gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
      
      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry validation errors or auth errors
        const noRetryErrors = ['VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN'];
        if (noRetryErrors.some(code => error.message?.includes(code))) {
          return false;
        }
        
        // Don't retry 404s
        if ((error as any)?.statusCode === 404) {
          return false;
        }
        
        // Retry network errors up to 3 times
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Background refetch configuration
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: 'always',
      
      // Network mode
      networkMode: 'offlineFirst', // Continue with cached data when offline
    },
    mutations: {
      // Retry configuration for mutations
      retry: (failureCount, error) => {
        // Only retry network errors, not business logic errors
        const retryableErrors = ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_INTERNAL_ERROR'];
        if (!retryableErrors.some(code => error.message?.includes(code))) {
          return false;
        }
        
        return failureCount < 2; // Fewer retries for mutations
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      
      // Network mode
      networkMode: 'online', // Don't perform mutations when offline
    },
  },
});

// Create persister for offline support
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  serialize: (data) => compress(JSON.stringify(data)),
  deserialize: (data) => JSON.parse(decompress(data) || '{}'),
  key: 'webhook-query-cache',
});

// Initialize persistence
export function initializeWebhookQueryPersistence() {
  persistQueryClient({
    queryClient: webhookQueryClient,
    persister,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    hydrateOptions: {
      defaultOptions: {
        queries: {
          staleTime: 10 * 60 * 1000, // 10 minutes for hydrated queries
        },
      },
    },
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        // Only persist important queries
        const queryKey = query.queryKey[0] as string;
        
        // Persist webhook configurations
        if (queryKey === 'webhooks') return true;
        
        // Persist user settings and preferences
        if (queryKey === 'user-preferences') return true;
        
        // Don't persist real-time data or temporary data
        if (queryKey.includes('execution') || queryKey.includes('status')) return false;
        
        return false;
      },
    },
  });
}

// Query client utilities
export const webhookQueryUtils = {
  /**
   * Prefetch webhook data for better UX
   */
  prefetchWebhookData: async (webhookId: string) => {
    await Promise.allSettled([
      webhookQueryClient.prefetchQuery({
        queryKey: ['webhooks', 'detail', webhookId],
        staleTime: 10 * 60 * 1000,
      }),
      webhookQueryClient.prefetchQuery({
        queryKey: ['executions', 'history', webhookId],
        staleTime: 30 * 1000,
      }),
    ]);
  },

  /**
   * Prefetch feature webhook data
   */
  prefetchFeatureWebhooks: async (featureSlug: string) => {
    await webhookQueryClient.prefetchQuery({
      queryKey: ['webhooks', 'feature', featureSlug],
      staleTime: 5 * 60 * 1000,
    });
  },

  /**
   * Invalidate all webhook-related data
   */
  invalidateWebhookData: () => {
    webhookQueryClient.invalidateQueries({ queryKey: ['webhooks'] });
    webhookQueryClient.invalidateQueries({ queryKey: ['executions'] });
    webhookQueryClient.invalidateQueries({ queryKey: ['discovery'] });
  },

  /**
   * Clear all cached data (useful for logout)
   */
  clearAllCache: () => {
    webhookQueryClient.clear();
  },

  /**
   * Get cache statistics
   */
  getCacheStats: () => {
    const cache = webhookQueryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      loadingQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      cacheSize: JSON.stringify(cache).length,
    };
  },

  /**
   * Optimize cache by removing old entries
   */
  optimizeCache: () => {
    const cache = webhookQueryClient.getQueryCache();
    const queries = cache.getAll();
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours
    
    queries.forEach(query => {
      if (query.state.dataUpdatedAt && (now - query.state.dataUpdatedAt) > maxAge) {
        cache.remove(query);
      }
    });
    
    // Force garbage collection
    webhookQueryClient.getQueryCache().clear();
  },
};

// Real-time subscription management
export class WebhookSubscriptionManager {
  private subscriptions = new Map<string, () => void>();
  private supabaseClient: any;

  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
  }

  /**
   * Subscribe to webhook configuration changes
   */
  subscribeToWebhookChanges(organizationId: string) {
    const channel = this.supabaseClient
      .channel(`webhook_changes_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'element_webhooks',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: any) => {
          // Invalidate relevant queries
          webhookQueryClient.invalidateQueries({ queryKey: ['webhooks'] });
          
          // Show notification for changes
          if (payload.eventType === 'INSERT') {
            toast.info('New webhook created');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('Webhook updated');
          } else if (payload.eventType === 'DELETE') {
            toast.info('Webhook deleted');
          }
        }
      )
      .subscribe();

    const unsubscribe = () => {
      this.supabaseClient.removeChannel(channel);
    };

    this.subscriptions.set(`webhook_changes_${organizationId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to execution events
   */
  subscribeToExecutionEvents(organizationId: string) {
    const channel = this.supabaseClient
      .channel(`execution_events_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'element_webhook_logs',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: any) => {
          // Invalidate execution-related queries
          webhookQueryClient.invalidateQueries({ queryKey: ['executions'] });
          
          // Update specific execution if we have the ID
          if (payload.new?.id) {
            webhookQueryClient.setQueryData(
              ['executions', 'status', payload.new.id],
              payload.new.status
            );
          }
        }
      )
      .subscribe();

    const unsubscribe = () => {
      this.supabaseClient.removeChannel(channel);
    };

    this.subscriptions.set(`execution_events_${organizationId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
  }

  /**
   * Unsubscribe from specific subscription
   */
  unsubscribe(key: string) {
    const unsubscribe = this.subscriptions.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(key);
    }
  }
}

// Performance monitoring
export class WebhookPerformanceMonitor {
  private metrics = {
    queryCount: 0,
    mutationCount: 0,
    errorCount: 0,
    averageQueryTime: 0,
    slowQueries: [] as any[],
  };

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Monitor query performance
    webhookQueryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'queryAdded') {
        this.metrics.queryCount++;
      } else if (event.type === 'queryUpdated') {
        const query = event.query;
        
        if (query.state.status === 'error') {
          this.metrics.errorCount++;
        }
        
        // Track slow queries
        if (query.state.fetchStatus === 'idle' && query.state.dataUpdatedAt) {
          const fetchTime = Date.now() - query.state.dataUpdatedAt;
          if (fetchTime > 5000) { // Queries taking more than 5 seconds
            this.metrics.slowQueries.push({
              queryKey: query.queryKey,
              fetchTime,
              timestamp: new Date().toISOString(),
            });
            
            // Keep only last 50 slow queries
            if (this.metrics.slowQueries.length > 50) {
              this.metrics.slowQueries = this.metrics.slowQueries.slice(-50);
            }
          }
        }
      }
    });

    // Monitor mutation performance
    webhookQueryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'mutationAdded') {
        this.metrics.mutationCount++;
      }
    });
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getSlowQueries() {
    return [...this.metrics.slowQueries];
  }

  reset() {
    this.metrics = {
      queryCount: 0,
      mutationCount: 0,
      errorCount: 0,
      averageQueryTime: 0,
      slowQueries: [],
    };
  }
}

// Initialize performance monitoring
export const webhookPerformanceMonitor = new WebhookPerformanceMonitor();

// Cache warming utilities
export const webhookCacheWarmer = {
  /**
   * Warm up cache with essential data on app load
   */
  warmEssentialCache: async (organizationId: string) => {
    const queries = [
      // Warm up active webhooks
      webhookQueryClient.prefetchQuery({
        queryKey: ['webhooks', 'list', { isActive: true }],
        staleTime: 10 * 60 * 1000,
      }),
      
      // Warm up user preferences
      webhookQueryClient.prefetchQuery({
        queryKey: ['user-preferences'],
        staleTime: 30 * 60 * 1000,
      }),
      
      // Warm up system health
      webhookQueryClient.prefetchQuery({
        queryKey: ['executions', 'system-health'],
        staleTime: 60 * 1000,
      }),
    ];

    await Promise.allSettled(queries);
  },

  /**
   * Warm up cache for specific feature
   */
  warmFeatureCache: async (featureSlug: string) => {
    await Promise.allSettled([
      webhookQueryClient.prefetchQuery({
        queryKey: ['webhooks', 'feature', featureSlug],
        staleTime: 5 * 60 * 1000,
      }),
      webhookQueryClient.prefetchQuery({
        queryKey: ['discovery', 'registry', featureSlug],
        staleTime: 10 * 60 * 1000,
      }),
    ]);
  },

  /**
   * Warm up cache for webhook management page
   */
  warmManagementCache: async () => {
    await Promise.allSettled([
      webhookQueryClient.prefetchQuery({
        queryKey: ['webhooks', 'list', {}],
        staleTime: 2 * 60 * 1000,
      }),
      webhookQueryClient.prefetchQuery({
        queryKey: ['executions', 'failed'],
        staleTime: 60 * 1000,
      }),
      webhookQueryClient.prefetchQuery({
        queryKey: ['executions', 'alerts'],
        staleTime: 30 * 1000,
      }),
    ]);
  },
};