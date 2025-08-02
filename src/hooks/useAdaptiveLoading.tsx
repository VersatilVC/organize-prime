import { useState, useEffect, useCallback } from 'react';

// Network-aware loading strategy
export function useNetworkAwareLoading() {
  const [connectionType, setConnectionType] = useState<'slow' | 'fast' | 'unknown'>('unknown');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Detect connection speed
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const updateConnectionInfo = () => {
        const effectiveType = connection.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          setConnectionType('slow');
        } else {
          setConnectionType('fast');
        }
      };

      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);

      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
        connection.removeEventListener('change', updateConnectionInfo);
      };
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const shouldLazyLoad = useCallback((componentSize: 'small' | 'medium' | 'large') => {
    if (!isOnline) return false;
    
    if (connectionType === 'slow') {
      return componentSize === 'small';
    }
    
    return true;
  }, [isOnline, connectionType]);

  const getLoadingStrategy = useCallback(() => {
    if (!isOnline) return 'cache-only';
    if (connectionType === 'slow') return 'essential-only';
    return 'progressive';
  }, [isOnline, connectionType]);

  return {
    connectionType,
    isOnline,
    shouldLazyLoad,
    getLoadingStrategy,
  };
}

// Adaptive chunk loading based on device capabilities
export function useAdaptiveLoading() {
  const [deviceCapabilities, setDeviceCapabilities] = useState({
    memory: 0,
    cores: 0,
    deviceClass: 'unknown' as 'low' | 'medium' | 'high' | 'unknown'
  });

  useEffect(() => {
    // Detect device capabilities
    const memory = (navigator as any).deviceMemory || 0;
    const cores = navigator.hardwareConcurrency || 0;
    
    let deviceClass: 'low' | 'medium' | 'high' = 'medium';
    
    if (memory <= 2 || cores <= 2) {
      deviceClass = 'low';
    } else if (memory >= 8 || cores >= 8) {
      deviceClass = 'high';
    }

    setDeviceCapabilities({ memory, cores, deviceClass });
  }, []);

  const getChunkLoadingStrategy = useCallback(() => {
    switch (deviceCapabilities.deviceClass) {
      case 'low':
        return {
          maxConcurrentLoads: 2,
          preloadThreshold: 1,
          cacheStrategy: 'aggressive'
        };
      case 'high':
        return {
          maxConcurrentLoads: 6,
          preloadThreshold: 3,
          cacheStrategy: 'liberal'
        };
      default:
        return {
          maxConcurrentLoads: 4,
          preloadThreshold: 2,
          cacheStrategy: 'moderate'
        };
    }
  }, [deviceCapabilities.deviceClass]);

  return {
    deviceCapabilities,
    getChunkLoadingStrategy,
  };
}

// Priority-based loading queue
export class LoadingQueue {
  private static queue: Array<{
    id: string;
    priority: number;
    loader: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  private static isProcessing = false;
  private static maxConcurrent = 3;

  static add<T>(
    id: string,
    loader: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id,
        priority,
        loader,
        resolve,
        reject,
      });

      // Sort by priority (higher priority first)
      this.queue.sort((a, b) => b.priority - a.priority);

      this.processQueue();
    });
  }

  private static async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    const currentBatch = this.queue.splice(0, this.maxConcurrent);
    
    const promises = currentBatch.map(async (item) => {
      try {
        const result = await item.loader();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    });

    await Promise.allSettled(promises);

    this.isProcessing = false;

    // Process remaining items
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  static clear() {
    this.queue = [];
  }

  static setMaxConcurrent(max: number) {
    this.maxConcurrent = max;
  }
}

// Error boundary for lazy loading
export class LazyLoadingErrorBoundary extends Error {
  constructor(
    message: string,
    public componentName: string,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'LazyLoadingError';
  }
}

// Retry mechanism for failed loads
export function useRetryableLoading() {
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setLastError(null);
  }, []);

  const handleError = useCallback((error: Error) => {
    setLastError(error);
  }, []);

  const shouldRetry = useCallback((error: Error) => {
    if (retryCount >= 3) return false;
    
    // Don't retry for certain types of errors
    if (error.name === 'ChunkLoadError') return true;
    if (error.message.includes('Loading chunk')) return true;
    if (error.message.includes('Failed to fetch')) return true;
    
    return false;
  }, [retryCount]);

  return {
    retryCount,
    lastError,
    retry,
    handleError,
    shouldRetry,
  };
}