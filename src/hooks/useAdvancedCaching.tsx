import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { QueryInvalidationManager, advancedCacheConfig, queryKeys } from '@/lib/advanced-query-client';
import { useAuth } from '@/lib/auth-migration';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useMemoryLeakPrevention } from './useAdvancedPerformance';

interface BackgroundSyncOptions {
  interval?: number; // Sync interval in milliseconds
  priority?: 'high' | 'normal' | 'low';
  retryOnFailure?: boolean;
  maxRetries?: number;
}

// Background data synchronization hook
export function useBackgroundSync(options: BackgroundSyncOptions = {}) {
  const {
    interval = 5 * 60 * 1000, // 5 minutes default
    priority = 'normal',
    retryOnFailure = true,
    maxRetries = 3
  } = options;

  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const { managedSetInterval, cleanup } = useMemoryLeakPrevention();
  
  const invalidationManager = useRef(new QueryInvalidationManager(queryClient));
  const syncInProgress = useRef(false);
  const retryCount = useRef(0);

  const performBackgroundSync = useCallback(async () => {
    if (!user || !currentOrganization || syncInProgress.current) {
      return;
    }

    syncInProgress.current = true;

    try {
      // Background refresh critical data
      await invalidationManager.current.backgroundRefresh(currentOrganization.id, user.id);
      
      // Cleanup stale data
      await invalidationManager.current.cleanupStaleData();
      
      retryCount.current = 0; // Reset retry count on success
    } catch (error) {
      console.warn('Background sync failed:', error);
      
      if (retryOnFailure && retryCount.current < maxRetries) {
        retryCount.current++;
        // Retry with exponential backoff
        setTimeout(() => {
          syncInProgress.current = false;
          performBackgroundSync();
        }, Math.min(1000 * Math.pow(2, retryCount.current), 30000));
      }
    } finally {
      syncInProgress.current = false;
    }
  }, [user, currentOrganization, retryOnFailure, maxRetries]);

  useEffect(() => {
    if (!user || !currentOrganization) return;

    // Adjust interval based on priority
    let adjustedInterval = interval;
    if (priority === 'high') {
      adjustedInterval = Math.max(interval / 2, 60000); // Minimum 1 minute
    } else if (priority === 'low') {
      adjustedInterval = interval * 2;
    }

    const syncInterval = managedSetInterval(performBackgroundSync, adjustedInterval);

    // Perform initial sync
    performBackgroundSync();

    return () => {
      clearInterval(syncInterval);
      cleanup();
    };
  }, [user, currentOrganization, performBackgroundSync, interval, priority, managedSetInterval, cleanup]);

  return { performBackgroundSync };
}

// Smart cache invalidation hook
export function useSmartCacheInvalidation() {
  const queryClient = useQueryClient();
  const invalidationManager = useRef(new QueryInvalidationManager(queryClient));

  const invalidateSmartly = useCallback(async (mutationType: string, data: any) => {
    await invalidationManager.current.invalidateByMutationType(mutationType, data);
  }, []);

  return { invalidateSmartly };
}

// Stale-while-revalidate pattern hook
export function useStaleWhileRevalidate<T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  options: {
    staleTime?: number;
    revalidateInBackground?: boolean;
    cacheType?: keyof typeof advancedCacheConfig;
  } = {}
) {
  const {
    staleTime = 5 * 60 * 1000, // 5 minutes
    revalidateInBackground = true,
    cacheType = 'semiStatic'
  } = options;

  const queryClient = useQueryClient();
  const backgroundRefreshRef = useRef<NodeJS.Timeout>();

  const { data, isLoading, error, isStale } = useQuery({
    queryKey,
    queryFn,
    ...advancedCacheConfig[cacheType],
    staleTime,
  });

  // Background revalidation when data becomes stale
  useEffect(() => {
    if (isStale && revalidateInBackground) {
      // Clear previous background refresh
      if (backgroundRefreshRef.current) {
        clearTimeout(backgroundRefreshRef.current);
      }

      // Schedule background refresh
      backgroundRefreshRef.current = setTimeout(() => {
        queryClient.refetchQueries({
          queryKey,
          type: 'active',
          stale: true
        });
      }, 1000); // 1 second delay to avoid immediate refetch
    }

    return () => {
      if (backgroundRefreshRef.current) {
        clearTimeout(backgroundRefreshRef.current);
      }
    };
  }, [isStale, revalidateInBackground, queryClient, queryKey]);

  return {
    data,
    isLoading,
    error,
    isStale,
    isFresh: !isStale
  };
}

