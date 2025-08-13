import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Memory leak prevention hook
export function useMemoryLeakPrevention() {
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());
  const intervalRefs = useRef<Set<NodeJS.Timeout>>(new Set());
  const eventListeners = useRef<Array<{ element: EventTarget; event: string; handler: EventListener }>>();
  const queryClient = useQueryClient();

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current.clear();

    // Clear all intervals
    intervalRefs.current.forEach(clearInterval);
    intervalRefs.current.clear();

    // Remove all event listeners
    eventListeners.current?.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    if (eventListeners.current) {
      eventListeners.current.length = 0;
    }
  }, []);

  // Wrapped setTimeout to track timeouts
  const managedSetTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      callback();
      timeoutRefs.current.delete(timeoutId);
    }, delay);
    timeoutRefs.current.add(timeoutId);
    return timeoutId;
  }, []);

  // Wrapped setInterval to track intervals
  const managedSetInterval = useCallback((callback: () => void, delay: number) => {
    const intervalId = setInterval(callback, delay);
    intervalRefs.current.add(intervalId);
    return intervalId;
  }, []);

  // Wrapped addEventListener to track listeners
  const managedAddEventListener = useCallback((
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ) => {
    element.addEventListener(event, handler, options);
    if (!eventListeners.current) {
      eventListeners.current = [];
    }
    eventListeners.current.push({ element, event, handler });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    managedSetTimeout,
    managedSetInterval,
    managedAddEventListener,
    cleanup,
  };
}

// Component render tracking for performance monitoring
export function useRenderTracking(componentName: string) {
  const renderCount = useRef(0);
  const lastRender = useRef(Date.now());
  const slowRenders = useRef(0);

  useEffect(() => {
    renderCount.current++;
    const now = Date.now();
    const renderTime = now - lastRender.current;
    
    // Track slow renders (>16ms = 60fps threshold)
    if (renderTime > 16 && renderCount.current > 1) {
      slowRenders.current++;
      
      // Log slow renders in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Slow render detected in ${componentName}: ${renderTime}ms`);
      }
      
      // Report to analytics in production
      if (process.env.NODE_ENV === 'production' && slowRenders.current % 10 === 0) {
        // Could integrate with analytics service here
        console.warn(`Component ${componentName} has ${slowRenders.current} slow renders`);
      }
    }
    
    lastRender.current = now;
  });

  return {
    renderCount: renderCount.current,
    slowRenders: slowRenders.current,
  };
}

// Query cache monitoring and cleanup
export function useQueryCacheMonitoring() {
  const queryClient = useQueryClient();
  const { managedSetInterval, cleanup } = useMemoryLeakPrevention();

  useEffect(() => {
    // Monitor cache size every 5 minutes
    const monitorInterval = managedSetInterval(() => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      const cacheSize = queries.length;
      
      // Log cache stats in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Query cache stats: ${cacheSize} queries`);
      }
      
      // Cleanup if cache is getting too large
      if (cacheSize > 100) {
        const staleCutoff = Date.now() - (30 * 60 * 1000); // 30 minutes
        const staleQueries = queries.filter(query => 
          query.state.dataUpdatedAt < staleCutoff && 
          query.getObserversCount() === 0
        );
        
        staleQueries.forEach(query => {
          queryClient.removeQueries({ queryKey: query.queryKey });
        });
        
        console.log(`Cleaned up ${staleQueries.length} stale queries`);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      cleanup();
    };
  }, [queryClient, managedSetInterval, cleanup]);
}

// Background sync hook for offline/online scenarios
export function useBackgroundSync(orgId?: string, userId?: string) {
  const queryClient = useQueryClient();
  const { managedAddEventListener, managedSetInterval } = useMemoryLeakPrevention();
  const syncQueue = useRef<Array<{ type: string; data: any; timestamp: number }>>([]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored, syncing data...');
      
      // Refetch critical queries
      if (orgId && userId) {
        queryClient.refetchQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0] as string;
            return ['dashboard', 'notifications', 'organizations'].includes(key);
          }
        });
      }
      
      // Process sync queue
      syncQueue.current.forEach(item => {
        // Could implement offline actions sync here
        console.log('Processing queued action:', item);
      });
      syncQueue.current = [];
    };

    const handleOffline = () => {
      console.log('Connection lost, enabling offline mode...');
    };

    managedAddEventListener(window, 'online', handleOnline);
    managedAddEventListener(window, 'offline', handleOffline);

    // Background sync interval (when online)
    const syncInterval = managedSetInterval(() => {
      if (navigator.onLine && orgId && userId) {
        // Silently refresh critical data in background
        queryClient.refetchQueries({ 
          queryKey: ['dashboard', 'batch', orgId, userId],
          type: 'active',
          stale: true 
        });
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      clearInterval(syncInterval);
    };
  }, [queryClient, orgId, userId, managedAddEventListener, managedSetInterval]);

  // Add action to sync queue (for offline scenarios)
  const queueAction = useCallback((type: string, data: any) => {
    syncQueue.current.push({
      type,
      data,
      timestamp: Date.now()
    });
  }, []);

  return { queueAction };
}

// Error recovery hook with exponential backoff
export function useErrorRecovery() {
  const retryAttempts = useRef<Map<string, number>>(new Map());
  const { managedSetTimeout } = useMemoryLeakPrevention();

  const retryWithBackoff = useCallback((
    key: string,
    operation: () => Promise<any>,
    maxRetries: number = 3
  ) => {
    const currentAttempts = retryAttempts.current.get(key) || 0;
    
    if (currentAttempts >= maxRetries) {
      console.error(`Max retries reached for ${key}`);
      retryAttempts.current.delete(key);
      return Promise.reject(new Error(`Max retries reached for ${key}`));
    }

    const delay = Math.min(1000 * Math.pow(2, currentAttempts), 10000); // Cap at 10 seconds
    
    return new Promise((resolve, reject) => {
      managedSetTimeout(async () => {
        try {
          const result = await operation();
          retryAttempts.current.delete(key); // Reset on success
          resolve(result);
        } catch (error) {
          retryAttempts.current.set(key, currentAttempts + 1);
          reject(error);
        }
      }, delay);
    });
  }, [managedSetTimeout]);

  return { retryWithBackoff };
}