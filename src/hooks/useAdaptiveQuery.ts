import * as React from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useConnectionAwareQuery, useProgressiveEnhancement } from './useProgressiveEnhancement';

interface AdaptiveQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  priority?: 'high' | 'medium' | 'low';
  offlineStrategy?: 'cache-first' | 'network-first' | 'cache-only';
  adaptiveStaleTime?: boolean;
  adaptiveRetry?: boolean;
}

interface AdaptiveMutationOptions<T, V> extends Omit<UseMutationOptions<T, unknown, V>, 'mutationFn'> {
  priority?: 'high' | 'medium' | 'low';
  offlineQueue?: boolean;
  retryOnReconnect?: boolean;
}

/**
 * Adaptive query hook that adjusts behavior based on network conditions
 */
export function useAdaptiveQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: AdaptiveQueryOptions<T> = {}
) {
  const { getQueryConfig } = useConnectionAwareQuery();
  const { networkStatus, enableAdvancedFeatures } = useProgressiveEnhancement();
  
  const {
    priority = 'medium',
    offlineStrategy = 'cache-first',
    adaptiveStaleTime = true,
    adaptiveRetry = true,
    ...restOptions
  } = options;

  // Get adaptive configuration
  const adaptiveConfig = getQueryConfig(priority);

  // Determine offline behavior
  const getOfflineBehavior = () => {
    if (!networkStatus.online) {
      switch (offlineStrategy) {
        case 'cache-only':
          return { enabled: false, networkMode: 'offlineFirst' as const };
        case 'cache-first':
          return { networkMode: 'offlineFirst' as const };
        case 'network-first':
        default:
          return { networkMode: 'online' as const };
      }
    }
    return {};
  };

  // Adaptive stale time based on connection
  const getAdaptiveStaleTime = () => {
    if (!adaptiveStaleTime) return restOptions.staleTime;
    
    if (networkStatus.saveData) {
      return 60 * 60 * 1000; // 1 hour for data saver mode
    }
    if (networkStatus.effectiveType === 'slow-2g' || networkStatus.effectiveType === '2g') {
      return 30 * 60 * 1000; // 30 minutes for slow connections
    }
    return adaptiveConfig.staleTime;
  };

  // Adaptive retry configuration
  const getAdaptiveRetry = () => {
    if (!adaptiveRetry) return restOptions.retry;
    
    if (networkStatus.saveData) {
      return 0; // No retries in data saver mode
    }
    if (!networkStatus.online) {
      return false; // No retries when offline
    }
    return adaptiveConfig.retry;
  };

  const offlineBehavior = getOfflineBehavior();

  return useQuery({
    queryKey,
    queryFn,
    ...adaptiveConfig,
    ...offlineBehavior,
    staleTime: getAdaptiveStaleTime(),
    retry: getAdaptiveRetry(),
    ...restOptions,
  });
}

/**
 * Adaptive mutation hook with offline queueing support
 */