// Optimistic updates hook with rollback
export function useOptimisticUpdates<T>() {
  const queryClient = useQueryClient();
  const rollbackData = useRef<Map<string, any>>(new Map());

  const applyOptimisticUpdate = useCallback(async (
    queryKey: any[],
    updater: (oldData: T | undefined) => T,
    rollbackKey?: string
  ) => {
    const key = rollbackKey || JSON.stringify(queryKey);
    
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey });

    // Snapshot previous value
    const previousData = queryClient.getQueryData<T>(queryKey);
    rollbackData.current.set(key, previousData);

    // Optimistically update
    queryClient.setQueryData<T>(queryKey, updater);

    return {
      rollback: () => {
        const previous = rollbackData.current.get(key);
        if (previous !== undefined) {
          queryClient.setQueryData<T>(queryKey, previous);
          rollbackData.current.delete(key);
        }
      },
      confirm: () => {
        rollbackData.current.delete(key);
      }
    };
  }, [queryClient]);

  return { applyOptimisticUpdate };
}

// Intelligent prefetching hook
export function useIntelligentPrefetching() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const prefetchQueue = useRef<Set<string>>(new Set());

  const prefetchRelatedData = useCallback(async (currentPath: string) => {
    if (!user || !currentOrganization) return;

    const prefetchKey = `${currentPath}-${user.id}-${currentOrganization.id}`;
    
    // Avoid duplicate prefetching
    if (prefetchQueue.current.has(prefetchKey)) return;
    prefetchQueue.current.add(prefetchKey);

    try {
      // Prefetch based on current route and user behavior
      const prefetchPromises: Promise<any>[] = [];

      if (currentPath.includes('/dashboard')) {
        // Prefetch likely next pages from dashboard
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: queryKeys.users.list({ organizationId: currentOrganization.id }),
            staleTime: advancedCacheConfig.semiStatic.staleTime,
          }),
          queryClient.prefetchQuery({
            queryKey: queryKeys.feedback.list({ organizationId: currentOrganization.id }),
            staleTime: advancedCacheConfig.dynamic.staleTime,
          })
        );
      } else if (currentPath.includes('/users')) {
        // Prefetch user details and organization settings
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: queryKeys.organizations.settings(currentOrganization.id),
            staleTime: advancedCacheConfig.semiStatic.staleTime,
          })
        );
      }

      await Promise.all(prefetchPromises);
    } catch (error) {
      console.warn('Prefetching failed:', error);
    } finally {
      // Remove from queue after a delay
      setTimeout(() => {
        prefetchQueue.current.delete(prefetchKey);
      }, 30000); // 30 seconds
    }
  }, [queryClient, user, currentOrganization]);

  return { prefetchRelatedData };
}

// Advanced error boundary for queries
export function useQueryErrorBoundary() {
  const queryClient = useQueryClient();
  const errorCount = useRef(0);
  const lastErrorTime = useRef(0);

  const handleQueryError = useCallback((error: any, queryKey: any[]) => {
    const now = Date.now();
    
    // Reset error count if last error was more than 5 minutes ago
    if (now - lastErrorTime.current > 5 * 60 * 1000) {
      errorCount.current = 0;
    }
    
    errorCount.current++;
    lastErrorTime.current = now;

    // If too many errors in short time, clear related cache
    if (errorCount.current >= 3) {
      console.warn('Multiple query errors detected, clearing related cache');
      queryClient.removeQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          const errorKey = queryKey[0];
          return key === errorKey;
        }
      });
      errorCount.current = 0;
    }
  }, [queryClient]);

  return { handleQueryError };
}