export function useAdaptiveMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>,
  options: AdaptiveMutationOptions<T, V> = {}
) {
  const { networkStatus } = useProgressiveEnhancement();
  const queryClient = useQueryClient();
  
  const {
    priority = 'medium',
    offlineQueue = true,
    retryOnReconnect = true,
    ...restOptions
  } = options;

  // Queue for offline mutations
  const offlineMutationQueue = React.useRef<Array<{
    variables: V;
    resolve: (value: T) => void;
    reject: (error: unknown) => void;
  }>>([]);

  // Process offline queue when connection is restored
  React.useEffect(() => {
    if (networkStatus.online && offlineMutationQueue.current.length > 0) {
      const queue = [...offlineMutationQueue.current];
      offlineMutationQueue.current = [];

      queue.forEach(async ({ variables, resolve, reject }) => {
        try {
          const result = await mutationFn(variables);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    }
  }, [networkStatus.online, mutationFn]);

  const wrappedMutationFn = React.useCallback(async (variables: V): Promise<T> => {
    // If offline and queueing is enabled, add to queue
    if (!networkStatus.online && offlineQueue) {
      return new Promise<T>((resolve, reject) => {
        offlineMutationQueue.current.push({ variables, resolve, reject });
      });
    }

    // Execute normally
    return mutationFn(variables);
  }, [networkStatus.online, offlineQueue, mutationFn]);

  return useMutation({
    mutationFn: wrappedMutationFn,
    retry: networkStatus.online ? (priority === 'high' ? 2 : 1) : 0,
    ...restOptions,
  });
}

/**
 * Hook for prefetching data based on network conditions
 */
export function useAdaptivePrefetch() {
  const { shouldPreload, networkStatus } = useProgressiveEnhancement();
  const queryClient = useQueryClient();

  const prefetchQuery = React.useCallback(<T>(
    queryKey: string[],
    queryFn: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'low'
  ) => {
    // Only prefetch if conditions are favorable
    if (!shouldPreload || !networkStatus.online) return;
    
    // Don't prefetch low priority items on slower connections
    if (priority === 'low' && (
      networkStatus.effectiveType === 'slow-2g' || 
      networkStatus.effectiveType === '2g' ||
      networkStatus.saveData
    )) {
      return;
    }

    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  }, [shouldPreload, networkStatus, queryClient]);

  const prefetchOnHover = React.useCallback(<T>(
    queryKey: string[],
    queryFn: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ) => {
    return {
      onMouseEnter: () => prefetchQuery(queryKey, queryFn, priority),
      onFocus: () => prefetchQuery(queryKey, queryFn, priority),
    };
  }, [prefetchQuery]);

  return { prefetchQuery, prefetchOnHover };
}

/**
 * Hook for intelligent background sync
 */
export function useBackgroundSync() {
  const { networkStatus } = useProgressiveEnhancement();
  const queryClient = useQueryClient();

  const scheduleBackgroundSync = React.useCallback((
    syncKey: string,
    syncFn: () => Promise<void>,
    options: {
      immediate?: boolean;
      interval?: number;
      onlyOnWifi?: boolean;
    } = {}
  ) => {
    const { immediate = false, interval = 30000, onlyOnWifi = false } = options;

    // Check if we should sync based on connection type
    const shouldSync = () => {
      if (!networkStatus.online) return false;
      if (onlyOnWifi && networkStatus.effectiveType !== '4g') return false;
      if (networkStatus.saveData) return false;
      return true;
    };

    if (immediate && shouldSync()) {
      syncFn().catch(console.error);
    }

    const intervalId = setInterval(() => {
      if (shouldSync()) {
        syncFn().catch(console.error);
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, [networkStatus]);

  return { scheduleBackgroundSync };
}

/**
 * Hook for adaptive data persistence
 */
export function useAdaptivePersistence() {
  const { deviceCapabilities } = useProgressiveEnhancement();

  const persistData = React.useCallback(async (
    key: string,
    data: unknown,
    options: {
      storage?: 'localStorage' | 'sessionStorage' | 'indexedDB';
      ttl?: number;
      compress?: boolean;
    } = {}
  ) => {
    const { storage = 'localStorage', ttl, compress = false } = options;

    // Determine best storage option based on device capabilities
    const getStorageMethod = () => {
      if (storage === 'indexedDB' && 'indexedDB' in window) {
        return 'indexedDB';
      }
      if (storage === 'sessionStorage' && 'sessionStorage' in window) {
        return 'sessionStorage';
      }
      if ('localStorage' in window) {
        return 'localStorage';
      }
      return null;
    };

    const storageMethod = getStorageMethod();
    if (!storageMethod) return false;

    try {
      const payload = {
        data,
        timestamp: Date.now(),
        ttl
      };

      let serializedData = JSON.stringify(payload);

      // Simple compression for large data on low-memory devices
      if (compress && deviceCapabilities.deviceMemory <= 2) {
        // In a real implementation, you might use a compression library
        // For now, just store the data as-is
      }

      if (storageMethod === 'indexedDB') {
        // IndexedDB implementation would go here
        // For now, fallback to localStorage
        localStorage.setItem(key, serializedData);
      } else {
        const storage = storageMethod === 'sessionStorage' ? sessionStorage : localStorage;
        storage.setItem(key, serializedData);
      }

      return true;
    } catch (error) {
      console.error('Failed to persist data:', error);
      return false;
    }
  }, [deviceCapabilities]);

  const retrieveData = React.useCallback(async <T>(
    key: string,
    defaultValue?: T
  ): Promise<T | undefined> => {
    try {
      let storedData: string | null = null;

      // Try localStorage first
      if ('localStorage' in window) {
        storedData = localStorage.getItem(key);
      }

      // Fallback to sessionStorage
      if (!storedData && 'sessionStorage' in window) {
        storedData = sessionStorage.getItem(key);
      }

      if (!storedData) return defaultValue;

      const payload = JSON.parse(storedData);
      
      // Check TTL
      if (payload.ttl && Date.now() - payload.timestamp > payload.ttl) {
        // Data expired, clean up
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        return defaultValue;
      }

      return payload.data as T;
    } catch (error) {
      console.error('Failed to retrieve data:', error);
      return defaultValue;
    }
  }, []);

  return { persistData, retrieveData };
}

export { useProgressiveEnhancement, useAdaptiveLoading };